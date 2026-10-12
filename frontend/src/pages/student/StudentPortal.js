import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Bookmark,
  Calendar,
  AlertCircle,
  Eye,
  Search,
  Upload,
  User,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Building2
} from 'lucide-react';
import {
  Card,
  KpiCard,
  Button,
  StatusBadge,
  Modal,
  ProgressBar,
  InputField,
  SelectField,
  LoadingState,
  EmptyState,
  ErrorState,
  money
} from '../../components/ui/DesignSystem';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const PROFILE_COMPLETION_FIELDS = ['fullName', 'phone', 'dateOfBirth', 'gender', 'community', 'annualIncome', 'state', 'institutionName', 'qualification', 'course', 'percentage', 'graduationYear'];

function isProfileFieldComplete(profile, field) {
  const value = profile?.[field];
  if (value == null || String(value).trim() === '') return false;
  if (field === 'annualIncome') return Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100000000;
  if (field === 'percentage') return Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
  if (field === 'graduationYear') return Number.isInteger(Number(value)) && Number(value) >= 1900 && Number(value) <= 2200;
  return true;
}

export function StudentPortal({ user, api, done, fail, onPage, activeTab = 'dashboard' }) {
  // Tabs: 'dashboard' | 'scholarships' | 'profile' | 'applications' | 'saved' | 'recommendations' | 'eligibility'
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [savedScholarships, setSavedScholarships] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply modal
  const [applyingScholarship, setApplyingScholarship] = useState(null);
  const [createdApp, setCreatedApp] = useState(null);
  const [docType, setDocType] = useState('Income Certificate');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Application detail modal
  const [selectedApp, setSelectedApp] = useState(null);

  // AI eligibility state
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Search in catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Load initial student data
  const loadData = async () => {
    setLoading(true);
    try {
      const [prof, apps, recs, saved] = await Promise.all([
        api('/api/profile').catch(() => null),
        api('/api/applications').catch(() => []),
        api('/api/recommendations').catch(() => []),
        api('/api/saved-scholarships').catch(() => [])
      ]);

      setProfile(prof || {});
      setApplications(apps || []);
      setRecommendations(recs || []);
      setSavedScholarships(saved || []);
    } catch (err) {
      console.error('Error loading student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load scholarships catalog
  const loadScholarships = async () => {
    try {
      const res = await api(`/api/scholarships?limit=50&q=${encodeURIComponent(searchQuery)}`);
      setScholarships(res?.items || []);
    } catch (err) {
      fail(err.message || 'Failed to fetch scholarships catalog.');
    }
  };

  useEffect(() => {
    if (activeTab === 'scholarships' || activeTab === 'dashboard') {
      loadScholarships();
    }
  }, [activeTab, searchQuery]);

  // Handle Save Scholarship
  const handleSaveScholarship = async (schId) => {
    try {
      await api(`/api/scholarships/${schId}/save`, { method: 'POST' });
      done('Scholarship bookmarked to your saved list.');
      const updatedSaved = await api('/api/saved-scholarships');
      setSavedScholarships(updatedSaved || []);
    } catch (err) {
      fail(err.message || 'Unable to save scholarship.');
    }
  };

  // Handle Apply Initiation
  const startApply = async (sch) => {
    if ((profile?.profileCompletion || 0) < 80) {
      fail('Please complete your profile to at least 80% before submitting applications.');
      onPage('profile');
      return;
    }

    setApplyingScholarship(sch);
    setCreatedApp(null);
    setSelectedFiles([]);

    try {
      const res = await api('/api/applications', {
        method: 'POST',
        body: JSON.stringify({ scholarshipId: sch.id })
      });
      setCreatedApp(res);
      done(`Application draft ${res.publicId} created. Please upload required documents.`);
    } catch (err) {
      fail(err.message || 'Failed to initiate application.');
      setApplyingScholarship(null);
    }
  };

  // Upload Document
  const handleUploadDocument = async () => {
    if (!createdApp || !selectedFiles.length) {
      fail('Select at least one document file to upload.');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('documentType', docType);
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      await api(`/api/applications/${createdApp.id}/documents`, {
        method: 'POST',
        body: formData
      });
      done('Document uploaded successfully.');
      setSelectedFiles([]);
    } catch (err) {
      fail(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  // Submit Application
  const handleSubmitApplication = async () => {
    if (!createdApp) return;
    setSubmitting(true);
    try {
      await api(`/api/applications/${createdApp.id}/submit`, { method: 'POST' });
      done(`Application ${createdApp.publicId} successfully submitted for verification!`);
      setApplyingScholarship(null);
      setCreatedApp(null);
      loadData();
    } catch (err) {
      fail(err.message || 'Submission failed. Please ensure at least one document is uploaded.');
    } finally {
      setSubmitting(false);
    }
  };

  // AI Eligibility Check
  const runAiEligibilityCheck = async () => {
    setAiChecking(true);
    try {
      const res = await api('/api/eligibility', { method: 'POST' });
      setAiResult(res);
      done('AI Eligibility evaluation generated.');
    } catch (err) {
      fail(err.message || 'AI Eligibility service is currently unavailable.');
    } finally {
      setAiChecking(false);
    }
  };

  // Save Profile Form
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      });
      done('Student profile updated successfully.');
      loadData();
    } catch (err) {
      fail(err.message || 'Failed to update profile.');
    }
  };

  if (loading && !profile) {
    return <LoadingState message="Loading your student profile and scholarships…" />;
  }

  const profilePercent = Math.round(
    (PROFILE_COMPLETION_FIELDS.filter((field) => isProfileFieldComplete(profile, field)).length /
      PROFILE_COMPLETION_FIELDS.length) * 100
  );
  const activeApps = applications.filter((a) => !['APPROVED', 'REJECTED'].includes(a.status));
  const approvedApps = applications.filter((a) => a.status === 'APPROVED');
  const applicationsSection = (
    <Card
      title="My Applications"
      subtitle="Track document verification, institution approvals, and government review stages"
    >
      {applications.length > 0 ? (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">{app.public_id}</span>
                  <StatusBadge status={app.status} />
                </div>
                <h4 className="mt-1 font-bold text-sm text-slate-800">{app.scholarship_name}</h4>
                <p className="text-xs text-slate-500">
                  {app.provider} • Grant: <b>{money(app.amount)}</b>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const details = await api(`/api/applications/${app.id}`);
                      setSelectedApp(details);
                    } catch (err) {
                      fail(err.message || 'Application details could not be loaded.');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  icon={Eye}
                >
                  Track Timeline
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No scholarship applications yet"
          message="Discover open scholarships and submit your application with documents."
          action={
            <Button onClick={() => onPage('scholarships')} variant="primary" size="sm">
              Browse Scholarships
            </Button>
          }
        />
      )}
    </Card>
  );
  const recommendationSection = (
    <Card
      title="Recommended Scholarships for You"
      subtitle="Rule-based matches based on your education qualification, community, and annual income"
      action={
        <Button onClick={() => onPage('scholarships')} variant="ghost" size="sm" icon={ArrowRight}>
          View All Catalog
        </Button>
      }
    >
      {recommendations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.slice(0, 3).map((rec) => {
            const s = rec.scholarship;
            return (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                      {s.scholarship_type || 'Merit'}
                    </span>
                    <span className="font-extrabold text-sm text-indigo-700">{money(s.amount)}</span>
                  </div>
                  <h3 className="mt-2 font-bold text-sm text-slate-900 leading-snug line-clamp-2">{s.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{s.provider}</p>

                  <div className="mt-3 space-y-1 rounded-lg bg-emerald-50/60 p-2.5 border border-emerald-100 text-[11px] text-emerald-900">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Match Criteria:
                    </p>
                    {rec.reasons.map((reason, index) => (
                      <p key={index} className="text-emerald-800 leading-tight">• {reason}</p>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-500">
                    Deadline: <b>{String(s.end_date || '').slice(0, 10)}</b>
                  </span>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleSaveScholarship(s.id)} variant="outline" size="sm">
                      <Bookmark size={13} />
                    </Button>
                    <Button onClick={() => startApply(s)} variant="primary" size="sm">
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="No recommendations generated yet"
          message="Complete more of your student profile to unlock personalized scholarship recommendations."
          action={
            <Button onClick={() => onPage('profile')} variant="primary" size="sm">
              Complete Profile
            </Button>
          }
        />
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Tab: Dashboard */}
      {activeTab === 'dashboard' && (
        <>
          {/* Welcome Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700 p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                  Welcome, {profile?.fullName || user.fullName}
                </span>
                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                  ScholarPath Student Portal
                </h1>
                <p className="mt-1 max-w-xl text-xs sm:text-sm text-indigo-100">
                  Track your government scholarships, discover rule-based matches, and monitor institutional verification in real time.
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/15 w-full sm:w-64 shrink-0">
                <ProgressBar percent={profilePercent} label="Profile Completion" showWarning={false} />
                <Button
                  onClick={() => onPage('profile')}
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-white/30 text-white bg-white/10 hover:bg-white/20"
                >
                  {profilePercent < 80 ? 'Complete Profile (Required)' : 'Edit Profile'}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="My Applications"
              value={applications.length}
              subtitle="Total applications submitted"
              icon={FileText}
              variant="indigo"
            />
            <KpiCard
              title="Active In Review"
              value={activeApps.length}
              subtitle="Verification in progress"
              icon={Clock}
              variant="amber"
            />
            <KpiCard
              title="Approved Awards"
              value={approvedApps.length}
              subtitle="Scholarships sanctioned"
              icon={CheckCircle2}
              variant="emerald"
            />
            <KpiCard
              title="Saved Opportunities"
              value={savedScholarships.length}
              subtitle="Bookmarked for later"
              icon={Bookmark}
              variant="teal"
            />
          </div>

          {recommendationSection}

          {applicationsSection}
        </>
      )}

      {/* Tab: Scholarship Recommendations */}
      {activeTab === 'recommendations' && recommendationSection}

      {/* Tab: Student Applications */}
      {activeTab === 'applications' && applicationsSection}

      {/* Tab: Scholarships Catalog */}
      {activeTab === 'scholarships' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Scholarship Catalog</h1>
              <p className="text-xs text-slate-500 mt-0.5">Explore open state and central government scholarship schemes</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scheme, course, category…"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scholarships.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                      {s.scholarship_type || 'Merit'}
                    </span>
                    <span className="text-base font-extrabold text-indigo-700">{money(s.amount)}</span>
                  </div>
                  <h3 className="mt-2.5 font-bold text-sm text-slate-900 leading-snug line-clamp-2">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{s.provider}</p>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">{s.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                    {s.category && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
                        Category: {s.category}
                      </span>
                    )}
                    {s.eligible_course && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
                        Course: {s.eligible_course}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Deadline: <b>{String(s.end_date || '').slice(0, 10)}</b>
                  </span>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleSaveScholarship(s.id)} variant="outline" size="sm">
                      <Bookmark size={13} />
                    </Button>
                    <Button onClick={() => startApply(s)} variant="primary" size="sm">
                      Apply Now
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Student Profile Form */}
      {activeTab === 'profile' && (
        <Card
          title="Student Registration Profile"
          subtitle="Your profile data is strictly used for scholarship eligibility matching and application processing"
        >
          <div className="mb-6">
            <ProgressBar percent={profilePercent} label="Profile Readiness Score" />
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InputField
                label="Full Name"
                name="fullName"
                value={profile?.fullName || ''}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                required
              />
              <InputField
                label="Phone Number"
                name="phone"
                value={profile?.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <InputField
                label="Date of Birth"
                type="date"
                name="dateOfBirth"
                value={profile?.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : ''}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
              />
              <SelectField
                label="Gender"
                name="gender"
                value={profile?.gender || ''}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                options={['', 'Female', 'Male', 'Other']}
              />
              <SelectField
                label="Community / Category"
                name="community"
                value={profile?.community || ''}
                onChange={(e) => setProfile({ ...profile, community: e.target.value })}
                options={['', 'General', 'OBC', 'SC', 'ST', 'Minority']}
              />
              <InputField
                label="Annual Family Income (₹)"
                type="number"
                name="annualIncome"
                value={profile?.annualIncome || ''}
                onChange={(e) => setProfile({ ...profile, annualIncome: e.target.value })}
                hint="Used for income-criteria matching"
              />
              <InputField
                label="State"
                name="state"
                value={profile?.state || ''}
                onChange={(e) => setProfile({ ...profile, state: e.target.value })}
              />
              <InputField
                label="Institution Name"
                name="institutionName"
                value={profile?.institutionName || ''}
                onChange={(e) => setProfile({ ...profile, institutionName: e.target.value })}
                placeholder="e.g. Bangalore University / JSS Institute"
              />
              <InputField
                label="Current Qualification"
                name="qualification"
                value={profile?.qualification || ''}
                onChange={(e) => setProfile({ ...profile, qualification: e.target.value })}
                placeholder="e.g. B.Tech, PU College, High School"
              />
              <InputField
                label="Course Name"
                name="course"
                value={profile?.course || ''}
                onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                placeholder="e.g. Computer Science & Engineering"
              />
              <InputField
                label="Marks Percentage (%)"
                type="number"
                step="0.01"
                name="percentage"
                value={profile?.percentage || ''}
                onChange={(e) => setProfile({ ...profile, percentage: e.target.value })}
              />
              <InputField
                label="Graduation Year"
                type="number"
                name="graduationYear"
                value={profile?.graduationYear || ''}
                onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
              />
            </div>

            {/* Special Flags */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Special Eligibility Categories
              </h4>
              <div className="flex flex-wrap gap-5 text-xs text-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.disability)}
                    onChange={(e) => setProfile({ ...profile, disability: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Person with Disability (PwD)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.sports)}
                    onChange={(e) => setProfile({ ...profile, sports: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Sports Quota / State Level Athlete</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(profile?.exServicemen)}
                    onChange={(e) => setProfile({ ...profile, exServicemen: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Dependent of Ex-Servicemen</span>
                </label>
              </div>
            </div>

            <Button type="submit" variant="primary">
              Save Student Profile
            </Button>
          </form>
        </Card>
      )}

      {/* Tab: AI Eligibility Checker */}
      {activeTab === 'eligibility' && (
        <Card
          title="AI Eligibility Assessment Assistant"
          subtitle="Advisory machine-learning prediction based on your profile qualifications and community parameters"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              This assistive intelligence tool evaluates your saved profile against trained scholarship criteria without transmitting your personal name or identifiers. Official scheme guidelines always remain decisive.
            </p>

            <Button
              onClick={runAiEligibilityCheck}
              variant="primary"
              loading={aiChecking}
              icon={Sparkles}
            >
              Analyze My Eligibility
            </Button>

            {aiResult && (
              <div
                className={`rounded-xl border p-4 text-xs ${
                  aiResult.eligible_prediction
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                    : 'border-amber-200 bg-amber-50/70 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {aiResult.eligible_prediction ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600" />
                  )}
                  <span>
                    {aiResult.eligible_prediction
                      ? 'Potentially Eligible for State & Central Scholarship Programs'
                      : 'Additional Criteria or Document Verification May Be Needed'}
                  </span>
                </div>

                <p className="mt-2 font-semibold">
                  Model Confidence Probability: {(aiResult.eligible_probability * 100).toFixed(1)}%
                </p>
                <p className="mt-1 text-[11px] opacity-90">{aiResult.notice}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tab: Saved Scholarships */}
      {activeTab === 'saved' && (
        <Card
          title="Saved Scholarships"
          subtitle="Opportunities you have bookmarked for review and future application"
        >
          {savedScholarships.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedScholarships.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-extrabold text-sm text-indigo-700">{money(s.amount)}</span>
                    <span className="text-[11px] text-slate-500">Deadline: {String(s.end_date).slice(0, 10)}</span>
                  </div>
                  <h3 className="mt-2 font-bold text-sm text-slate-900">{s.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{s.provider}</p>
                  <Button onClick={() => startApply(s)} variant="primary" size="sm" className="mt-4 w-full">
                    Apply Now
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bookmark}
              title="No saved scholarships yet"
              message="You can bookmark any scholarship scheme from the catalog to easily track its deadline."
            />
          )}
        </Card>
      )}

      {/* Apply / Document Upload Modal */}
      <Modal
        isOpen={Boolean(applyingScholarship)}
        onClose={() => setApplyingScholarship(null)}
        title={`Apply: ${applyingScholarship?.name}`}
        subtitle={`Provider: ${applyingScholarship?.provider} • Grant: ${money(applyingScholarship?.amount)}`}
        maxWidth="max-w-xl"
        footer={
          createdApp ? (
            <div className="flex w-full items-center justify-between">
              <Button onClick={() => setApplyingScholarship(null)} variant="secondary" size="sm">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApplication}
                variant="success"
                size="sm"
                loading={submitting}
                icon={CheckCircle2}
              >
                Submit Application
              </Button>
            </div>
          ) : (
            <Button onClick={() => setApplyingScholarship(null)} variant="secondary" size="sm">
              Cancel
            </Button>
          )
        }
      >
        {createdApp ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
              <p className="font-bold">Draft Application Created: {createdApp.publicId}</p>
              <p className="mt-0.5 text-[11px]">
                Please upload at least one mandatory document (e.g. Income Certificate or Marksheet) to complete submission.
              </p>
            </div>

            <div>
              <SelectField
                label="Document Type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                options={[
                  'Income Certificate',
                  'Marksheet / Grade Card',
                  'Government ID (Aadhaar / Voter ID)',
                  'Community / Caste Certificate',
                  'Institution Enrollment Proof'
                ]}
              />

              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Upload File (PDF, PNG, JPG - Max 5MB)
              </label>
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setSelectedFiles([...e.target.files])}
                className="w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />

              <Button
                onClick={handleUploadDocument}
                variant="primary"
                size="sm"
                loading={uploading}
                disabled={!selectedFiles.length}
                icon={Upload}
                className="mt-3"
              >
                Upload Document
              </Button>
            </div>
          </div>
        ) : (
          <LoadingState message="Creating draft application…" />
        )}
      </Modal>

      {/* Application Timeline Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title={selectedApp ? `Application Progress: ${selectedApp.public_id}` : ''}
        subtitle={selectedApp?.scholarship_name}
        maxWidth="max-w-2xl"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 text-xs">
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Current Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedApp.status} size="md" />
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Scholarship Grant</span>
                <p className="font-extrabold text-indigo-700 text-sm mt-0.5">{money(selectedApp.amount)}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Workflow Verification Trail
              </h4>
              <div className="space-y-2 border-l-2 border-indigo-200 pl-4 py-1 text-xs">
                {selectedApp.history?.map((h) => (
                  <div key={h.id} className="relative pb-2">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    <div className="flex items-center justify-between">
                      <StatusBadge status={h.status} />
                      <span className="text-[10px] text-slate-400">
                        {String(h.created_at).replace('T', ' ').slice(0, 16)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700">{h.remarks || 'Verification action recorded.'}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedApp.documents && selectedApp.documents.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Uploaded Documents
                </h4>
                <div className="space-y-1.5">
                  {selectedApp.documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.status} />
                        <span className="font-medium text-slate-800">{d.document_type}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({d.original_name})</span>
                      </div>
                      <a
                        href={`${API}/api/documents/${d.id}/download?inline=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-700 font-semibold hover:underline"
                      >
                        <Eye size={12} /> View
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
