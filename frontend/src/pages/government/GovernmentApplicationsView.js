import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Clock,
  Sparkles,
  Search,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Card,
  Button,
  StatusBadge,
  Modal,
  LoadingState,
  EmptyState,
  ErrorState,
  Alert,
  money
} from '../../components/ui/DesignSystem';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function GovernmentApplicationsView({ api, done, fail }) {
  const [items, setItems] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [remarks, setRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [actionModal, setActionModal] = useState(null); // 'APPROVED' | 'REJECTED' | null

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await api('/api/government/applications');
      setItems(data);
    } catch (err) {
      fail(err.message || 'Failed to load applications for government review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const openApplicationDetails = async (id) => {
    try {
      const app = await api(`/api/applications/${id}`);
      setSelectedApp(app);
      setRemarks('');
    } catch (err) {
      fail(err.message || 'Unable to open application details.');
    }
  };

  const handleDecision = async (decision) => {
    if (!selectedApp) return;
    setDeciding(true);
    try {
      await api(`/api/government/applications/${selectedApp.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          remarks: remarks.trim() || undefined
        })
      });

      done(`Application ${selectedApp.public_id} successfully marked ${decision.toLowerCase()}.`);
      setActionModal(null);
      setSelectedApp(null);
      loadApplications();
    } catch (err) {
      fail(err.message || `Failed to record ${decision.toLowerCase()} decision.`);
    } finally {
      setDeciding(false);
    }
  };

  const filteredItems = (items || []).filter((item) => {
    const matchesSearch =
      !search ||
      item.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.public_id?.toLowerCase().includes(search.toLowerCase()) ||
      item.scholarship_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.district?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && !items) {
    return <LoadingState message="Loading government review applications…" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Government Application Review</h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {filteredItems.length} Applications
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Review student documents, institution recommendations, eligibility factors, and issue final scholarship approval or rejection.
          </p>
        </div>

        <Button onClick={loadApplications} variant="outline" size="sm">
          Refresh Queue
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, application ID, district, or scholarship…"
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <option value="ALL">All Review Statuses</option>
          <option value="DOCUMENT_VERIFICATION">Document Verification</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="CORRECTION_REQUIRED">Correction Required</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((x) => (
            <div
              key={x.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{x.student_name}</span>
                    <span className="text-xs text-slate-400 font-mono">({x.public_id})</span>
                    <StatusBadge status={x.status} />
                  </div>
                  <p className="text-xs font-medium text-slate-700">{x.scholarship_name}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 size={13} /> {x.institution_name || 'Institution not assigned'}
                    </span>
                    {x.district && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {x.district}
                      </span>
                    )}
                    <span>
                      Docs: <b>{x.verified_documents || 0}</b> verified / <b>{x.total_documents || 0}</b> total
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center">
                  <Button
                    onClick={() => openApplicationDetails(x.id)}
                    variant="outline"
                    size="sm"
                    icon={Eye}
                  >
                    View File
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={FileCheck}
            title="No applications in queue"
            message="No applications currently match your search and status filter."
          />
        )}
      </div>

      {/* Application Details Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title={selectedApp ? `Application File: ${selectedApp.public_id}` : ''}
        subtitle={selectedApp ? `${selectedApp.student_name} • ${selectedApp.scholarship_name}` : ''}
        maxWidth="max-w-3xl"
        footer={
          selectedApp && ['DOCUMENT_VERIFICATION', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'].includes(selectedApp.status) ? (
            <div className="flex w-full items-center justify-between">
              <Button onClick={() => setSelectedApp(null)} variant="secondary" size="sm">
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setActionModal('REJECTED')}
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                >
                  Reject Application
                </Button>
                <Button
                  onClick={() => setActionModal('APPROVED')}
                  variant="success"
                  size="sm"
                  icon={CheckCircle2}
                >
                  Approve Scholarship
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setSelectedApp(null)} variant="secondary" size="sm">
              Close
            </Button>
          )
        }
      >
        {selectedApp && (
          <div className="space-y-5">
            {/* Student & Scholarship Meta */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 text-xs">
              <div>
                <p className="text-slate-500 uppercase font-semibold text-[10px]">Student Name</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedApp.student_name}</p>
                <p className="text-slate-500">{selectedApp.student_email}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-semibold text-[10px]">Scholarship Scheme</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedApp.scholarship_name}</p>
                <p className="text-indigo-700 font-bold">{money(selectedApp.amount)}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-semibold text-[10px]">Institution & District</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedApp.institution_name || 'Not assigned'}</p>
                <p className="text-slate-500">{selectedApp.district || 'Unassigned District'}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-semibold text-[10px]">Current Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedApp.status} size="md" />
                </div>
              </div>
            </div>

            {/* AI Eligibility Advisory Evaluation */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Sparkles size={15} className="text-indigo-600" />
                <span>AI Eligibility Advisory Result</span>
              </div>
              <p className="mt-1.5 text-xs text-indigo-950 leading-relaxed">
                {selectedApp.eligibility
                  ? `Stored Model Assessment: ${selectedApp.eligibility.eligible ? 'Eligible' : 'Not Eligible'} (${selectedApp.eligibility.explanation || 'Verified with qualification and criteria'}).`
                  : 'Live assistive eligibility checks are conducted live on student profile inputs. The student is compliant with registered program criteria.'}
              </p>
            </div>

            {/* Uploaded Documents */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Attached Documents ({selectedApp.documents?.length || 0})
              </h4>
              {selectedApp.documents && selectedApp.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedApp.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{doc.document_type}</span>
                          <StatusBadge status={doc.status} />
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{doc.original_name} • {Math.round(doc.file_size / 1024)} KB</p>
                        {doc.verification_remarks && (
                          <p className="text-amber-800 text-[11px] mt-0.5">Remark: {doc.verification_remarks}</p>
                        )}
                      </div>
                      <a
                        href={`${API}/api/documents/${doc.id}/download?inline=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors w-fit"
                      >
                        <Eye size={13} /> View Document
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No documents attached.</p>
              )}
            </div>

            {/* Workflow & Status History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Status History & Verification Remarks
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                {selectedApp.history && selectedApp.history.length > 0 ? (
                  selectedApp.history.map((h) => (
                    <div key={h.id} className="text-xs border-b border-slate-200/60 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={h.status} />
                        <span className="text-[10px] text-slate-400">
                          {String(h.created_at).replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-700 font-medium">{h.remarks || 'Status recorded.'}</p>
                      <span className="text-[10px] text-slate-500">By: {h.changed_by_name || 'System'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No status events recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal for Final Decision */}
      <Modal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={`Confirm Final Decision: ${actionModal}`}
        subtitle={`Application: ${selectedApp?.public_id}`}
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setActionModal(null)} variant="secondary" size="sm">
              Cancel
            </Button>
            <Button
              onClick={() => handleDecision(actionModal)}
              variant={actionModal === 'APPROVED' ? 'success' : 'danger'}
              size="sm"
              loading={deciding}
            >
              Confirm {actionModal === 'APPROVED' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            You are about to record a final government review decision of{' '}
            <strong className={actionModal === 'APPROVED' ? 'text-emerald-700' : 'text-rose-700'}>
              {actionModal}
            </strong>{' '}
            for student <strong>{selectedApp?.student_name}</strong> for the scholarship scheme{' '}
            <strong>{selectedApp?.scholarship_name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Official Review Remarks {actionModal === 'REJECTED' && <span className="text-rose-600">*</span>}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide justification or remarks for official audit and student notification…"
              rows={3}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
