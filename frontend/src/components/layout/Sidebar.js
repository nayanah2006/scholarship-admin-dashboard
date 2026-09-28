import React from 'react';
import {
  LayoutDashboard,
  User,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  FileText,
  Bookmark,
  Bell,
  Building2,
  FileCheck,
  BarChart3,
  Lightbulb,
  Users,
  X
} from 'lucide-react';

export function Sidebar({ user, activePage, onPage, mobileOpen, onCloseMobile }) {
  const studentNav = [
    { key: 'dashboard', label: 'Student Dashboard', icon: LayoutDashboard, section: 'Overview' },
    { key: 'profile', label: 'My Profile', icon: User, section: 'Account' },
    { key: 'scholarships', label: 'Scholarship Catalog', icon: GraduationCap, section: 'Discovery' },
    { key: 'recommendations', label: 'Recommendations', icon: CheckCircle2, section: 'Discovery' },
    { key: 'eligibility', label: 'AI Eligibility Checker', icon: Sparkles, section: 'Discovery' },
    { key: 'applications', label: 'My Applications', icon: FileText, section: 'Applications' },
    { key: 'saved', label: 'Saved Scholarships', icon: Bookmark, section: 'Applications' },
    { key: 'notifications', label: 'Notifications', icon: Bell, section: 'Updates' }
  ];

  const institutionNav = [
    { key: 'dashboard', label: 'Institution Overview', icon: LayoutDashboard, section: 'Overview' },
    { key: 'institution', label: 'Verification Queue', icon: Building2, section: 'Verification' },
    { key: 'notifications', label: 'Notifications', icon: Bell, section: 'Updates' }
  ];

  const governmentNav = [
    { key: 'dashboard', label: 'Overview & KPIs', icon: LayoutDashboard, section: 'Analytics' },
    { key: 'govtAnalytics', label: 'District Analytics', icon: BarChart3, section: 'Analytics' },
    { key: 'govtApplications', label: 'Application Review', icon: FileCheck, section: 'Decisions' },
    { key: 'govtInsights', label: 'AI District Insights', icon: Lightbulb, section: 'Intelligence' },
    { key: 'notifications', label: 'Notifications', icon: Bell, section: 'Updates' }
  ];

  const adminNav = [
    { key: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, section: 'Overview' },
    { key: 'adminUsers', label: 'User Management', icon: Users, section: 'Management' },
    { key: 'adminScholarships', label: 'Scholarship Catalog', icon: GraduationCap, section: 'Management' },
    { key: 'notifications', label: 'Notifications', icon: Bell, section: 'Updates' }
  ];

  const navItems =
    user.role === 'STUDENT'
      ? studentNav
      : user.role === 'INSTITUTION'
      ? institutionNav
      : user.role === 'GOVERNMENT'
      ? governmentNav
      : adminNav;

  const content = (
    <div className="flex h-full flex-col justify-between py-4">
      <div>
        <div className="mb-4 px-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {user.role.toLowerCase()} navigation
          </p>
          {onCloseMobile && (
            <button onClick={onCloseMobile} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 md:hidden">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="space-y-1 px-2" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onPage(item.key);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-700 text-white shadow-sm shadow-indigo-700/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  size={17}
                  className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-600">Karnataka Portal v2.5</p>
        <p className="mt-0.5">DB Connected • Live</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block min-h-[calc(100vh-65px)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-white shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
