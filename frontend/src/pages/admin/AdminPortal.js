import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
  Search,
  IndianRupee,
  Layers
} from 'lucide-react';
import {
  Card,
  KpiCard,
  Button,
  StatusBadge,
  InputField,
  SelectField,
  LoadingState,
  EmptyState,
  money
} from '../../components/ui/DesignSystem';

export function AdminPortal({ api, done, fail, activeTab = 'dashboard' }) {
  const [analytics, setAnalytics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');

  // New scholarship form
  const [form, setForm] = useState({
    name: '',
    provider: '',
    description: '',
    type: 'Merit-cum-Means',
    amount: '',
    category: '',
    course: '',
    state: 'Karnataka',
    startDate: '',
    endDate: '',
    status: 'active'
  });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stats, users] = await Promise.all([
        api('/api/admin/analytics').catch(() => null),
        api('/api/admin/users').catch(() => [])
      ]);
      setAnalytics(stats);
      setUsersList(users);
    } catch (err) {
      fail(err.message || 'Failed to load administration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      done('User account status updated.');
      const updated = await api('/api/admin/users');
      setUsersList(updated);
    } catch (err) {
      fail('Failed to update user status.');
    }
  };

  const handleCreateScholarship = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api('/api/admin/scholarships', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      done('New scholarship scheme successfully added to catalog.');
      setForm({
        name: '',
        provider: '',
        description: '',
        type: 'Merit-cum-Means',
        amount: '',
        category: '',
        course: '',
        state: 'Karnataka',
        startDate: '',
        endDate: '',
        status: 'active'
      });
    } catch (err) {
      fail(err.message || 'Failed to create scholarship.');
    } finally {
      setCreating(false);
    }
  };

  if (loading && !analytics) {
    return <LoadingState message="Loading administration dashboard…" />;
  }

  const stats = analytics?.stats || {};
  const filteredUsers = usersList.filter(
    (u) => roleFilter === 'ALL' || u.role === roleFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Administration Portal</h1>
          <p className="mt-1 text-xs text-slate-500">
            System administration, user access authorization, and catalog governance.
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Students Registered"
              value={stats.students || 0}
              icon={Users}
              variant="indigo"
            />
            <KpiCard
              title="Institutions"
              value={stats.institutions || 0}
              icon={Building2}
              variant="teal"
            />
            <KpiCard
              title="Active Scholarships"
              value={stats.scholarships || 0}
              icon={GraduationCap}
              variant="emerald"
            />
            <KpiCard
              title="Total Applications"
              value={stats.applications || 0}
              icon={FileText}
              variant="purple"
            />
          </div>

          <Card title="Applications by Top Scholarships">
            <div className="space-y-2">
              {analytics?.byScholarship?.map((s) => (
                <div key={s.name} className="flex items-center justify-between border-b border-slate-100 py-2 text-xs">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className="font-bold text-indigo-700">{s.applications} applications</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {activeTab === 'adminUsers' && (
        <Card
          title="User Account Management"
          subtitle="Activate, suspend, or audit portal user roles"
          action={
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
            >
              <option value="ALL">All Roles ({usersList.length})</option>
              <option value="STUDENT">Students</option>
              <option value="INSTITUTION">Institutions</option>
              <option value="ADMIN">Admins</option>
              <option value="GOVERNMENT">Government</option>
            </select>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                        className={`font-semibold hover:underline ${
                          u.is_active ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'adminScholarships' && (
        <Card
          title="Create New Scholarship Scheme"
          subtitle="Add an authentic scholarship scheme to the public catalog"
        >
          <form onSubmit={handleCreateScholarship} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InputField
                label="Scheme Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <InputField
                label="Awarding Department / Provider"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                required
              />
              <InputField
                label="Scholarship Amount (₹)"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
              <InputField
                label="Target Community / Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. SC, ST, OBC, General"
              />
              <InputField
                label="Eligible Course"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                placeholder="e.g. Technical Degree, Pre-Matric"
              />
              <InputField
                label="State / Jurisdiction"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
              <InputField
                label="Application Start Date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
              <InputField
                label="Application Deadline"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Scheme Description & Eligibility Summary *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <Button type="submit" variant="primary" loading={creating} icon={PlusCircle}>
              Publish Scholarship Scheme
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
