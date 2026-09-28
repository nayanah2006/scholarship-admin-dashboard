import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  AlertTriangle,
  Info,
  Loader2,
  X
} from 'lucide-react';

/**
 * Currency formatter for Indian Rupees (INR)
 */
export const money = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

/**
 * Format large INR currency values compactly (e.g. ₹12.5 Lakhs / ₹1.2 Cr)
 */
export const compactMoney = (value) => {
  const num = Number(value || 0);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return money(num);
};

/**
 * Standard Status Badge Component
 * Accessible: Includes icon AND text so status is not conveyed by color alone.
 */
export function StatusBadge({ status, size = 'sm' }) {
  const s = String(status || '').toUpperCase();
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  switch (s) {
    case 'APPROVED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <CheckCircle2 size={size === 'sm' ? 12 : 14} className="text-emerald-600" aria-hidden="true" />
          <span>Approved</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          <XCircle size={size === 'sm' ? 12 : 14} className="text-rose-600" aria-hidden="true" />
          <span>Rejected</span>
        </span>
      );
    case 'INSTITUTION_VERIFICATION':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          <Clock size={size === 'sm' ? 12 : 14} className="text-amber-600" aria-hidden="true" />
          <span>Institution Verification</span>
        </span>
      );
    case 'DOCUMENT_VERIFICATION':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
          <FileText size={size === 'sm' ? 12 : 14} className="text-indigo-600" aria-hidden="true" />
          <span>Document Verification</span>
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <Clock size={size === 'sm' ? 12 : 14} className="text-blue-600" aria-hidden="true" />
          <span>Under Review</span>
        </span>
      );
    case 'CORRECTION_REQUIRED':
    case 'REUPLOAD_REQUIRED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-orange-50 text-orange-700 border border-orange-200 ${sizeClasses}`}>
          <AlertTriangle size={size === 'sm' ? 12 : 14} className="text-orange-600" aria-hidden="true" />
          <span>Correction Required</span>
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
          <Clock size={size === 'sm' ? 12 : 14} className="text-purple-600" aria-hidden="true" />
          <span>Submitted</span>
        </span>
      );
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <CheckCircle2 size={size === 'sm' ? 12 : 14} className="text-emerald-600" aria-hidden="true" />
          <span>Verified</span>
        </span>
      );
    case 'PENDING':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          <Clock size={size === 'sm' ? 12 : 14} className="text-amber-600" aria-hidden="true" />
          <span>Pending</span>
        </span>
      );
    case 'DRAFT':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <FileText size={size === 'sm' ? 12 : 14} className="text-slate-500" aria-hidden="true" />
          <span>Draft</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <span>{s.replace(/_/g, ' ')}</span>
        </span>
      );
  }
}

/**
 * Standard Card Component
 */
export function Card({ children, className = '', title, subtitle, action, footer }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 rounded-b-xl">{footer}</div>}
    </section>
  );
}

/**
 * KPI Metric Tile for Officer Dashboard
 */
export function KpiCard({ title, value, subtitle, icon: Icon, badge, variant = 'indigo' }) {
  const variantStyles = {
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      accent: 'border-l-4 border-l-indigo-600'
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      accent: 'border-l-4 border-l-emerald-600'
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-700 border-rose-100',
      accent: 'border-l-4 border-l-rose-600'
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-700 border-amber-100',
      accent: 'border-l-4 border-l-amber-500'
    },
    teal: {
      iconBg: 'bg-teal-50 text-teal-700 border-teal-100',
      accent: 'border-l-4 border-l-teal-600'
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-700 border-purple-100',
      accent: 'border-l-4 border-l-purple-600'
    }
  };

  const style = variantStyles[variant] || variantStyles.indigo;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md ${style.accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{value}</p>
        </div>
        {Icon && (
          <div className={`rounded-xl border p-2.5 ${style.iconBg}`} aria-hidden="true">
            <Icon size={22} />
          </div>
        )}
      </div>
      {(subtitle || badge) && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
          {badge && <span className="font-semibold">{badge}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Standard Accessible Button Component
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-indigo-700 text-white hover:bg-indigo-800 focus-visible:ring-indigo-600 shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-500',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-indigo-600 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400'
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
          <span>Loading…</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * Standard Alert Component
 */
export function Alert({ message, type = 'error', onClose, className = '' }) {
  if (!message) return null;

  const typeConfig = {
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: XCircle,
      iconColor: 'text-rose-600'
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-600'
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: Info,
      iconColor: 'text-blue-600'
    }
  };

  const config = typeConfig[type] || typeConfig.error;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`mb-4 flex items-start justify-between rounded-xl border p-4 text-sm shadow-sm ${config.bg} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className={`shrink-0 mt-0.5 ${config.iconColor}`} aria-hidden="true" />
        <span className="font-medium leading-relaxed">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close alert"
          className="ml-3 shrink-0 rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-black/5"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Standard Modal Component with keyboard and accessibility support
 */
export function Modal({ isOpen, onClose, title, subtitle, children, footer, maxWidth = 'max-w-2xl' }) {
  React.useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`w-full ${maxWidth} rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 rounded-b-2xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Form Input with Label, Hint, and Error Support
 */
export function InputField({ label, name, type = 'text', value, onChange, placeholder, required = false, hint, error, ...props }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
          error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
        {...props}
      />
      {hint && !error && <small className="mt-1 block text-xs text-slate-500">{hint}</small>}
      {error && <small className="mt-1 block text-xs font-medium text-rose-600">{error}</small>}
    </div>
  );
}

/**
 * Form Select Dropdown
 */
export function SelectField({ label, name, value, onChange, options = [], required = false, hint, ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        {...props}
      >
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lbl = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      {hint && <small className="mt-1 block text-xs text-slate-500">{hint}</small>}
    </div>
  );
}

/**
 * Loading State Indicator
 */
export function LoadingState({ message = 'Loading scholarship data…' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-700" />
      <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

/**
 * Empty State Indicator
 */
export function EmptyState({ icon: Icon = FileText, title = 'No records found', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <div className="rounded-2xl bg-indigo-50 p-3.5 text-indigo-700">
        <Icon size={28} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Error State Indicator with Retry Action
 */
export function ErrorState({ message = 'Unable to load data.', onRetry }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center">
      <div className="mx-auto inline-flex rounded-full bg-rose-100 p-3 text-rose-600">
        <AlertCircle size={28} />
      </div>
      <h3 className="mt-3 text-base font-bold text-rose-900">Data Retrieval Error</h3>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 border-rose-300 text-rose-800 hover:bg-rose-100">
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Profile Completion Progress Bar
 */
export function ProgressBar({ percent = 0, label = 'Profile Completion', showWarning = true }) {
  const p = Math.min(100, Math.max(0, Number(percent || 0)));
  const isGood = p >= 80;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
        <span>{label}</span>
        <span className={`font-bold ${isGood ? 'text-emerald-700' : 'text-amber-700'}`}>{p}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isGood ? 'bg-emerald-600' : 'bg-amber-500'}`}
          style={{ width: `${p}%` }}
          role="progressbar"
          aria-valuenow={p}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
      {!isGood && showWarning && (
        <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1">
          <AlertCircle size={12} /> Complete at least 80% to be eligible to apply for scholarships.
        </p>
      )}
    </div>
  );
}
