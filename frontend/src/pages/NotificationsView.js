import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, Eye, Trash2 } from 'lucide-react';
import { Card, Button, StatusBadge, LoadingState, EmptyState } from '../components/ui/DesignSystem';

export function NotificationsView({ api, fail }) {
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api('/api/notifications');
      setNotifications(data || []);
    } catch (err) {
      fail(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      fail('Failed to update notification status.');
    }
  };

  if (loading && !notifications) {
    return <LoadingState message="Loading your portal notifications…" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Portal Notifications</h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time updates regarding application submissions, verification progress, and decision remarks.
          </p>
        </div>
        <Button onClick={loadNotifications} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 shadow-sm transition-all ${
                n.is_read
                  ? 'border-slate-200 bg-white text-slate-700'
                  : 'border-indigo-200 bg-indigo-50/40 text-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">{n.title}</h3>
                    {!n.is_read && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  {(n.scholarship_name || n.application_public_id) && (
                    <p className="text-[11px] text-slate-400 font-medium">
                      {n.scholarship_name} • Application: {n.application_public_id}
                    </p>
                  )}
                  <span className="text-[10px] text-slate-400 block pt-1">
                    {String(n.created_at).replace('T', ' ').slice(0, 16)}
                  </span>
                </div>

                {!n.is_read && (
                  <Button
                    onClick={() => markAsRead(n.id)}
                    variant="ghost"
                    size="sm"
                    className="text-indigo-700 shrink-0"
                  >
                    Mark as read
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications"
            message="You have no unread updates at this moment."
          />
        )}
      </div>
    </div>
  );
}
