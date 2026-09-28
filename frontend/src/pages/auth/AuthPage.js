import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button, Alert, InputField, SelectField } from '../../components/ui/DesignSystem';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Human-readable OAuth error messages — all cases handled by the backend.
const OAUTH_ERRORS = {
  google_not_configured: 'Google Sign-In is not configured on this server.',
  google_denied: 'Google Sign-In was cancelled.',
  missing_oauth_parameters: 'Google Sign-In did not complete. Please try again.',
  invalid_state: 'Google Sign-In could not be verified. Please try again.',
  google_verification_failed: 'Google could not verify your identity. Please try again.',
  account_disabled: 'This account is disabled. Contact an administrator.',
  authentication_failed: 'Google Sign-In could not be completed. Please try again.'
};

/**
 * Load the Google Identity Services (GIS) script once.
 * Resolves when window.google.accounts.id is available.
 */
function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    if (document.getElementById('google-gsi-script')) {
      // Script is already loading; wait for it.
      const poll = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(poll);
          resolve();
        }
      }, 80);
      // Timeout after 10 s.
      setTimeout(() => { clearInterval(poll); reject(new Error('GIS script load timed out')); }, 10000);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('GIS script failed to load'));
    document.head.appendChild(script);
  });
}

export function AuthPage({ onLogin, api }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('STUDENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Google OAuth state
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const gsiInitialisedRef = useRef(false);

  // -------------------------------------------------------------------------
  // Initialisation: check for OAuth errors in URL, then probe the config endpoint.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('oauth_error');
    const oauthSuccess = params.get('oauth');

    if (oauthError) {
      setError(OAUTH_ERRORS[oauthError] || 'Google Sign-In could not be completed.');
      // Clean the URL so the error doesn't persist on refresh.
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    } else if (oauthSuccess === 'success') {
      // Authorization-Code flow succeeded — session cookie was set by backend callback.
      window.history.replaceState({}, '', window.location.pathname);
      api('/api/auth/me')
        .then((user) => {
          if (user) onLogin(user);
        })
        .catch((err) => {
          setError(err.message || 'Google Sign-In completed, but session could not be established.');
        });
    }

    // Probe the backend for Google config.
    api('/api/auth/google/config')
      .then((data) => {
        const enabled = Boolean(data?.enabled);
        setGoogleEnabled(enabled);
        if (data?.clientId) setGoogleClientId(data.clientId);
      })
      .catch(() => {
        setGoogleEnabled(false);
      });
  }, [api, onLogin]);

  // -------------------------------------------------------------------------
  // Initialise Google Identity Services one-tap / renderButton.
  // -------------------------------------------------------------------------
  const handleGoogleCredential = useCallback(
    async (response) => {
      if (!response?.credential) {
        setError('Google did not return a credential. Please try again.');
        return;
      }
      setGoogleLoading(true);
      setError('');
      try {
        // Send the ID token to our backend for server-side verification.
        // We do NOT trust any data from the frontend — the backend verifies everything.
        const user = await api('/api/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential: response.credential })
        });
        onLogin(user);
      } catch (err) {
        setError(err.message || 'Google Sign-In could not be completed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [api, onLogin]
  );

  useEffect(() => {
    if (!googleEnabled || !googleClientId || gsiInitialisedRef.current) return;

    loadGoogleScript()
      .then(() => {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true
        });
        gsiInitialisedRef.current = true;
        // Render the styled button into our placeholder div.
        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: googleButtonRef.current.offsetWidth || 340
          });
        }
      })
      .catch((err) => {
        console.warn('Google GIS load failed:', err.message);
      });
  }, [googleEnabled, googleClientId, handleGoogleCredential]);

  // -------------------------------------------------------------------------
  // Authorization-Code flow fallback button (used when GIS renders nothing).
  // -------------------------------------------------------------------------
  const continueWithGoogleCodeFlow = () => {
    window.location.assign(`${API_BASE}/api/auth/google`);
  };

  // -------------------------------------------------------------------------
  // Normal email/password submit.
  // -------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            fullName,
            email,
            password,
            phone: phone || undefined,
            role,
            institutionName: role === 'INSTITUTION' ? institutionName : undefined,
            institutionCode: role === 'INSTITUTION' ? institutionCode : undefined
          })
        });
      }

      const user = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role })
      });

      onLogin(user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (demoEmail, demoPass, demoRole) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setRole(demoRole);
    setMode('login');
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30">
          <GraduationCap size={32} />
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
          ScholarPath Portal
        </h2>
        <p className="mt-1 text-xs text-indigo-200 uppercase font-semibold tracking-wider">
          Government of Karnataka • Unified Scholarship Administration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                if (role === 'GOVERNMENT' || role === 'ADMIN') setRole('STUDENT');
              }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && <Alert message={error} onClose={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <SelectField
              label="Account Category"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={
                mode === 'login'
                  ? [
                      { value: 'STUDENT', label: 'Student Applicant' },
                      { value: 'INSTITUTION', label: 'Educational Institution' },
                      { value: 'GOVERNMENT', label: 'Government Officer' },
                      { value: 'ADMIN', label: 'Administrator' }
                    ]
                  : [
                      { value: 'STUDENT', label: 'Student Applicant' },
                      { value: 'INSTITUTION', label: 'Educational Institution' }
                    ]
              }
              required
            />

            {mode === 'register' && (
              <>
                <InputField
                  label="Full Legal Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Nayana Hanwal"
                  required
                />

                {role === 'INSTITUTION' && (
                  <>
                    <InputField
                      label="Institution Name"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. Bangalore University"
                      required
                    />
                    <InputField
                      label="AISHE / Institution Code"
                      value={institutionCode}
                      onChange={(e) => setInstitutionCode(e.target.value)}
                      placeholder="e.g. BU-BLR-01"
                      required
                    />
                  </>
                )}

                <InputField
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9845012345"
                />
              </>
            )}

            <InputField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@domain.com"
              required
            />

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              hint={mode === 'register' ? 'At least 10 characters with letters and numbers' : ''}
              required
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-2.5 mt-2"
            >
              {mode === 'login' ? 'Sign In to Portal' : 'Register Account'}
            </Button>
          </form>

          {/* Google Sign-In — only shown on the login tab */}
          {mode === 'login' && (
            <div className="mt-4">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="bg-white px-2 text-slate-400">Or</span>
                </div>
              </div>

              {googleEnabled ? (
                <div className="flex flex-col items-center gap-2">
                  {/*
                    The GIS library renders its own button into this div.
                    We also provide a plain fallback button for browsers/environments
                    where the GIS script cannot load (e.g. ad-blockers, slow network).
                  */}
                  <div
                    ref={googleButtonRef}
                    className="w-full flex justify-center"
                    aria-label="Sign in with Google"
                  />
                  {googleLoading && (
                    <p className="text-[11px] text-slate-500 animate-pulse">
                      Verifying your Google account…
                    </p>
                  )}
                  {/* Fallback: redirect-to-backend Authorization-Code button */}
                  {false && (
                  <button
                    type="button"
                    onClick={continueWithGoogleCodeFlow}
                    disabled={googleLoading || loading}
                    className="mt-1 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {/* Google "G" logo */}
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
                    </svg>
                    Continue with Google
                  </button> )}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="opacity-40">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
                    </svg>
                    Continue with Google
                  </button>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Google Sign-In is unavailable until an administrator configures Google OAuth credentials.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Quick Demo Logins Helper */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-xs">
            <p className="font-semibold text-slate-500 mb-2">Quick Sign-In (Demo Credentials):</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickDemo('govt_india@gmail.com', 'govt@123', 'GOVERNMENT')}
                className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-2 text-left text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100"
              >
                <b>Govt Officer</b>
                <span className="block text-[10px] text-indigo-700">govt_india@gmail.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('anandrao@jssit.ac.in', 'Password@123', 'INSTITUTION')}
                className="rounded-lg border border-teal-200 bg-teal-50/70 p-2 text-left text-[11px] font-semibold text-teal-900 hover:bg-teal-100"
              >
                <b>Institution</b>
                <span className="block text-[10px] text-teal-700">anandrao@jssit.ac.in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
