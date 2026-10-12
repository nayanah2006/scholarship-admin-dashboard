/**
 * Auth, OAuth, webhook, chatbot, and RBAC integration tests.
 * Requires the API on PORT (default 5000) and a populated scholarship_admin database.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const crypto = require('crypto');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

const STUDENT = { email: 'sneha.kamath443@student.ka.gov.in', password: 'PortalUser@123', role: 'STUDENT' };
const INSTITUTION = { email: 'anandrao@jssit.ac.in', password: 'Password@123', role: 'INSTITUTION' };
const GOVERNMENT = { email: 'govt_india@gmail.com', password: 'govt@123', role: 'GOVERNMENT' };

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const body = await res.json().catch(() => ({}));
  return { res, body, cookie: res.headers.get('set-cookie') };
}

async function login(creds) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(creds)
  });
}

function signBody(raw) {
  return `v1=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw, 'utf8').digest('hex')}`;
}

async function run() {
  const results = { total: 0, passed: 0, failed: 0 };

  function assert(condition, name, extra = '') {
    results.total += 1;
    if (condition) {
      results.passed += 1;
      console.log(`[PASS] ${name}${extra ? ` ${extra}` : ''}`);
    } else {
      results.failed += 1;
      console.error(`[FAIL] ${name}${extra ? ` ${extra}` : ''}`);
    }
  }

  console.log('====================================================');
  console.log('AUTH / OAUTH / WEBHOOK / CHATBOT INTEGRATION TESTS');
  console.log('====================================================\n');

  const health = await request('/api/health');
  assert(health.res.status === 200 && health.body.success === true, 'Health endpoint connected');

  console.log('\n--- Login validation ---');
  const missing = await login({ email: '', password: '', role: '' });
  assert(missing.res.status === 400, 'Missing credentials rejected (400)');

  const missingRole = await login({ email: STUDENT.email, password: STUDENT.password });
  assert(missingRole.res.status === 400, 'Login without role rejected (400)');

  const unknown = await login({ email: 'nobody-does-not-exist@example.com', password: 'WrongPass1234', role: 'STUDENT' });
  assert(unknown.res.status === 401 && unknown.body.message === 'Invalid email or password.', 'Non-existent email returns generic failure');

  const wrongPass = await login({ email: STUDENT.email, password: 'DefinitelyWrongPass1', role: 'STUDENT' });
  assert(wrongPass.res.status === 401 && wrongPass.body.message === 'Invalid email or password.', 'Wrong password returns generic failure');

  const wrongRole = await login({ email: STUDENT.email, password: STUDENT.password, role: 'GOVERNMENT' });
  assert(wrongRole.res.status === 401 && wrongRole.body.message === 'Invalid email or password.', 'Correct email + wrong role returns generic failure');

  const studentOk = await login(STUDENT);
  assert(studentOk.res.status === 200 && studentOk.body.data?.role === 'STUDENT', 'Student login with matching role succeeds');
  const studentCookie = studentOk.cookie;

  const instOk = await login(INSTITUTION);
  assert(instOk.res.status === 200 && instOk.body.data?.role === 'INSTITUTION', 'Institution login with matching role succeeds');
  const instCookie = instOk.cookie;

  const govOk = await login(GOVERNMENT);
  assert(govOk.res.status === 200 && govOk.body.data?.role === 'GOVERNMENT', 'Government login with matching role succeeds');
  const govCookie = govOk.cookie;

  console.log('\n--- Authorization ---');
  const unauth = await request('/api/government/applications');
  assert(unauth.res.status === 401, 'Unauthorized API request rejected (401)');

  const studentGov = await request('/api/government/applications', { headers: { Cookie: studentCookie } });
  assert(studentGov.res.status === 403, 'Authenticated student blocked from government endpoint (403)');

  const instGov = await request('/api/government/applications', { headers: { Cookie: instCookie } });
  assert(instGov.res.status === 403, 'Authenticated institution blocked from government endpoint (403)');

  const govApps = await request('/api/government/applications', { headers: { Cookie: govCookie } });
  assert(govApps.res.status === 200 && govApps.body.success === true, 'Government officer can access government applications');

  const officer = await request('/api/officer/analytics/overview', { headers: { Cookie: govCookie } });
  assert(officer.res.status === 200 && officer.body.success === true, 'Government officer can access officer analytics');

  const studentMe = await request('/api/auth/me', { headers: { Cookie: studentCookie } });
  assert(studentMe.res.status === 200 && studentMe.body.data?.role === 'STUDENT', 'Student session is bound to database role');

  console.log('\n--- Google OAuth ---');
  const googleConfig = await request('/api/auth/google/config');
  assert(googleConfig.res.status === 200 && typeof googleConfig.body.data?.enabled === 'boolean', 'Google config endpoint reports enabled flag');

  const googleStart = await request('/api/auth/google', { headers: { Accept: 'application/json' } });
  if (googleConfig.body.data.enabled) {
    assert([302, 200].includes(googleStart.res.status) || googleStart.res.redirected, 'Configured Google start begins authorization');
  } else {
    assert(googleStart.res.status === 503, 'Unconfigured Google start returns 503 (no fake success)');
  }

  const callbackMissing = await fetch(`${API_BASE}/api/auth/google/callback`, { redirect: 'manual' });
  assert([302, 400].includes(callbackMissing.status), 'OAuth callback without code/state is rejected');

  const callbackFake = await fetch(`${API_BASE}/api/auth/google/callback?code=fake&state=fake`, { redirect: 'manual' });
  assert([302, 400].includes(callbackFake.status), 'OAuth callback with forged state is rejected');

  console.log('\n--- Webhooks ---');
  const webhookBody = JSON.stringify({
    event: 'APPLICATION_SUBMITTED',
    applicationId: '1',
    eventId: `test_${Date.now()}`,
    data: { newStatus: 'INSTITUTION_VERIFICATION' }
  });
  if (!WEBHOOK_SECRET) {
    const noSecret = await request('/api/webhooks/application-events', {
      method: 'POST',
      body: webhookBody,
      headers: { 'Content-Type': 'application/json' }
    });
    assert(noSecret.res.status === 503, 'Inbound webhook without WEBHOOK_SECRET returns 503');
  } else {
    const unsigned = await request('/api/webhooks/application-events', {
      method: 'POST',
      body: webhookBody,
      headers: { 'Content-Type': 'application/json' }
    });
    assert(unsigned.res.status === 403, 'Webhook without signature is rejected');

    const badSig = await request('/api/webhooks/application-events', {
      method: 'POST',
      body: webhookBody,
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': 'v1=00' }
    });
    assert(badSig.res.status === 403, 'Webhook with invalid signature is rejected');

    const signed = await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signBody(webhookBody)
      },
      body: webhookBody
    });
    const signedJson = await signed.json().catch(() => ({}));
    assert(signed.status === 200 && signedJson.success === true && signedJson.data?.status === 'received', 'Valid signed webhook is stored');

    const dup = await fetch(`${API_BASE}/api/webhooks/application-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signBody(webhookBody)
      },
      body: webhookBody
    });
    const dupJson = await dup.json().catch(() => ({}));
    assert(dup.status === 200 && dupJson.data?.status === 'duplicate', 'Duplicate webhook event_id is idempotent');
  }

  console.log('\n--- Chatbot memory ---');
  const chatUnauth = await request('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: 'hello' }) });
  assert(chatUnauth.res.status === 401, 'Chatbot requires authentication');

  const first = await request('/api/ai/chat', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ message: 'What scholarships can I apply for?' })
  });
  assert(first.res.status === 200 && typeof first.body.data?.answer === 'string', 'Authenticated chatbot returns a catalog-grounded answer');

  const history = await request('/api/ai/chat/history', { headers: { Cookie: studentCookie } });
  assert(history.res.status === 200 && Array.isArray(history.body.data?.messages) && history.body.data.messages.length >= 2, 'Chat history is persisted for the student');

  const followUp = await request('/api/ai/chat', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ message: 'What documents are required?' })
  });
  assert(
    followUp.res.status === 200 &&
      followUp.body.data?.answer?.toLowerCase().includes('which scholarship') &&
      Array.isArray(followUp.body.data?.options) &&
      followUp.body.data.options.length > 0,
    'Ambiguous document question asks which scholarship and offers choices'
  );

  const selectedScholarship = followUp.body.data?.options?.[0];
  const selectedDocuments = selectedScholarship
    ? await request('/api/ai/chat', {
        method: 'POST',
        headers: { Cookie: studentCookie },
        body: JSON.stringify({ message: `What documents are mandatory for ${selectedScholarship.name}?` })
      })
    : null;
  assert(
    selectedDocuments?.res.status === 200 &&
      selectedDocuments.body.data?.answer?.includes(selectedScholarship.name) &&
      !selectedDocuments.body.data?.options?.length &&
      (
        selectedDocuments.body.data?.answer?.includes('same checklist for most active scholarships') ||
        (selectedDocuments.body.data?.sources || []).every((source) => (
          source.scholarship === selectedScholarship.name ||
          source.name === selectedScholarship.name
        ))
      ),
    'Selected scholarship gets its document list or an explicit shared-data warning'
  );

  const shortNameDocuments = await request('/api/ai/chat', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ message: 'What documents are mandatory for ssp?' })
  });
  assert(
    shortNameDocuments.res.status === 200 &&
      shortNameDocuments.body.data?.answer?.toLowerCase().includes('ssp') &&
      !shortNameDocuments.body.data?.options?.length,
    'Short scholarship names resolve without reopening the chooser'
  );

  const historyAfterSelection = await request('/api/ai/chat/history', { headers: { Cookie: studentCookie } });
  const storedChat = historyAfterSelection.body.data?.messages || [];
  const hasUnrequestedDocumentAnswer = storedChat.some((message, index) => (
    message.role === 'bot' &&
    message.sources?.some((source) =>
      source.scholarship &&
      !String(storedChat.slice(0, index).reverse().find((item) => item.role === 'user')?.content || '')
        .toLowerCase()
        .includes(String(source.scholarship).toLowerCase())
    )
  ));
  assert(
    historyAfterSelection.res.status === 200 &&
      storedChat.some((message) => message.options?.length > 0) &&
      !hasUnrequestedDocumentAnswer,
    'Scholarship choices remain selectable after chat history is reloaded'
  );

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${results.passed} / ${results.total} PASSED (${results.failed} FAILED)`);
  console.log('====================================================');
  process.exit(results.failed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal error during integration testing:', err);
  process.exit(1);
});
