'use strict';

/**
 * Google OAuth routes for ScholarPath Portal.
 *
 * Supports TWO complementary flows:
 *
 * 1. Authorization-Code flow (existing UX):
 *    GET  /api/auth/google          → redirects browser to Google
 *    GET  /api/auth/google/callback → exchanges code, verifies ID token, sets session
 *
 * 2. One-tap / credential flow (frontend renders Google button, backend verifies):
 *    POST /api/auth/google          → verifies credential (ID token) sent by browser, sets session
 *
 * 3. Config probe (frontend uses this to decide whether to show the button):
 *    GET  /api/auth/google/config   → { enabled: bool }
 *
 * Security guarantees:
 * - ID tokens are always verified server-side via google-auth-library (OAuth2Client).
 * - Issuer, audience, and expiration are validated by the library.
 * - Email must be verified by Google.
 * - State parameter is stored in both the DB and the session cookie to prevent CSRF.
 * - No email/name data supplied directly by the frontend is trusted without token verification.
 * - Privileged roles (INSTITUTION, GOVERNMENT, ADMIN) are never auto-created.
 * - Existing user roles are never changed by OAuth login.
 * - ID tokens are never logged.
 */

const { randomUUID, timingSafeEqual } = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = ['openid', 'email', 'profile'].join(' ');
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Lazily-created OAuth2Client for ID-token verification.
let _oauth2Client = null;
function getOAuth2Client() {
  if (!_oauth2Client && CLIENT_ID) {
    _oauth2Client = new OAuth2Client(CLIENT_ID);
  }
  return _oauth2Client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function oauthConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && CALLBACK_URL);
}

function oauthUrl(state) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function redirectFrontend(res, query) {
  const url = new URL(FRONTEND_URL);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return res.redirect(url.toString());
}

// ---------------------------------------------------------------------------
// Google ID-token verification (using google-auth-library)
// ---------------------------------------------------------------------------

/**
 * Verify a Google ID token and return { sub, email, name, picture }.
 * Throws on any verification failure.
 * Never logs the raw token.
 */
async function verifyIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') throw new Error('Missing ID token');
  if (!CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is not configured');

  const client = getOAuth2Client();
  // google-auth-library verifies signature, issuer, audience, and expiration.
  const ticket = await client.verifyIdToken({
    idToken,
    audience: CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error('Empty token payload');
  if (!payload.sub) throw new Error('Missing Google subject (sub)');
  if (!payload.email) throw new Error('Missing Google email');
  if (!payload.email_verified) throw new Error('Google email is not verified');

  return {
    sub: String(payload.sub),
    email: String(payload.email).toLowerCase().trim(),
    name: String(payload.name || payload.given_name || payload.email).slice(0, 160),
    picture: typeof payload.picture === 'string' ? payload.picture : null
  };
}

// ---------------------------------------------------------------------------
// Authorization-Code exchange
// ---------------------------------------------------------------------------

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: CALLBACK_URL
  });
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!resp.ok) throw new Error('Google token exchange failed');
  return resp.json();
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

async function establishSession(req, user) {
  await regenerateSession(req);
  req.session.user = {
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    institutionId: user.institution_id || null
  };
  await saveSession(req);
}

// ---------------------------------------------------------------------------
// OAuth state (CSRF protection for the code flow)
// ---------------------------------------------------------------------------

