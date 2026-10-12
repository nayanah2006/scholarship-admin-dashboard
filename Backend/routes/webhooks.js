'use strict';

const { randomUUID } = require('crypto');
const {
  ALLOWED_EVENTS,
  verifyWebhookSignature,
  makePayload,
  storeEvent,
  deliverWebhook,
  getWebhookStatus,
  retryEvent,
  scrub
} = require('../webhookService');

function receiverState() {
  const secret = process.env.WEBHOOK_SECRET || '';
  const receiverUrl = process.env.WEBHOOK_RECEIVER_URL || '';
  return {
    secretConfigured: Boolean(secret),
    receiverConfigured: Boolean(receiverUrl)
  };
}

function registerRoutes(app, pool, fail, requireAuth, role) {
  const adminOnly = [requireAuth, role('ADMIN')];

  // ------------------------------------------------------------------
  // Inbound: accept a signed application event (used by trusted senders
  // such as the state scholarship system or an internal job).
  // ------------------------------------------------------------------
  app.post('/api/webhooks/application-events', async (req, res) => {
    try {
      const state = receiverState();
      const rawBody = req.rawBody || JSON.stringify(req.body || {});
      const signature = req.headers['x-webhook-signature'] || '';

      if (!state.secretConfigured) {
        return fail(res, 503, 'Inbound webhooks are not configured.');
      }
      const sigOk = verifyWebhookSignature(rawBody, signature);
      if (!sigOk.valid) {
        console.warn('Webhook rejected:', sigOk.reason);
        return fail(res, 403, 'Invalid webhook signature.');
      }

      const { event, applicationId, data } = req.body || {};
      if (!event || !ALLOWED_EVENTS.has(event)) {
        return fail(res, 400, `Invalid or unsupported event type. Allowed: ${[...ALLOWED_EVENTS].join(', ')}.`);
      }
      if (applicationId === undefined || applicationId === null || String(applicationId).trim() === '') {
        return fail(res, 400, 'Missing or invalid applicationId.');
      }

      const eventId = String(req.body.eventId || `evt_${randomUUID().slice(0, 16)}`);
      const [[existing]] = await pool.query('SELECT id, status FROM webhook_events WHERE event_id=? LIMIT 1', [eventId]);
      if (existing) {
        return res.json({ success: true, data: { eventId, status: 'duplicate' } });
      }

      const payload = makePayload(event, applicationId, {
        previousStatus: data?.previousStatus || null,
        newStatus: data?.newStatus || null
      });

      await storeEvent(pool, eventId, event, payload);
      // Acknowledge only after the event is durably stored, then deliver.
      res.json({ success: true, data: { eventId, status: 'received' } });

      deliverWebhook(pool, eventId, payload).catch((err) => {
        console.error('Webhook delivery error for', eventId, ':', scrub(err.message));
      });
      return undefined;
    } catch (err) {
      console.error('Webhook handler error:', scrub(err.message));
      return fail(res, 500, 'Webhook could not be processed.');
    }
  });

  // ------------------------------------------------------------------
  // Admin: delivery health, recent events, configuration state.
  // ------------------------------------------------------------------
  app.get('/api/admin/webhooks', ...adminOnly, async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(Number(req.query.limit) || 25, 100));
      const [status, recent] = await Promise.all([
        getWebhookStatus(pool, limit),
        pool.query('SELECT event_id, event_type, status, retries, created_at FROM webhook_events ORDER BY id DESC LIMIT ?', [limit])
      ]);
      res.json({ success: true, data: { ...status, recent: recent[0] } });
    } catch (err) {
      console.error('Webhook status failed:', scrub(err.message));
      fail(res, 500, 'Webhook status is unavailable.');
    }
  });

  // Admin: re-deliver a stored event (after a receiver outage).
  app.post('/api/admin/webhooks/:eventId/retry', ...adminOnly, async (req, res) => {
    try {
      const eventId = String(req.params.eventId || '').trim().slice(0, 100);
      if (!eventId) return fail(res, 400, 'An eventId is required.');
      const outcome = await retryEvent(pool, eventId);
      if (!outcome.found) return fail(res, 404, 'Unknown webhook event.');
      res.json({ success: true, data: { eventId, previousStatus: outcome.previousStatus, ...outcome.result } });
    } catch (err) {
      console.error('Webhook retry failed:', scrub(err.message));
      fail(res, 500, 'Webhook retry failed.');
    }
  });

  // Admin: send a test event to the configured receiver, proving the pipe end to end.
  app.post('/api/admin/webhooks/test', ...adminOnly, async (req, res) => {
    try {
      const state = receiverState();
      if (!state.receiverConfigured) return fail(res, 400, 'WEBHOOK_RECEIVER_URL is not configured.');
      const applicationId = String(req.body?.applicationId || 'test').slice(0, 60);
      const eventId = `evt_test_${randomUUID().slice(0, 16)}`;
      const payload = makePayload('APPLICATION_STATUS_CHANGED', applicationId, {
        newStatus: 'TEST',
        test: true,
        triggeredBy: 'admin'
      });
      await storeEvent(pool, eventId, payload.event, payload);
      const result = await deliverWebhook(pool, eventId, payload, { attempts: 2 });
      res.json({ success: result.status === 'delivered', data: { eventId, ...result } });
    } catch (err) {
      console.error('Webhook test failed:', scrub(err.message));
      fail(res, 500, 'Webhook test delivery failed.');
    }
  });
}

module.exports = { registerRoutes, receiverState };
