import React, { useEffect, useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { IntegratedChatbot } from './components/chatbot/IntegratedChatbot';
import { Alert } from './components/ui/DesignSystem';

// Views
import { AuthPage } from './pages/auth/AuthPage';
import { GovernmentAnalyticsDashboard } from './pages/government/GovernmentAnalyticsDashboard';
import { GovernmentApplicationsView } from './pages/government/GovernmentApplicationsView';
import { GovernmentInsightsView } from './pages/government/GovernmentInsightsView';
import { InstitutionPortal } from './pages/institution/InstitutionPortal';
import { StudentPortal } from './pages/student/StudentPortal';
import { AdminPortal } from './pages/admin/AdminPortal';
import { NotificationsView } from './pages/NotificationsView';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'The request could not be completed.');
  }
  return body.data;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    api('/api/auth/me')
      .then((u) => {
        setUser(u);
        setPage('dashboard');
      })
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  const done = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 4000);
  };

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    setUser(null);
    setPage('dashboard');
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-4" />
        <p className="text-sm font-semibold tracking-wide">Connecting to ScholarPath Portal…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={(u) => { setUser(u); setPage('dashboard'); }} api={api} />;
  }

  const isStudent = user.role === 'STUDENT';
  const isInstitution = user.role === 'INSTITUTION';
  const isGovernment = user.role === 'GOVERNMENT';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onPage={setPage}
        activePage={page}
        toggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Sidebar */}
        <Sidebar
          user={user}
          activePage={page}
          onPage={setPage}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {error && <Alert message={error} onClose={() => setError('')} />}

          {toast && (
            <div
              role="status"
              className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm transition-all"
            >
              <span>{toast}</span>
              <button onClick={() => setToast('')} className="text-emerald-600 hover:text-emerald-900">
                ×
              </button>
            </div>
          )}

          {/* GOVERNMENT OFFICER ROUTING */}
          {isGovernment && (
            <>
              {(page === 'dashboard' || page === 'govtAnalytics') && (
                <GovernmentAnalyticsDashboard
                  api={api}
                  onNavigateApplicationReview={() => setPage('govtApplications')}
                />
              )}
              {page === 'govtApplications' && (
                <GovernmentApplicationsView api={api} done={done} fail={setError} />
              )}
              {page === 'govtInsights' && (
                <GovernmentInsightsView api={api} fail={setError} />
              )}
              {page === 'notifications' && (
                <NotificationsView api={api} fail={setError} />
              )}
            </>
          )}

          {/* INSTITUTION ROUTING */}
          {isInstitution && (
            <>
              {(page === 'dashboard' || page === 'institution') && (
                <InstitutionPortal user={user} api={api} done={done} fail={setError} />
              )}
              {page === 'notifications' && (
                <NotificationsView api={api} fail={setError} />
              )}
            </>
          )}

          {/* STUDENT ROUTING */}
          {isStudent && (
            <>
              {['dashboard', 'profile', 'scholarships', 'recommendations', 'eligibility', 'applications', 'saved'].includes(page) && (
                <StudentPortal
                  user={user}
                  api={api}
                  done={done}
                  fail={setError}
                  onPage={setPage}
                  activeTab={page}
                />
              )}
              {page === 'notifications' && (
                <NotificationsView api={api} fail={setError} />
              )}
            </>
          )}

          {/* ADMIN ROUTING */}
          {isAdmin && (
            <>
              {['dashboard', 'adminUsers', 'adminScholarships'].includes(page) && (
                <AdminPortal api={api} done={done} fail={setError} activeTab={page} />
              )}
              {page === 'notifications' && (
                <NotificationsView api={api} fail={setError} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Visually Integrated AI Chatbot (Part 3) */}
      <IntegratedChatbot user={user} api={api} />
    </div>
  );
}
