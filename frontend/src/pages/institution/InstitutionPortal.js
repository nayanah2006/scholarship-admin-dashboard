import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Card,
  KpiCard,
  Button,
  StatusBadge,
  Modal,
  LoadingState,
  EmptyState,
  ErrorState,
  money
} from '../../components/ui/DesignSystem';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function InstitutionPortal({ user, api, done, fail }) {
  const [applications, setApplications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [docModal, setDocModal] = useState(null); // Document for individual action
  const [docRemarks, setDocRemarks] = useState('');

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await api('/api/institution/applications');
      setApplications(data);
    } catch (err) {
      fail(err.message || 'Failed to load institution applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const openDetails = async (id) => {
    setLoadingDetail(true);
    try {
      const app = await api(`/api/applications/${id}`);
      setSelectedApp(app);
      setActionRemarks('');
      setHistoryOpen(false);
    } catch (err) {
      fail(err.message || 'Failed to fetch application details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApplicationDecision = async (decision) => {
    if (!selectedApp) return;
    setDeciding(true);
    try {
      await api(`/api/institution/applications/${selectedApp.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          remarks: actionRemarks.trim() || undefined
        })
      });

      done(`Application ${selectedApp.public_id} marked ${decision.toLowerCase().replace(/_/g, ' ')}.`);
      setSelectedApp(null);
      loadApplications();
    } catch (err) {
      fail(err.message || `Failed to record ${decision} decision.`);
    } finally {
      setDeciding(false);
    }
  };

  const handleDocumentDecision = async (documentId, decision) => {
    try {
      await api(`/api/institution/documents/${documentId}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          remarks: docRemarks.trim() || undefined
        })
      });

      done(`Document decision recorded: ${decision.toLowerCase().replace(/_/g, ' ')}.`);
      setDocModal(null);
      setDocRemarks('');
      // Refresh current application details
      if (selectedApp) {
        openDetails(selectedApp.id);
      }
    } catch (err) {
      fail(err.message || 'Failed to update document status.');
    }
  };

  // Summary Metrics for Institution
  const metrics = useMemo(() => {
    if (!applications) return { pending: 0, docPending: 0, verified: 0, rejected: 0 };
    return {
      pending: applications.filter((a) => a.status === 'INSTITUTION_VERIFICATION').length,
      docPending: applications.filter((a) => a.status === 'DOCUMENT_VERIFICATION').length,
      correction: applications.filter((a) => a.status === 'CORRECTION_REQUIRED').length,
      total: applications.length
    };
  }, [applications]);

  const filteredApps = useMemo(() => {
    if (!applications) return [];
    return applications.filter((a) => {
      const matchSearch =
        !search ||
        a.student_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.public_id?.toLowerCase().includes(search.toLowerCase()) ||
        a.scholarship_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.email?.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [applications, search, statusFilter]);

  if (loading && !applications) {
    return <LoadingState message="Loading institution verification queue…" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">Institution Verification Queue</h1>
            <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-bold text-teal-700">
              {metrics.total} In Queue
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Verify student enrollment, course credentials, academic marks, and uploaded certification documents.
          </p>
        </div>

        <Button onClick={loadApplications} variant="outline" size="sm" icon={RefreshCw}>
          Refresh Queue
        </Button>
      </div>

      {/* Summary KPI Cards (Part 4) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Pending Verification"
          value={metrics.pending}
          subtitle="Awaiting initial institution review"
          icon={Clock}
          variant="amber"
        />
        <KpiCard
          title="Document Verification"
          value={metrics.docPending}
          subtitle="Forwarded for document scrutiny"
          icon={FileCheck}
          variant="indigo"
        />
        <KpiCard
          title="Correction Required"
          value={metrics.correction}
          subtitle="Returned to student for updates"
          icon={AlertTriangle}
          variant="rose"
        />
        <KpiCard
          title="Total In Queue"
          value={metrics.total}
          subtitle="Assigned to your institution"
          icon={Building2}
          variant="teal"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, application ID, or scholarship scheme…"
            className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <option value="ALL">All Application Stages</option>
          <option value="INSTITUTION_VERIFICATION">Institution Verification</option>
          <option value="DOCUMENT_VERIFICATION">Document Verification</option>
          <option value="CORRECTION_REQUIRED">Correction Required</option>
        </select>
      </div>

      {/* Applications Table / Cards */}
      <Card
        title="Student Applications Pending Review"
        subtitle="Click an application to inspect documents and record your official verification decision"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Application ID</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Scholarship Scheme</th>
                <th className="p-3">Current Status</th>
                <th className="p-3">Updated Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length > 0 ? (
                filteredApps.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{a.public_id}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{a.student_name}</p>
                      <p className="text-[11px] text-slate-500">{a.email}</p>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{a.scholarship_name}</td>
                    <td className="p-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="p-3 text-slate-500">
                      {String(a.updated_at || a.created_at).replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        onClick={() => openDetails(a.id)}
                        variant="primary"
                        size="sm"
                        icon={Eye}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No applications matched your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detailed Application Inspection Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title={selectedApp ? `Review Application: ${selectedApp.public_id}` : ''}
        subtitle={selectedApp ? `${selectedApp.student_name} (${selectedApp.student_email})` : ''}
        maxWidth="max-w-3xl"
        footer={
          selectedApp && (
            <div className="flex w-full items-center justify-between">
              <Button onClick={() => setSelectedApp(null)} variant="secondary" size="sm">
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApplicationDecision('REJECTED')}
                  variant="danger"
                  size="sm"
                  loading={deciding}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleApplicationDecision('CORRECTION_REQUIRED')}
                  variant="outline"
                  size="sm"
                  className="text-amber-800 border-amber-300 hover:bg-amber-50"
                  loading={deciding}
                >
                  Request Correction
                </Button>
                <Button
                  onClick={() => handleApplicationDecision('VERIFIED')}
                  variant="success"
                  size="sm"
                  icon={CheckCircle2}
                  loading={deciding}
                >
                  Verify Application
                </Button>
              </div>
            </div>
          )
        }
      >
        {selectedApp && (
          <div className="space-y-5">
            {/* Meta Card */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Scholarship Scheme</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedApp.scholarship_name}</p>
                <p className="text-indigo-700 font-bold">{money(selectedApp.amount)}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-[10px] font-semibold">Current Workflow Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedApp.status} size="md" />
                </div>
              </div>
            </div>

            {/* Document Verification Section (Part 4) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Uploaded Verification Documents ({selectedApp.documents?.length || 0})
                </h4>
                <span className="text-[11px] text-slate-500">Inspect before final endorsement</span>
              </div>

              {selectedApp.documents && selectedApp.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedApp.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{doc.document_type}</span>
                            <StatusBadge status={doc.status} />
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {doc.original_name} • {Math.round(doc.file_size / 1024)} KB
                          </p>
                          {doc.verification_remarks && (
                            <p className="text-amber-800 text-[11px] mt-1 font-medium">
                              Verifier remark: {doc.verification_remarks}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`${API}/api/documents/${doc.id}/download?inline=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <Eye size={12} /> View
                          </a>
                          <Button
                            onClick={() => {
                              setDocModal(doc);
                              setDocRemarks(doc.verification_remarks || '');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Action
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No documents uploaded for this application.</p>
              )}
            </div>

            {/* Verification Remarks Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Institution Verification Remarks (Optional for approval, mandatory for correction/rejection)
              </label>
              <textarea
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="Enter remarks regarding student enrollment, course details, or correction instructions…"
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* Expandable History Trail */}
            <div>
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline"
              >
                <span>Status History & Audit Logs</span>
                {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {historyOpen && selectedApp.history && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 p-3 bg-slate-50/50 text-xs">
                  {selectedApp.history.map((h) => (
                    <div key={h.id} className="border-b border-slate-200/50 pb-1.5 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={h.status} />
                        <span className="text-[10px] text-slate-400">
                          {String(h.created_at).replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-700">{h.remarks || 'Status updated.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Individual Document Decision Modal */}
      <Modal
        isOpen={Boolean(docModal)}
        onClose={() => setDocModal(null)}
        title={docModal ? `Verify Document: ${docModal.document_type}` : ''}
        subtitle={docModal ? docModal.original_name : ''}
        maxWidth="max-w-md"
      >
        {docModal && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Document Remarks
              </label>
              <input
                type="text"
                value={docRemarks}
                onChange={(e) => setDocRemarks(e.target.value)}
                placeholder="e.g., Valid mark sheet; Seal clearly visible; Needs signature"
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <Button
                onClick={() => handleDocumentDecision(docModal.id, 'VERIFIED')}
                variant="success"
                size="sm"
                icon={CheckCircle2}
              >
                Mark Document as Verified
              </Button>
              <Button
                onClick={() => handleDocumentDecision(docModal.id, 'REUPLOAD_REQUIRED')}
                variant="outline"
                size="sm"
                className="text-amber-800 border-amber-300 hover:bg-amber-50"
              >
                Request Re-upload (Blurry/Incomplete)
              </Button>
              <Button
                onClick={() => handleDocumentDecision(docModal.id, 'REJECTED')}
                variant="danger"
                size="sm"
                icon={XCircle}
              >
                Reject Document (Invalid)
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
