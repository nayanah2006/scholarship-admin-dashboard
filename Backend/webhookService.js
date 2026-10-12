'use strict';

const crypto = require('crypto');
const { randomUUID } = require('crypto');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_TIMEOUT_MS = 5000;
const MAX_DELIVERY_ATTEMPTS = 3;
const DELIVERY_BACKOFF_MS = 500;

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

// Never let a secret or a credential reach the database or the logs.
function scrub(message) {
  return String(message || '')
    .replace(/\b(Bearer)\s+[A-Za-z0-9._-]+/gi, '$1 [REDACTED]')
    .replace(/\b(password|secret|token|authorization)\b["'\s:=]+[^\s"',}]+/gi, '$1=[REDACTED]')
    .replace(/([?&](?:key|api_?key|access_?token)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

async function storeEvent(pool, eventId, eventType, payload) {
  const [r] = await pool.query(
    'INSERT INTO webhook_events (event_id, event_type, status, payload) VALUES (?, ?, ?, ?)',
    [eventId, eventType, 'pending', JSON.stringify(payload)]
  );
  return r.insertId;
}

async function setStatus(pool, eventId, status, extra = {}) {
  const sets = ['status=?', 'updated_at=NOW()'];
  const params = [status];
  if (extra.incrementRetries) sets.push('retries=retries+1');
  if (extra.responseStatus != null) {
    sets.push('response_status=?');
    params.push(Number(extra.responseStatus));
  }
  if (extra.error !== undefined) {
    sets.push('last_error=?');
    params.push(extra.error ? scrub(extra.error) : null);
  }
  if (extra.deliveredAt) sets.push('delivered_at=NOW()');
  await pool.query(`UPDATE webhook_events SET ${sets.join(', ')} WHERE event_id=?`, [...params, eventId]);
}

async function recordDelivery(pool, eventId, status, errorMessage, responseStatus) {
  const safeMsg = scrub(errorMessage);
  await setStatus(pool, eventId, status, {
    incrementRetries: true,
    error: safeMsg || null,
    responseStatus,
    deliveredAt: status === 'delivered'
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function postOnce(receiverUrl, body, signature) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(receiverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-event': JSON.parse(body).event,
        'User-Agent': 'ScholarshipPortal/1.0'
      },
      body,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function deliverWebhook(pool, eventId, payload, options = {}) {
  const receiverUrl = process.env.WEBHOOK_RECEIVER_URL || '';
  if (!WEBHOOK_SECRET) {
    await setStatus(pool, eventId, 'queued', { error: 'WEBHOOK_SECRET not configured' });
    return { status: 'queued', reason: 'WEBHOOK_SECRET not configured' };
  }
  if (!receiverUrl) {
    await setStatus(pool, eventId, 'queued', { error: 'WEBHOOK_RECEIVER_URL not configured' });
    return { status: 'queued', reason: 'WEBHOOK_RECEIVER_URL not configured' };
  }

  const attempts = Math.max(1, Math.min(Number(options.attempts) || MAX_DELIVERY_ATTEMPTS, 5));
  const { body, signature } = signPayload(payload);
  let lastError = 'Delivery not attempted';
  let lastStatus = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await postOnce(receiverUrl, body, signature);
      if (!response.ok) {
        lastStatus = response.status;
        lastError = `Receiver responded with ${response.status}`;
        // A 4xx (other than 408/429) will not succeed on retry: fail fast.
        if (response.status >= 400 && response.status < 500 && ![408, 429].includes(response.status)) break;
      } else {
        await setStatus(pool, eventId, 'delivered', { responseStatus: response.status, error: null, deliveredAt: true });
        return { status: 'delivered', attempts: attempt, responseStatus: response.status };
      }
    } catch (err) {
      lastStatus = null;
      lastError = err.name === 'AbortError' ? `Timed out after ${WEBHOOK_TIMEOUT_MS}ms` : err.message;
    }

    if (attempt < attempts) await sleep(DELIVERY_BACKOFF_MS * attempt);
  }

  const finalStatus = lastStatus === null && /Timed out/i.test(lastError) ? 'timeout' : (lastStatus ? 'failed' : 'failed');
  await recordDelivery(pool, eventId, finalStatus, lastError, lastStatus);
  return { status: finalStatus, attempts, responseStatus: lastStatus, error: scrub(lastError) };
}

async function emitApplicationEvent(pool, eventType, applicationId, data = {}) {
  try {
    if (!ALLOWED_EVENTS.has(eventType) || applicationId == null) return null;
    const eventId = `evt_${randomUUID()}`;
    const payload = makePayload(eventType, applicationId, data);
    await storeEvent(pool, eventId, eventType, payload);
    setImmediate(() => {
      deliverWebhook(pool, eventId, payload).catch((err) => {
        console.error('Webhook delivery error for', eventId, ':', scrub(err.message));
      });
    });
    return eventId;
  } catch (err) {
    console.error('Webhook emit failed:', scrub(err.message));
    return null;
  }
}

// Operational view: last N deliveries, per-status counts, and the configuration
// state without ever echoing the secret itself.
async function getWebhookStatus(pool, limit = 25) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));
  const [[counts]] = await pool.query(
    `SELECT
       COUNT(*) total,
       SUM(status='pending') pending,
       SUM(status='queued') queued,
       SUM(status='delivered') delivered,
       SUM(status='failed') failed,
       SUM(status='timeout') timeout,
       MAX(updated_at) last_activity
     FROM webhook_events`
  );
  const [recent] = await pool.query(
    `SELECT event_id, event_type, status, retries, response_status, last_error, created_at, updated_at, delivered_at
     FROM webhook_events ORDER BY id DESC LIMIT ?`,
    [safeLimit]
  );
  const [[lastSuccess]] = await pool.query(
    `SELECT event_id, event_type, delivered_at FROM webhook_events
     WHERE status='delivered' ORDER BY delivered_at DESC LIMIT 1`
  );
  return {
    configured: {
      secretConfigured: Boolean(WEBHOOK_SECRET),
      receiverConfigured: Boolean(process.env.WEBHOOK_RECEIVER_URL)
    },
    counts: {
      total: Number(counts.total || 0),
      pending: Number(counts.pending || 0),
      queued: Number(counts.queued || 0),
      delivered: Number(counts.delivered || 0),
      failed: Number(counts.failed || 0),
      timeout: Number(counts.timeout || 0),
      lastActivity: counts.last_activity || null
    },
    lastSuccess: lastSuccess || null,
    recent
  };
}

// Re-deliver an event from the database, for operations after a receiver outage.
async function retryEvent(pool, eventId) {
  const [[row]] = await pool.query('SELECT event_id, payload, status FROM webhook_events WHERE event_id=? LIMIT 1', [eventId]);
  if (!row) return { found: false };
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  delete payload.deliveryError;
  const result = await deliverWebhook(pool, row.event_id, payload);
  return { found: true, previousStatus: row.status, result };
}

module.exports = {
  ALLOWED_EVENTS,
  MAX_DELIVERY_ATTEMPTS,
  verifyWebhookSignature,
  makePayload,
  signPayload,
  scrub,
  storeEvent,
  setStatus,
  recordDelivery,
  deliverWebhook,
  emitApplicationEvent,
  getWebhookStatus,
  retryEvent
};
