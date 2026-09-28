import React from 'react';
import {
  GraduationCap,
  Bell,
  User,
  LogOut,
  Shield,
  Menu,
  Building2,
  CheckCircle
} from 'lucide-react';

export function Navbar({ user, onLogout, onPage, activePage, toggleMobileMenu }) {
  const roleDisplay = {
    STUDENT: { label: 'Student Portal', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: GraduationCap },
    INSTITUTION: { label: 'Institution Portal', badge: 'bg-teal-50 text-teal-700 border-teal-200', icon: Building2 },
    GOVERNMENT: { label: 'Government Officer', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Shield },
    ADMIN: { label: 'System Admin', badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: Shield }
  };

  const currentRole = roleDisplay[user.role] || { label: user.role, badge: 'bg-slate-100 text-slate-700', icon: Shield };
  const RoleIcon = currentRole.icon;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileMenu}
            aria-label="Open mobile menu"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={() => onPage('dashboard')}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-800 to-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900">ScholarPath</span>
                <span className="hidden sm:inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                  Govt of Karnataka
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Unified State & National Scholarship Portal</p>
            </div>
          </button>
        </div>

        {/* User Role Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Role Pill */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${currentRole.badge}`}>
            <RoleIcon size={13} />
            <span>{currentRole.label}</span>
          </div>

          {/* Notifications */}
          <button
            onClick={() => onPage('notifications')}
            aria-label="View notifications"
            className={`relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors ${
              activePage === 'notifications' ? 'bg-indigo-50 text-indigo-700' : ''
            }`}
          >
            <Bell size={18} />
          </button>

          {/* User profile identifier */}
          <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left text-xs">
              <p className="font-semibold text-slate-800 max-w-[130px] truncate">{user.fullName}</p>
              <p className="text-slate-500">{user.role.toLowerCase()}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            aria-label="Log out"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors shadow-sm"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
