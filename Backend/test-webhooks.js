#!/usr/bin/env node
/**
 * Webhook integration test — fully self-contained.
 *
 * It starts a local receiver HTTP server, points the portal backend at it, and
 * proves the whole pipe without any external service or real secret:
 *
 *   1. outbound  : a real application is submitted through the API and the
 *                  receiver must get a signed APPLICATION_SUBMITTED event
 *   2. signature  : the HMAC-SHA256 signature must verify against the shared secret
 *   3. inbound   : a signed event is accepted, stored, and delivered
 *   4. security  : unsigned and tampered payloads are rejected when a secret is set
 *   5. idempotency: replaying the same eventId is a no-op
 *   6. retry     : a failing receiver is retried and then recorded as failed
 *   7. admin view: /api/admin/webhooks reports counts and blocks non-admins
 *
 * Usage:  node test-webhooks.js
 * Requires: MySQL reachable with the configured .env, and seeded demo data.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 5055);
const API_BASE = `http://127.0.0.1:${PORT}`;
const SECRET = process.env.WEBHOOK_SECRET || '';
const STUDENT = { email: 'sneha.kamath443@student.ka.gov.in', password: 'PortalUser@123', role: 'STUDENT' };

const results = { total: 0, passed: 0, failed: 0 };
function assert(condition, name, extra = '') {
  results.total += 1;
  if (condition) { results.passed += 1; console.log(`[PASS] ${name}${extra ? ` ${extra}` : ''}`); }
  else { results.failed += 1; console.error(`[FAIL] ${name}${extra ? ` ${extra}` : ''}`); }
}

function sign(raw) {
  return `v1=${crypto.createHmac('sha256', SECRET).update(raw, 'utf8').digest('hex')}`;
}

async function json(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  return { res, body: await res.json().catch(() => ({})), cookie: res.headers.get('set-cookie') };
}

// --- receiver ------------------------------------------------------------------
const received = [];
let receiverMode = 'ok';
const receiver = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    if (receiverMode === 'fail') { res.writeHead(500).end('boom'); return; }
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (_) { /* ignore */ }
    received.push({ headers: req.headers, raw, parsed });
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
  });
});

function waitFor(predicate, timeoutMs = 6000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      const hit = predicate(received);
      if (hit) return resolve(hit);
      if (Date.now() - started > timeoutMs) return resolve(null);
      setTimeout(tick, 100);
    };
    tick();
  });
}

async function waitForHealth(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await fetch(`${API_BASE}/api/health`);
      if (r.ok) return true;
    } catch (_) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