async function consumeState(pool, req, state) {
  if (!state) return false;
  const sessionState = req.session.oauthState || '';
  const [[row]] = await pool.query(
    'SELECT state, created_at FROM oauth_state WHERE state=? AND purpose=? LIMIT 1',
    [state, 'google']
  );
  await pool.query('DELETE FROM oauth_state WHERE state=?', [state]);
  delete req.session.oauthState;
  if (!row) return false;
  if (!safeEqual(sessionState, state) || !safeEqual(row.state, state)) return false;
  const created = new Date(row.created_at).getTime();
  if (!Number.isFinite(created) || Date.now() - created > STATE_TTL_MS) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Database: resolve or create a portal account from a verified Google identity
// ---------------------------------------------------------------------------

async function findUserWithInstitution(conn, userId) {
  const [[user]] = await conn.query(
    'SELECT u.id, u.email, u.role, u.full_name, u.is_active, i.id institution_id FROM users u LEFT JOIN institutions i ON i.user_id=u.id WHERE u.id=? LIMIT 1',
    [userId]
  );
  return user || null;
}

/**
 * Resolve or create a portal user from a verified Google identity.
 *
 * Priority:
 *   1. Existing oauth_identities row for this (provider, sub) → return linked user.
 *   2. Existing users row with matching email → link identity, return user.
 *   3. No match → create a new STUDENT account and link identity.
 *
 * Rules:
 * - Existing user roles are NEVER modified.
 * - INSTITUTION / GOVERNMENT / ADMIN accounts are NEVER auto-created via OAuth.
 * - A new account is always STUDENT.
 * - Duplicate detection uses both google_sub (strongest) and email (fallback).
 */
async function resolveGoogleAccount(conn, identity) {
  // 1. Already linked via Google sub
  const [[linked]] = await conn.query(
    `SELECT u.id, u.email, u.role, u.full_name, u.is_active, i.id institution_id
     FROM oauth_identities oi
     JOIN users u ON u.id=oi.user_id
     LEFT JOIN institutions i ON i.user_id=u.id
     WHERE oi.provider='google' AND oi.provider_sub=?
     LIMIT 1`,
    [identity.sub]
  );
  if (linked) {
    // Keep email current in case it changed on Google side (rare, but possible).
    await conn.query(
      'UPDATE oauth_identities SET email=?, updated_at=NOW() WHERE provider=? AND provider_sub=?',
      [identity.email, 'google', identity.sub]
    );
    return linked;
  }

  // 2. Existing portal account with matching verified email → safe to link
  const [[byEmail]] = await conn.query(
    'SELECT u.id, u.email, u.role, u.full_name, u.is_active, i.id institution_id FROM users u LEFT JOIN institutions i ON i.user_id=u.id WHERE u.email=? LIMIT 1',
    [identity.email]
  );
  if (byEmail) {
    // Insert link; ignore if already exists (race condition safety).
    await conn.query(
      'INSERT IGNORE INTO oauth_identities (user_id, provider, provider_sub, email) VALUES (?,?,?,?)',
      [byEmail.id, 'google', identity.sub, identity.email]
    );
    return byEmail;
  }

  // 3. New Google student account
  const userId = randomUUID();
  try {
    await conn.query(
      // password_hash is nullable after migration 006; NULL = OAuth-only account.
      'INSERT INTO users (id,email,password_hash,role,full_name,is_active) VALUES (?,?,NULL,?,?,1)',
      [userId, identity.email, 'STUDENT', identity.name]
    );
    await conn.query('INSERT INTO student_profiles_v2 (user_id) VALUES (?)', [userId]);
    await conn.query(
      'INSERT INTO oauth_identities (user_id, provider, provider_sub, email) VALUES (?,?,?,?)',
      [userId, 'google', identity.sub, identity.email]
    );
    return findUserWithInstitution(conn, userId);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const [[existing]] = await conn.query(
        'SELECT u.id, u.email, u.role, u.full_name, u.is_active, i.id institution_id FROM users u LEFT JOIN institutions i ON i.user_id=u.id WHERE u.email=? LIMIT 1',
        [identity.email]
      );
      if (existing) {
        await conn.query(
          'INSERT IGNORE INTO oauth_identities (user_id, provider, provider_sub, email) VALUES (?,?,?,?)',
          [existing.id, 'google', identity.sub, identity.email]
        );
        return existing;
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

function registerRoutes(app, pool, fail) {
  /**
   * GET /api/auth/google/config
   * Frontend polls this to decide whether to show the Google button.
   */
  app.get('/api/auth/google/config', (_req, res) => {
    res.json({
      success: true,
      data: {
        enabled: oauthConfigured(),
        // Only the client ID (public) is safe to expose; never the secret.
        clientId: oauthConfigured() ? CLIENT_ID : null,
        message: oauthConfigured()
          ? 'Google Sign-In is available.'
          : 'Google Sign-In is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.'
      }
    });
  });

  /**
   * GET /api/auth/google
   * Starts the Authorization-Code flow: generates a CSRF state, stores it,
   * then redirects the browser to Google's authorization endpoint.
   */
  app.get('/api/auth/google', async (req, res) => {
    if (!oauthConfigured()) {
      if ((req.headers.accept || '').includes('application/json')) {
        return fail(res, 503, 'Google Sign-In is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.');
      }
      return redirectFrontend(res, { oauth_error: 'google_not_configured' });
    }

    const state = randomUUID();
    try {
      await pool.query(
        'INSERT INTO oauth_state (state, email, purpose) VALUES (?, NULL, ?) ON DUPLICATE KEY UPDATE purpose=VALUES(purpose), created_at=NOW()',
        [state, 'google']
      );
      req.session.oauthState = state;
      await saveSession(req);
      return res.redirect(oauthUrl(state));
    } catch (error) {
      console.error('Google OAuth start error:', error.message);
      return fail(res, 500, 'Google Sign-In could not be started.');
    }
  });

  /**
   * POST /api/auth/google
   * Credential-based flow: the frontend sends the Google ID token (credential)
   * obtained from the GIS one-tap button or the GSI renderButton.
   * The backend verifies the token and establishes a session.
   *
   * Body: { credential: "<Google ID token>" }
   * Returns: same session data as a normal login.
   */
  app.post('/api/auth/google', async (req, res) => {
    const credential = String(req.body?.credential || '').trim();
    if (!credential) {
      return fail(res, 400, 'Missing Google credential token.');
    }

    let identity;
    try {
      // Verify the ID token using google-auth-library.
      // The library checks signature, issuer (accounts.google.com), audience (CLIENT_ID), and expiration.
      // We intentionally do NOT log the credential.
      identity = await verifyIdToken(credential);
    } catch (err) {
      // Sanitize error message to avoid leaking token details.
      console.error('Google credential verification failed:', err.message);
      return fail(res, 401, 'Google identity verification failed. Please try again.');
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const user = await resolveGoogleAccount(conn, identity);
      await conn.commit();

      if (!user || !user.is_active) {
        return fail(res, 403, 'This account is disabled. Contact an administrator.');
      }

      await establishSession(req, user);

      // Return the same session data shape as the email/password login endpoint.
      return res.json({
        success: true,
        data: {
          id: user.id,
          role: user.role,
          fullName: user.full_name,
          institutionId: user.institution_id || null
        }
      });
    } catch (err) {
      await conn.rollback();
      console.error('Google login DB error:', err.message);
      return fail(res, 500, 'Google Sign-In could not be completed.');
    } finally {
      conn.release();
    }
  });

  /**
   * GET /api/auth/google/callback
   * Authorization-Code callback from Google.
   * Exchanges the code for tokens, verifies the ID token, then redirects the
   * browser back to the frontend with either `?oauth=success` or `?oauth_error=...`.
   */
  app.get('/api/auth/google/callback', async (req, res) => {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');

    if (req.query.error) {
      return redirectFrontend(res, { oauth_error: 'google_denied' });
    }
    if (!code || !state) {
      return redirectFrontend(res, { oauth_error: 'missing_oauth_parameters' });
    }

    // Validate CSRF state.
    let stateOk = false;
    try {
      stateOk = await consumeState(pool, req, state);
    } catch (err) {
      console.error('OAuth state validation error:', err.message);
      return redirectFrontend(res, { oauth_error: 'invalid_state' });
    }
    if (!stateOk) {
      return redirectFrontend(res, { oauth_error: 'invalid_state' });
    }

    let identity;
    try {
      const tokens = await exchangeCode(code);
      // Verify the ID token from Google's token endpoint response.
      identity = await verifyIdToken(tokens.id_token);
    } catch (err) {
      console.error('Google identity verification error:', err.message);
      return redirectFrontend(res, { oauth_error: 'google_verification_failed' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const user = await resolveGoogleAccount(conn, identity);
      await conn.commit();

      if (!user || !user.is_active) {
        return redirectFrontend(res, { oauth_error: 'account_disabled' });
      }

      await establishSession(req, user);
      return redirectFrontend(res, { oauth: 'success' });
    } catch (err) {
      await conn.rollback();
      console.error('Google login DB error:', err.message);
      return redirectFrontend(res, { oauth_error: 'authentication_failed' });
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  registerRoutes,
  oauthConfigured,
  verifyIdToken,
  resolveGoogleAccount,
  findUserWithInstitution,
  consumeState
};
