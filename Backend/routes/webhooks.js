'use strict';

const { randomUUID } = require('crypto');
const {
  ALLOWED_EVENTS,
  verifyWebhookSignature,
  makePayload,
  storeEvent,
  deliverWebhook
} = require('../webhookService');

function registerRoutes(app, pool, fail) {
  app.post('/api/webhooks/application-events', async (req, res) => {
    try {
      if (!process.env.WEBHOOK_SECRET) {
        return fail(res, 503, 'Webhook signing is not configured.');
      }

      const rawBody = req.rawBody || JSON.stringify(req.body || {});
      const signature = req.headers['x-webhook-signature'] || '';
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
      deliverWebhook(pool, eventId, payload).catch((err) => {
        console.error('Webhook delivery error for', eventId, ':', err.message);
      });

      res.json({ success: true, data: { eventId, status: 'received' } });
    } catch (err) {
      console.error('Webhook handler error:', err.message);
      fail(res, 500, 'Webhook could not be processed.');
    }
  });
}

module.exports = { registerRoutes };