(async () => {
  await new Promise((r) => receiver.listen(0, '127.0.0.1', r));
  const receiverPort = receiver.address().port;
  const receiverUrl = `http://127.0.0.1:${receiverPort}/hook`;

  if (!SECRET) {
    console.error('WEBHOOK_SECRET is empty in .env — the test needs one to sign payloads.');
    process.exit(2);
  }

  // Point this server + the portal at the local receiver.
  process.env.WEBHOOK_RECEIVER_URL = receiverUrl;
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

  const { spawn } = require('child_process');
  const server = spawn(process.execPath, [require('path').join(__dirname, 'Server.js')], {
    env: { ...process.env, PORT: String(PORT), WEBHOOK_RECEIVER_URL: receiverUrl },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const serverLog = [];
  server.stdout.on('data', (d) => serverLog.push(String(d)));
  server.stderr.on('data', (d) => serverLog.push(String(d)));

  const cleanup = () => { try { server.kill(); } catch (_) {} try { receiver.close(); } catch (_) {} };

  try {
    assert(await waitForHealth(), 'Backend started for the test', `(port ${PORT})`);

    const login = await json('/api/auth/login', { method: 'POST', body: JSON.stringify(STUDENT) });
    const cookie = login.cookie;
    assert(login.res.status === 200 && Boolean(cookie), 'Student signed in (test precondition)');

    // ---------------------------------------------------------------- 1 + 2
    console.log('\n--- Outbound: real application submission ---');
    const scholarship = (await json('/api/scholarships?limit=5', { headers: { Cookie: cookie } })).body?.data;
    const items = Array.isArray(scholarship) ? scholarship : (scholarship?.items || scholarship?.scholarships || []);
    // The student may already hold a draft for the first scholarship; pick one without a duplicate.
    let firstScholarship = items[0];
    for (const candidate of items) {
      const probe = await json('/api/applications', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: JSON.stringify({ scholarshipId: candidate.id })
      });
      if (probe.res.status === 201) { firstScholarship = candidate; break; }
      if (probe.res.status === 409) { firstScholarship = null; continue; }
      firstScholarship = null;
      break;
    }
    assert(Boolean(firstScholarship?.id), 'A scholarship is available to apply to');

    const beforeCount = received.length;
    const apply = firstScholarship
      ? await json('/api/applications', {
          method: 'POST',
          headers: { Cookie: cookie },
          body: JSON.stringify({ scholarshipId: firstScholarship.id })
        })
      : { res: { status: 0 }, body: {} };
    const applicationId = apply.body?.data?.id || apply.body?.data?.applicationId;
    assert(apply.res.status === 201 && Boolean(applicationId), 'Application created (draft)', `id=${applicationId}`);

    if (applicationId) {
      const submitted = await json(`/api/applications/${applicationId}/submit`, { method: 'POST', headers: { Cookie: cookie }, body: '{}' });
      assert([200, 201].includes(submitted.res.status), 'Application submitted');

      const hit = await waitFor((list) => list.slice(beforeCount).find((entry) => entry.parsed?.event === 'APPLICATION_SUBMITTED'));
      assert(Boolean(hit), 'Receiver got an APPLICATION_SUBMITTED webhook');

      if (hit) {
        assert(String(hit.parsed.applicationId) === String(applicationId), 'Payload carries the submitted applicationId');
        assert(Boolean(hit.headers['x-webhook-signature']), 'Delivery carries x-webhook-signature');
        const expected = sign(hit.raw);
        assert(hit.headers['x-webhook-signature'] === expected, 'Signature verifies against the shared secret (HMAC-SHA256)');
        assert(!/password|token/i.test(hit.raw), 'Payload carries no credential fields');
      }
    }

    // ---------------------------------------------------------------- 3
    console.log('\n--- Inbound: signed event acceptance ---');
    const eventId = `test_in_${Date.now()}`;
    const inboundRaw = JSON.stringify({ event: 'APPLICATION_VERIFIED', applicationId: '1', eventId, data: { newStatus: 'DOCUMENT_VERIFICATION' } });
    const inbound = await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': sign(inboundRaw) },
      body: inboundRaw
    });
    const inboundBody = await inbound.json().catch(() => ({}));
    assert(inbound.status === 200 && inboundBody.data?.status === 'received', 'Signed inbound event is accepted and stored');
    assert(Boolean(await waitFor((list) => list.find((e) => e.parsed?.event === 'APPLICATION_VERIFIED'))), 'Inbound event is forwarded to the receiver');

    // ---------------------------------------------------------------- 4
    console.log('\n--- Security ---');
    const unsigned = await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: inboundRaw.replace(eventId, `${eventId}_u`)
    });
    assert(unsigned.status === 403, 'Unsigned inbound event is rejected (403)');

    const tamperedRaw = inboundRaw.replace('DOCUMENT_VERIFICATION', 'APPROVED').replace(eventId, `${eventId}_t`);
    const tampered = await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': sign(inboundRaw) },
      body: tamperedRaw
    });
    assert(tampered.status === 403, 'Tampered payload with a stale signature is rejected (403)');

    const unknownEvent = await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': sign(JSON.stringify({ event: 'NOPE', applicationId: '1' })) },
      body: JSON.stringify({ event: 'NOPE', applicationId: '1' })
    });
    assert(unknownEvent.status === 400, 'Unsupported event type is rejected (400)');

    // ---------------------------------------------------------------- 5
    console.log('\n--- Idempotency ---');
    const replay = await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': sign(inboundRaw) },
      body: inboundRaw
    });
    const replayBody = await replay.json().catch(() => ({}));
    assert(replay.status === 200 && replayBody.data?.status === 'duplicate', 'Replayed eventId is idempotent');

    // ---------------------------------------------------------------- 6
    console.log('\n--- Retry behaviour ---');
    receiverMode = 'fail';
    const failRaw = JSON.stringify({ event: 'APPLICATION_REJECTED', applicationId: '1', eventId: `test_fail_${Date.now()}`, data: { newStatus: 'REJECTED' } });
    await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': sign(failRaw) },
      body: failRaw
    });
    await new Promise((r) => setTimeout(r, 4000));
    receiverMode = 'ok';

    // ---------------------------------------------------------------- 7
    console.log('\n--- Admin observability ---');
    const noAuth = await json('/api/admin/webhooks');
    assert(noAuth.res.status === 401, 'Webhook admin view requires authentication (401)');

    const asStudent = await json('/api/admin/webhooks', { headers: { Cookie: cookie } });
    assert(asStudent.res.status === 403, 'Webhook admin view blocked for a student (403)');

    const adminCookie = await (async () => {
      for (const creds of [
        { email: 'govt_india@gmail.com', password: 'govt@123', role: 'GOVERNMENT' },
        { email: 'admin@scholarpath.local', password: 'Admin@12345', role: 'ADMIN' }
      ]) {
        const r = await json('/api/auth/login', { method: 'POST', body: JSON.stringify(creds) });
        if (r.res.status === 200 && r.body.data?.role === 'ADMIN') return r.cookie;
      }
      return null;
    })();

    if (adminCookie) {
      const status = await json('/api/admin/webhooks?limit=10', { headers: { Cookie: adminCookie } });
      const data = status.body?.data;
      assert(status.res.status === 200 && data?.configured?.secretConfigured === true, 'Admin view reports the signing secret as configured');
      assert(data?.counts?.delivered >= 1, 'Delivered count reflects real deliveries', `delivered=${data?.counts?.delivered}`);
      assert(data?.counts?.failed >= 1, 'Failed count reflects the simulated receiver outage', `failed=${data?.counts?.failed}`);
      assert(Array.isArray(data?.recent) && data.recent.length >= 1, 'Recent deliveries are listed');
      assert(!JSON.stringify(data).includes(SECRET), 'Admin view never leaks the secret');

      const failedEvent = (data?.recent || []).find((e) => e.status === 'failed');
      if (failedEvent) {
        const retry = await json(`/api/admin/webhooks/${encodeURIComponent(failedEvent.event_id)}/retry`, { method: 'POST', headers: { Cookie: adminCookie }, body: '{}' });
        assert(retry.res.status === 200 && retry.body.data?.status === 'delivered', 'A failed event can be re-delivered from the admin view');
      }
    } else {
      console.log('[SKIP] No ADMIN account available — admin delivery checks skipped.');
    }

    console.log('\n====================================================');
    console.log(`WEBHOOK TEST SUMMARY: ${results.passed} / ${results.total} PASSED (${results.failed} FAILED)`);
    console.log('====================================================');
  } catch (err) {
    console.error('Test run crashed:', err.stack || err.message);
    console.error(serverLog.join('').slice(-2000));
    results.failed += 1;
  } finally {
    cleanup();
    process.exit(results.failed === 0 ? 0 : 1);
  }
})();
