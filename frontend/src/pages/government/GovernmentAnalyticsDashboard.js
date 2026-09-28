import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  IndianRupee,
  Filter,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  ExternalLink,
  Info,
  TrendingUp,
  AlertTriangle,
  Award,
  ChevronRight,
  SlidersHorizontal,
  X
} from 'lucide-react';
import {
  Card,
  KpiCard,
  Button,
  StatusBadge,
  Modal,
  LoadingState,
  ErrorState,
  EmptyState,
  money,
  compactMoney
} from '../../components/ui/DesignSystem';

export function GovernmentAnalyticsDashboard({ api, onNavigateApplicationReview }) {
  // Filter state
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scholarshipFilter, setScholarshipFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('ALL');
  const [institutionFilter, setInstitutionFilter] = useState('ALL');

  // Data states
  const [overview, setOverview] = useState(null);
  const [districtsData, setDistrictsData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected district for deep dive (Part 10)
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtDetails, setDistrictDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // District Comparison State (Part 7.G)
  const [compareDistricts, setCompareDistricts] = useState(['Bengaluru Urban', 'Mysuru']);

  // Table search & sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('totalApplications');
  const [sortAsc, setSortAsc] = useState(false);

  // Fetch all analytics data with current filters
  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (districtFilter !== 'ALL') params.append('district', districtFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (scholarshipFilter !== 'ALL') params.append('scholarshipId', scholarshipFilter);
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (academicYear !== 'ALL') params.append('academicYear', academicYear);
    if (institutionFilter !== 'ALL') params.append('institutionId', institutionFilter);

    const queryStr = params.toString() ? `?${params.toString()}` : '';

    try {
      const [overviewRes, districtsRes, trendsRes] = await Promise.all([
        api(`/api/officer/analytics/overview${queryStr}`),
        api(`/api/officer/analytics/districts${queryStr}`),
        api(`/api/officer/analytics/trends${queryStr}`)
      ]);

      setOverview(overviewRes);
      setDistrictsData(districtsRes);
      setTrendsData(trendsRes);
    } catch (err) {
      console.error('Error loading officer analytics:', err);
      setError(err.message || 'Unable to load district analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [districtFilter, startDate, endDate, scholarshipFilter, statusFilter, academicYear, institutionFilter]);

  // Load single district deep dive
  const handleOpenDistrict = async (name) => {
    setSelectedDistrict(name);
    setLoadingDetails(true);
    try {
      const details = await api(`/api/officer/analytics/district/${encodeURIComponent(name)}`);
      setDistrictDetails(details);
    } catch (err) {
      console.error('Failed to load district details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleResetFilters = () => {
    setDistrictFilter('ALL');
    setStartDate('');
    setEndDate('');
    setScholarshipFilter('ALL');
    setStatusFilter('ALL');
    setAcademicYear('ALL');
    setInstitutionFilter('ALL');
  };

  // Filtered and sorted districts for table
  const filteredDistricts = useMemo(() => {
    if (!districtsData?.districts) return [];
    return districtsData.districts
      .filter((d) => {
        if (!searchQuery) return true;
        return d.districtName.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (valA == null) valA = -1;
        if (valB == null) valB = -1;
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [districtsData, searchQuery, sortField, sortAsc]);

  // Districts for Comparison Tool
  const comparisonData = useMemo(() => {
    if (!districtsData?.districts || !compareDistricts.length) return [];
    return compareDistricts
      .map((name) => districtsData.districts.find((d) => d.districtName === name))
      .filter(Boolean);
  }, [districtsData, compareDistricts]);

  // Top 10 districts by applications for Bar Chart A
  const chartDistrictsByApps = useMemo(() => {
    if (!districtsData?.districts) return [];
    return [...districtsData.districts]
      .filter((d) => d.totalApplications > 0)
      .sort((a, b) => b.totalApplications - a.totalApplications)
      .slice(0, 10);
  }, [districtsData]);

  // Top districts by approval rate for Bar Chart B
  const chartDistrictsByApproval = useMemo(() => {
    if (!districtsData?.districts) return [];
    return [...districtsData.districts]
      .filter((d) => d.totalApplications > 0)
      .sort((a, b) => b.approvalRate - a.approvalRate)
      .slice(0, 10);
  }, [districtsData]);

  // Top districts by approved amount for Bar Chart F
  const chartDistrictsByAmount = useMemo(() => {
    if (!districtsData?.districts) return [];
    return [...districtsData.districts]
      .filter((d) => d.totalAmountApproved > 0)
      .sort((a, b) => b.totalAmountApproved - a.totalAmountApproved)
      .slice(0, 10)
      .map((d) => ({
        ...d,
        amountInLakhs: Number((d.totalAmountApproved / 100000).toFixed(2))
      }));
  }, [districtsData]);

  if (loading && !overview) {
    return <LoadingState message="Loading government officer analytics and district records…" />;
  }

  if (error && !overview) {
    return <ErrorState message={error} onRetry={loadAnalytics} />;
  }

  const kpi = overview?.kpi || {};
  const statusDist = overview?.statusDistribution || [];
  const filterOptions = overview?.filterOptions || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
              Government Scholarship Analytics
            </h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 border border-indigo-200">
              Live Database
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            District-level scholarship administration, approval metrics, trend tracking, and institution oversight.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateApplicationReview && (
            <Button
              onClick={onNavigateApplicationReview}
              variant="outline"
              size="sm"
              icon={CheckCircle2}
            >
              Review Applications
            </Button>
          )}
          <Button
            onClick={loadAnalytics}
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            loading={loading}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* PART 9: FILTER TOOLBAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <SlidersHorizontal size={15} className="text-indigo-600" />
            <span>District & Application Filters</span>
          </div>
          {(districtFilter !== 'ALL' ||
            startDate ||
            endDate ||
            scholarshipFilter !== 'ALL' ||
            statusFilter !== 'ALL' ||
            academicYear !== 'ALL' ||
            institutionFilter !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {/* District Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              District
            </label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Districts ({filterOptions.districts?.length || 0})</option>
              {filterOptions.districts?.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="Unassigned">Unassigned / Unmapped</option>
            </select>
          </div>

          {/* Date Range: Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Date Range: End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Application Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {filterOptions.statuses?.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scholarship Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              Scholarship Scheme
            </label>
            <select
              value={scholarshipFilter}
              onChange={(e) => setScholarshipFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Scholarships</option>
              {filterOptions.scholarships?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Academic Years</option>
              <option value="2026-2027">AY 2026–2027</option>
              <option value="2025-2026">AY 2025–2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* PART 5: TOP KPI CARDS (ALL DIRECT FROM DATABASE) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Total Applications */}
        <KpiCard
          title="Total Applications"
          value={kpi.totalApplications?.toLocaleString('en-IN') || '0'}
          subtitle={`${kpi.totalStudents || 0} registered applicants`}
          icon={FileText}
          variant="indigo"
        />

        {/* 2. Total Approved */}
        <KpiCard
          title="Total Approved"
          value={kpi.approvedApplications?.toLocaleString('en-IN') || '0'}
          badge={`${kpi.overallApprovalRate || 0}% rate`}
          subtitle="Final officer approvals"
          icon={CheckCircle2}
          variant="emerald"
        />

        {/* 3. Total Rejected */}
        <KpiCard
          title="Total Rejected"
          value={kpi.rejectedApplications?.toLocaleString('en-IN') || '0'}
          badge={`${kpi.overallRejectionRate || 0}% rate`}
          subtitle="Ineligible or incomplete"
          icon={XCircle}
          variant="rose"
        />

        {/* 4. Total Pending */}
        <KpiCard
          title="Total Pending"
          value={kpi.pendingApplications?.toLocaleString('en-IN') || '0'}
          badge={`${kpi.overallPendingRate || 0}% rate`}
          subtitle="Awaiting verification/review"
          icon={Clock}
          variant="amber"
        />

        {/* 5. Overall Approval Rate */}
        <KpiCard
          title="Approval Rate"
          value={`${kpi.overallApprovalRate || 0}%`}
          subtitle="Approved / Total × 100"
          icon={Percent}
          variant="teal"
        />

        {/* 6. Total Amount Approved */}
        <KpiCard
          title="Amount Approved"
          value={compactMoney(kpi.totalAmountApproved || 0)}
          subtitle={money(kpi.totalAmountApproved || 0)}
          icon={IndianRupee}
          variant="purple"
        />
      </div>

      {/* PART 7: GRAPHS & VISUALIZATIONS SECTION */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Graph A: Applications by District */}
        <Card
          title="Applications by District (Top 10)"
          subtitle="Total scholarship applications submitted per district"
          action={
            <span className="text-xs font-semibold text-slate-500">
              Live Database Counts
            </span>
          }
        >
          {chartDistrictsByApps.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDistrictsByApps} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="districtName"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [val, 'Applications']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="totalApplications" fill="#4338ca" radius={[6, 6, 0, 0]} name="Applications" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No application data available for the selected filters." />
          )}
        </Card>

        {/* Graph B: Approval Rate by District */}
        <Card
          title="Approval Rate by District (%)"
          subtitle="Approval percentage compared with state benchmark"
          action={
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Benchmark: {districtsData?.stateBenchmarks?.avgApprovalRate || 0}%
            </span>
          }
        >
          {chartDistrictsByApproval.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDistrictsByApproval} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="districtName"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Approval Rate']}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <ReferenceLine
                    y={districtsData?.stateBenchmarks?.avgApprovalRate || 0}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    label={{ value: 'State Avg', position: 'insideTopRight', fill: '#059669', fontSize: 10 }}
                  />
                  <Bar dataKey="approvalRate" fill="#0d9488" radius={[6, 6, 0, 0]} name="Approval Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No approval rate data available for selected filters." />
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Graph C: Application Status Distribution (Donut Chart) */}
        <Card
          title="Application Status Distribution"
          subtitle="Distribution of claims across workflow stages"
          className="lg:col-span-1"
        >
          {statusDist.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [`${val} (${item.payload.percentage}%)`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] max-h-24 overflow-y-auto">
                {statusDist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-700">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.label}:</span>
                    <b className="ml-auto">{item.count}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No status data found." />
          )}
        </Card>

        {/* Graph D & E: Monthly Application and Approval Trends */}
        <Card
          title="Monthly Application & Approval Trends"
          subtitle="Application volume and final approval throughput over time"
          className="lg:col-span-2"
        >
          {trendsData && trendsData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4338ca" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4338ca" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val, name) => [val, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="totalApplications"
                    name="Applications Submitted"
                    stroke="#4338ca"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApps)"
                  />
                  <Area
                    type="monotone"
                    dataKey="approvedApplications"
                    name="Applications Approved"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApproved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No monthly trend records available for selected date range." />
          )}
        </Card>
      </div>

      {/* Graph F: Scholarship Amount by District */}
      <Card
        title="Scholarship Amount Approved by District"
        subtitle="Total disbursed / approved funds by district (in ₹ Lakhs)"
      >
        {chartDistrictsByAmount.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDistrictsByAmount} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="districtName"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" L" />
                <Tooltip
                  formatter={(val, name, item) => [money(item.payload.totalAmountApproved), 'Approved Amount']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="amountInLakhs" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Amount (₹ Lakhs)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message="No scholarship amount records found." />
        )}
      </Card>

      {/* PART 7.G: DISTRICT COMPARISON TOOL */}
      <Card
        title="District Multi-Comparison Tool"
        subtitle="Select multiple districts to benchmark application volume, approval rates, and pending backlog"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Select Districts:</span>
          {filterOptions.districts?.slice(0, 12).map((dName) => {
            const isSelected = compareDistricts.includes(dName);
            return (
              <button
                key={dName}
                onClick={() => {
                  if (isSelected) {
                    if (compareDistricts.length > 1) {
                      setCompareDistricts(compareDistricts.filter((x) => x !== dName));
                    }
                  } else {
                    if (compareDistricts.length < 4) {
                      setCompareDistricts([...compareDistricts, dName]);
                    }
                  }
                }}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {dName}
              </button>
            );
          })}
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
          {comparisonData.map((d) => (
            <div key={d.districtName} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-sm text-slate-900">{d.districtName}</h4>
                <button
                  onClick={() => handleOpenDistrict(d.districtName)}
                  className="text-[11px] font-semibold text-indigo-700 hover:underline"
                >
                  Details →
                </button>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Applications:</span>
                  <b className="text-slate-900">{d.totalApplications}</b>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Approved:</span>
                  <b className="text-emerald-700">{d.approvedApplications}</b>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pending:</span>
                  <b className="text-amber-700">{d.pendingApplications}</b>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Approval Rate:</span>
                  <b className="text-indigo-700">{d.approvalRate}%</b>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pending Rate:</span>
                  <b className="text-amber-700">{d.pendingRate}%</b>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Amount:</span>
                  <b className="text-purple-700">{compactMoney(d.totalAmountApproved)}</b>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Bar Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="districtName" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="totalApplications" fill="#4338ca" name="Total Applications" radius={[4, 4, 0, 0]} />
              <Bar dataKey="approvedApplications" fill="#059669" name="Approved" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendingApplications" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* PART 8: DISTRICT "LOW PERFORMANCE" IDENTIFICATION */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section A: Districts with lower application activity */}
        <Card
          title="Districts with Lower Application Activity"
          subtitle="Identified by total portal applications compared with the state average benchmark"
          action={
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              State Avg: {districtsData?.stateBenchmarks?.avgApplicationsPerDistrict || 0} apps
            </span>
          }
        >
          <div className="space-y-3">
            {districtsData?.lowerActivityDistricts?.map((d) => (
              <div
                key={d.districtName}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{d.districtName}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {d.metricComparison}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>Apps: <b>{d.totalApplications}</b></span>
                    <span>Approved: <b className="text-emerald-700">{d.approvedApplications}</b></span>
                    <span>Pending: <b className="text-amber-700">{d.pendingApplications}</b></span>
                    <span>Rejected: <b className="text-rose-700">{d.rejectedApplications}</b></span>
                    <span>Approval Rate: <b className="text-indigo-700">{d.approvalRate}%</b></span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenDistrict(d.districtName)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Investigate <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500 italic">
            * Metric strictly reflects recorded applications in the database. Does not assert external demographic causes.
          </p>
        </Card>

        {/* Section B: Districts with lower approval rates */}
        <Card
          title="Districts with Lower Approval Rates"
          subtitle="Identified by approval percentage relative to the state benchmark"
          action={
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              State Benchmark: {districtsData?.stateBenchmarks?.avgApprovalRate || 0}%
            </span>
          }
        >
          <div className="space-y-3">
            {districtsData?.lowerApprovalDistricts?.map((d) => (
              <div
                key={d.districtName}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{d.districtName}</span>
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      {d.approvalRate}% approval
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>Apps: <b>{d.totalApplications}</b></span>
                    <span>Approved: <b className="text-emerald-700">{d.approvedApplications}</b></span>
                    <span>Pending: <b className="text-amber-700">{d.pendingApplications}</b></span>
                    <span>Rejected: <b className="text-rose-700">{d.rejectedApplications}</b></span>
                    <span className="text-slate-500">({d.metricComparison})</span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenDistrict(d.districtName)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Investigate <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500 italic">
            * Metric strictly reflects database verification decisions. Underlying issues can be examined in district deep-dive.
          </p>
        </Card>
      </div>

      {/* PART 6: DISTRICT-LEVEL SUMMARY DATA TABLE */}
      <Card
        title="Comprehensive District Analytics Table"
        subtitle="Complete district-wise application statistics, approval rates, and approved funding from database aggregation"
        action={
          <div className="relative w-48 sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search district…"
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th
                  onClick={() => {
                    setSortField('districtName');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-indigo-700"
                >
                  <div className="flex items-center gap-1">
                    <span>District</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3">Registered Students</th>
                <th
                  onClick={() => {
                    setSortField('totalApplications');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-indigo-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Applications</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('approvedApplications');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-indigo-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Approved</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3">Pending</th>
                <th className="p-3">Rejected</th>
                <th className="p-3">Application Rate</th>
                <th
                  onClick={() => {
                    setSortField('approvalRate');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-indigo-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Approval Rate</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('totalAmountApproved');
                    setSortAsc(!sortAsc);
                  }}
                  className="p-3 cursor-pointer hover:text-indigo-700"
                >
                  <div className="flex items-center gap-1">
                    <span>Amount Approved</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDistricts.length > 0 ? (
                filteredDistricts.map((d) => (
                  <tr key={d.districtName} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      {d.districtName}
                      {d.districtCode && d.districtCode !== 'N/A' && (
                        <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                          ({d.districtCode})
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {d.registeredStudents != null
                        ? d.registeredStudents.toLocaleString('en-IN')
                        : '—'}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {d.totalApplications}
                    </td>
                    <td className="p-3 font-semibold text-emerald-700">
                      {d.approvedApplications}
                    </td>
                    <td className="p-3 font-semibold text-amber-700">
                      {d.pendingApplications}
                    </td>
                    <td className="p-3 font-semibold text-rose-700">
                      {d.rejectedApplications}
                    </td>
                    <td className="p-3">
                      {d.applicationRate != null ? (
                        <span className="font-semibold text-slate-800">{d.applicationRate}%</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Denominator unavailable
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700">{d.approvalRate}%</span>
                        <div className="hidden sm:block h-1.5 w-12 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600"
                            style={{ width: `${Math.min(100, d.approvalRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {money(d.totalAmountApproved)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        onClick={() => handleOpenDistrict(d.districtName)}
                        variant="ghost"
                        size="sm"
                        className="text-indigo-700 hover:bg-indigo-50"
                      >
                        Deep Dive
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No district records matched your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PART 10: DISTRICT DETAILS MODAL VIEW */}
      <Modal
        isOpen={Boolean(selectedDistrict)}
        onClose={() => {
          setSelectedDistrict(null);
          setDistrictDetails(null);
        }}
        title={`District Analytics: ${selectedDistrict}`}
        subtitle="Detailed application performance, institution breakdown, and historical trends"
        maxWidth="max-w-4xl"
      >
        {loadingDetails ? (
          <LoadingState message={`Aggregating metrics for ${selectedDistrict}…`} />
        ) : districtDetails ? (
          <div className="space-y-6">
            {/* KPI Summary for this district */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Applications</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">{districtDetails.summary.totalApplications}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase">Approved</span>
                <p className="mt-1 text-2xl font-bold text-emerald-800">{districtDetails.summary.approvedApplications}</p>
                <span className="text-[11px] font-medium text-emerald-600">{districtDetails.summary.approvalRate}% rate</span>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                <span className="text-[11px] font-semibold text-amber-700 uppercase">Pending</span>
                <p className="mt-1 text-2xl font-bold text-amber-800">{districtDetails.summary.pendingApplications}</p>
                <span className="text-[11px] font-medium text-amber-600">{districtDetails.summary.pendingRate}% rate</span>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
                <span className="text-[11px] font-semibold text-rose-700 uppercase">Rejected</span>
                <p className="mt-1 text-2xl font-bold text-rose-800">{districtDetails.summary.rejectedApplications}</p>
                <span className="text-[11px] font-medium text-rose-600">{districtDetails.summary.rejectionRate}% rate</span>
              </div>
            </div>

            {/* Application Rate & Registry Notice */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800">Total Scholarship Funds Approved: </span>
                  <span className="text-base font-extrabold text-indigo-700">
                    {money(districtDetails.summary.totalAmountApproved)}
                  </span>
                </div>
                <div>
                  {districtDetails.summary.applicationRate != null ? (
                    <span>
                      District Application Rate: <b>{districtDetails.summary.applicationRate}%</b> (of {districtDetails.summary.registeredStudents.toLocaleString('en-IN')} eligible/registered students)
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">
                      Application rate unavailable — eligible student denominator not available.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly Trend for this District */}
            {districtDetails.monthlyTrends && districtDetails.monthlyTrends.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Monthly Applications & Approvals Trend
                </h4>
                <div className="h-56 w-full rounded-xl border border-slate-200 p-2 bg-slate-50/30">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={districtDetails.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="applications" stroke="#4338ca" fill="#4338ca" fillOpacity={0.2} name="Applications" />
                      <Area type="monotone" dataKey="approved" stroke="#059669" fill="#059669" fillOpacity={0.2} name="Approved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Institution-wise Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Institution-Wise Performance
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="p-2.5">Institution</th>
                      <th className="p-2.5">Applications</th>
                      <th className="p-2.5">Approved</th>
                      <th className="p-2.5">Pending</th>
                      <th className="p-2.5">Approval Rate</th>
                      <th className="p-2.5">Funds</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {districtDetails.institutionBreakdown?.map((inst) => (
                      <tr key={inst.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-900">{inst.name}</td>
                        <td className="p-2.5 font-bold">{inst.applications}</td>
                        <td className="p-2.5 text-emerald-700 font-semibold">{inst.approved}</td>
                        <td className="p-2.5 text-amber-700 font-semibold">{inst.pending}</td>
                        <td className="p-2.5 text-indigo-700 font-bold">{inst.approvalRate}%</td>
                        <td className="p-2.5 text-slate-800">{money(inst.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scholarship-wise breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Scholarship-Wise Distribution
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {districtDetails.scholarshipBreakdown?.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                    <p className="font-bold text-slate-900 truncate">{s.name}</p>
                    <p className="text-slate-500 text-[11px]">{s.provider}</p>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span>Apps: <b>{s.applications}</b></span>
                      <span className="text-emerald-700">Approved: <b>{s.approved}</b></span>
                      <span className="font-bold text-slate-900">{money(s.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
