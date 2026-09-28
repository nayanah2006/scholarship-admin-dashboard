'use strict';

const crypto = require('crypto');
const { randomUUID } = require('crypto');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_TIMEOUT_MS = 5000;

const ALLOWED_EVENTS = new Set([
  'APPLICATION_SUBMITTED',
  'APPLICATION_STATUS_CHANGED',
  'APPLICATION_VERIFIED',
  'APPLICATION_REJECTED',
  'DOCUMENT_UPLOADED'
]);

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET) return { valid: false, reason: 'WEBHOOK_SECRET not configured' };
  if (!signatureHeader) return { valid: false, reason: 'Missing x-webhook-signature header' };
  try {
    const [scheme, hex] = String(signatureHeader).split('=');
    if (scheme !== 'v1' || !hex || !/^[0-9a-f]+$/i.test(hex)) {
      return { valid: false, reason: 'Invalid signature format' };
    }
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(String(rawBody || ''), 'utf8').digest('hex');
    const left = Buffer.from(hex, 'hex');
    const right = Buffer.from(expected, 'hex');
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
      return { valid: false, reason: 'Signature mismatch' };
    }
    return { valid: true };
  } catch (_) {
    return { valid: false, reason: 'Signature verification error' };
  }
}

function signPayload(payload) {
  const body = JSON.stringify(payload);
  const hex = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body, 'utf8').digest('hex');
  return { body, signature: `v1=${hex}` };
}

function makePayload(eventType, applicationId, data) {
  const safeData = data && typeof data === 'object' ? { ...data } : {};
  delete safeData.password;
  delete safeData.password_hash;
  delete safeData.token;
  delete safeData.documentContent;
  delete safeData.fileBuffer;
  return {
    event: eventType,
    timestamp: new Date().toISOString(),
    applicationId: String(applicationId),
    data: safeData
  };
}

async function storeEvent(pool, eventId, eventType, payload) {
  const [r] = await pool.query(
    'INSERT INTO webhook_events (event_id, event_type, status, payload) VALUES (?, ?, ?, ?)',
    [eventId, eventType, 'pending', JSON.stringify(payload)]
  );
  return r.insertId;
}

async function recordDelivery(pool, eventId, status, errorMessage) {
  const safeMsg = errorMessage
    ? String(errorMessage).replace(/password|secret|token|Authorization/gi, '[REDACTED]').slice(0, 500)
    : null;
  await pool.query(
    'UPDATE webhook_events SET status=?, retries=retries+1, updated_at=NOW() WHERE event_id=?',
    [status, eventId]
  );
  if (safeMsg) {
    await pool.query(
      'UPDATE webhook_events SET payload=JSON_SET(COALESCE(payload, "{}"), "$.deliveryError", ?) WHERE event_id=?',
      [safeMsg, eventId]
    );
  }
}

async function deliverWebhook(pool, eventId, payload) {
  const receiverUrl = process.env.WEBHOOK_RECEIVER_URL || '';
  if (!WEBHOOK_SECRET) {
    await pool.query('UPDATE webhook_events SET status=?, updated_at=NOW() WHERE event_id=?', ['queued', eventId]);
    return { status: 'queued', reason: 'WEBHOOK_SECRET not configured' };
  }
  if (!receiverUrl) {
    await pool.query('UPDATE webhook_events SET status=?, updated_at=NOW() WHERE event_id=?', ['queued', eventId]);
    return { status: 'queued', reason: 'WEBHOOK_RECEIVER_URL not configured' };
  }

  const { body, signature } = signPayload(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(receiverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'User-Agent': 'ScholarshipPortal/1.0'
      },
      body,
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Receiver responded with ${response.status}`);
    await pool.query('UPDATE webhook_events SET status=?, updated_at=NOW() WHERE event_id=?', ['delivered', eventId]);
    return { status: 'delivered' };
  } catch (err) {
    const status = err.name === 'AbortError' ? 'timeout' : 'failed';
    await recordDelivery(pool, eventId, status, err.message);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function emitApplicationEvent(pool, eventType, applicationId, data = {}) {
  try {
    if (!ALLOWED_EVENTS.has(eventType) || applicationId == null) return null;
    const eventId = `evt_${randomUUID()}`;
    const payload = makePayload(eventType, applicationId, data);
    await storeEvent(pool, eventId, eventType, payload);
    setImmediate(() => {
      deliverWebhook(pool, eventId, payload).catch((err) => {
        console.error('Webhook delivery error for', eventId, ':', err.message);
      });
    });
    return eventId;
  } catch (err) {
    console.error('Webhook emit failed:', err.message);
    return null;
  }
}

module.exports = {
  ALLOWED_EVENTS,
  verifyWebhookSignature,
  makePayload,
  signPayload,
  storeEvent,
  recordDelivery,
  deliverWebhook,
  emitApplicationEvent
};
