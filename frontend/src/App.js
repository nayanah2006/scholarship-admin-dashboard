import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, Building2,
  ClipboardList, GraduationCap, LayoutDashboard, List, Loader2, MessageSquare,
  Search, School, ShieldCheck, User, UploadCloud, Pencil, Plus, Power, Save
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function requestJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'The service could not complete this request.');
  }
  return payload.data;
}

function useApi(path, initialValue) {
  const [state, setState] = useState({ data: initialValue, loading: true, error: '' });

  useEffect(() => {
    let active = true;
    setState({ data: initialValue, loading: true, error: '' });
    requestJson(path)
      .then((data) => active && setState({ data, loading: false, error: '' }))
      .catch((error) => active && setState({ data: initialValue, loading: false, error: error.message }));
    return () => { active = false; };
  }, [path]);

  return state;
}

function formatValue(value) {
  return value === null || value === undefined || value === '' ? '0' : String(value);
}

function buildGovernmentDistrictFallback() {
  const districtNames = [
    'Bengaluru Urban', 'Bengaluru Rural', 'Bagalkot', 'Ballari', 'Belagavi', 'Bidar', 'Chamarajanagar', 'Chikkamagaluru',
    'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi',
    'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mangaluru', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
    'Tumakuru', 'Udupi', 'Vijayapura', 'Vijayanagara', 'Yadgir', 'Uttara Kannada'
  ];
  const categories = [
    ['schools', 'Schools', 'Primary & Secondary Education'],
    ['pu', 'Pre-University Colleges', 'Vocational & Junior Colleges'],
    ['univ', 'Universities', 'Undergraduate & Tech Studies'],
    ['pg', 'Postgraduate Institutions', 'Masters, Doctoral & Research'],
  ];
  const institutionPrefixes = ['Government', 'National', 'St. Josephs', 'KLE', 'Mahatma', 'Seshadripuram', 'Vivekananda', 'Mount Carmel', 'Bharathi', 'Jain', 'Rural', 'Public', 'Bishop', 'Mysore', 'Karnataka', 'Navodaya', 'Narayana', 'Model', 'Shree', 'Sahyadri'];

  return Object.fromEntries(
    districtNames.map((districtName, districtIndex) => {
      const regCount = 98000 + districtIndex * 5200;
      const approvedCount = Math.round(regCount * (0.68 + (districtIndex % 6) * 0.02));
      const pendingCount = regCount - approvedCount;
      const categoriesData = categories.map(([categoryId, categoryName, categorySub], categoryIndex) => ({
        id: categoryId,
        name: categoryName,
        sub: categorySub,
        total: 440 + districtIndex * 18 + categoryIndex * 82,
        students: `${22 + districtIndex * 2 + categoryIndex * 7}k`,
        approved: `${Math.round((4500 + districtIndex * 180 + categoryIndex * 260) * (0.75 + categoryIndex * 0.05)).toLocaleString('en-IN')}`,
        rate: `${Math.min(96, 68 + districtIndex + categoryIndex * 5)}%`,
        badge: categoryIndex % 2 === 0 ? '+1.4%' : '-0.8%',
        badgeColor: categoryIndex % 2 === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
      }));

      const institutions = Object.fromEntries(
        categories.map(([categoryId], categoryIndex) => [
          categoryId,
          Array.from({ length: 20 }, (_, institutionIndex) => {
            const applied = 280 + districtIndex * 18 + categoryIndex * 32 + institutionIndex * 9;
            const approved = Math.round(applied * (0.68 + ((districtIndex + categoryIndex) % 5) * 0.03));
            const pending = Math.max(5, applied - approved);
            const type = categoryId === 'schools' ? 'School' : categoryId === 'pu' ? 'PU College' : categoryId === 'univ' ? 'College' : 'Research Centre';
            return {
              id: `${categoryId.toUpperCase()}${String(districtIndex + 1).padStart(2, '0')}${String(institutionIndex + 1).padStart(2, '0')}`,
              name: `${institutionPrefixes[institutionIndex % institutionPrefixes.length]} ${type} ${institutionIndex + 1}, ${districtName}`,
              total: String(applied + 120),
              applied: String(applied),
              pct: `${Math.min(98, 63 + ((institutionIndex + districtIndex + categoryIndex) % 12) * 3)}%`,
              approved: String(approved),
              rejected: String(Math.max(6, Math.round(applied * 0.08))),
              pending: String(pending),
              disbursed: `â‚¹${(approved * 0.12).toFixed(1)}L`,
            };
          }),
        ])
      );

      return [
        districtName,
        {
          code: String(100 + districtIndex + 1),
          instCount: String(760 + districtIndex * 44),
          regCount: regCount.toLocaleString('en-IN'),
          approvedCount: approvedCount.toLocaleString('en-IN'),
          pendingCount: pendingCount.toLocaleString('en-IN'),
          coverage: 62 + (districtIndex % 28),
          categories: categoriesData,
          institutions,
        },
      ];
    })
  );
}

function State({ children }) {
  return <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">{children}</div>;
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [role, setRole] = useState('');
  const [districtName, setDistrictName] = useState('');
      const [categoryId, setCategoryId] = useState(''); 
  const [institutionId, setInstitutionId] = useState('');
  const [pendingApprovalsRefresh, setPendingApprovalsRefresh] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', userId: '' });
  const [loginError, setLoginError] = useState('');
  const fallbackDistricts = useMemo(() => buildGovernmentDistrictFallback(), []);
  const districts = useApi('/api/districts', fallbackDistricts);
  const summary = useApi('/api/summary', null);
  const dataStatus = useApi('/api/data-status', null);
  const references = useApi('/api/reference-data', { roles: [] });
  const pendingApprovals = useApi(`/api/government/pending-approvals?refresh=${pendingApprovalsRefresh}`, []);
  const mergedDistricts = useMemo(() => ({ ...fallbackDistricts, ...(districts.data || {}) }), [districts.data, fallbackDistricts]);
  const districtEntries = Object.entries(mergedDistricts || {});
  const selectedDistrict = mergedDistricts?.[districtName];
  const roles = references.data?.roles || [];

  useEffect(() => {
    if (!districtName && districtEntries.length) setDistrictName(districtEntries[0][0]);
  }, [districtEntries, districtName]);

  useEffect(() => {
    if (!role && roles.length) {
      const defaultRole = roles.find((item) => (item.id || item.value) === 'government') || roles[0];
      setRole(defaultRole.id || defaultRole.value || '');
    }
  }, [role, roles]);

  const changeRole = (nextRole) => {
    setRole(nextRole);
    setView(nextRole === 'student' ? 'student' : nextRole === 'institution' ? 'institution' : nextRole === 'government' ? 'analytics' : nextRole === 'admin' ? 'scholarships' : 'dashboard');
  };

  const openDistrict = (name) => {
    setDistrictName(name);
    setCategoryId('');
    setInstitutionId('');
    setView('analytics');
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const rawUserId = loginData.userId.trim();
    const normalizedUserId = rawUserId.toUpperCase();
    const normalizedUserName = loginData.username.trim();

    if (!normalizedUserName || !rawUserId) {
      setLoginError('Please enter both username and user ID.');
      return;
    }

    let nextRole = '';
    if (normalizedUserId.startsWith('STD_ID_')) nextRole = 'student';
    else if (normalizedUserId.startsWith('GOVT_ID_')) nextRole = 'government';
    else if (normalizedUserId.startsWith('ADMIN_ID_')) nextRole = 'admin';
    else if (normalizedUserId.startsWith('INST_ID_')) nextRole = 'institution';
    else {
      setLoginError('User ID must start with std_ID_, Govt_ID_, Admin_ID_, or Inst_ID_.');
      return;
    }

    setRole(nextRole);
    setLoginError('');
    setIsAuthenticated(true);
    setView(nextRole === 'student' ? 'student' : nextRole === 'institution' ? 'institution' : nextRole === 'government' ? 'analytics' : nextRole === 'admin' ? 'scholarships' : 'dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginData({ username: '', userId: '' });
    setLoginError('');
    setRole('');
    setView('dashboard');
  };

  if (!isAuthenticated) {
    return <LoginPage username={loginData.username} userId={loginData.userId} onUsernameChange={(value) => setLoginData((current) => ({ ...current, username: value }))} onUserIdChange={(value) => setLoginData((current) => ({ ...current, userId: value }))} onSubmit={handleLogin} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-5 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-20">
        <button className="flex items-center gap-3 text-left" onClick={() => setView(role === 'student' ? 'student' : role === 'institution' ? 'institution' : role === 'government' ? 'analytics' : role === 'admin' ? 'scholarships' : 'dashboard')}>
          <span className="p-2 bg-indigo-950 text-white rounded-lg"><Building2 className="w-5 h-5" /></span>
          <span><strong className="block text-lg text-slate-900">Scholarship Operations</strong><small className="text-xs text-slate-500">Karnataka Education Department</small></span>
        </button>
        <div className="flex items-center gap-4">
          <button title="Notifications" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Bell className="w-5 h-5" /></button>
          <button onClick={handleLogout} className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-2">Logout</button>
          <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center text-xs font-bold">{role ? role.slice(0, 2).toUpperCase() : 'KA'}</div>
        </div>
      </header>

      <div className="flex flex-1 min-w-0">
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 p-4 flex-col gap-6 shrink-0">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3"><p className="font-bold text-sm text-slate-900">Operations console</p><p className="text-xs text-slate-500 mt-1">Live data workspace</p></div>
          <nav className="space-y-1">{role === 'student' ? <><NavButton active={view === 'student'} icon={User} onClick={() => setView('student')}>Student portal</NavButton><NavButton active={view === 'scholarships'} icon={GraduationCap} onClick={() => setView('scholarships')}>Open scholarships</NavButton><NavButton active={view === 'applications'} icon={ClipboardList} onClick={() => setView('applications')}>Applications</NavButton><NavButton active={view === 'complaints'} icon={MessageSquare} onClick={() => setView('complaints')}>Grievances</NavButton></> : role === 'institution' ? <><NavButton active={view === 'institution'} icon={School} onClick={() => setView('institution')}>Institution verification</NavButton></> : role === 'admin' ? <><NavButton active={view === 'scholarships'} icon={GraduationCap} onClick={() => setView('scholarships')}>Scholarships</NavButton></> : <><NavButton active={view === 'analytics'} icon={BarChart3} onClick={() => setView('analytics')}>District analytics</NavButton><NavButton active={view === 'officer-approvals'} icon={ShieldCheck} onClick={() => setView('officer-approvals')}>Pending approvals</NavButton><NavButton active={view === 'scholarships'} icon={GraduationCap} onClick={() => setView('scholarships')}>Scholarships</NavButton></>}</nav>
          <div className="mt-auto"><label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active role</label><select value={role} onChange={(event) => changeRole(event.target.value)} className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold" disabled={!roles.length}>{!roles.length && <option value="">No roles available</option>}{roles.map((item) => <option key={item.id || item.value} value={item.id || item.value}>{item.label || item.name || item.value}</option>)}</select></div>
        </aside>

        <main className="flex-1 p-5 lg:p-8 min-w-0">
          {view === 'dashboard' && role !== 'government' && <Dashboard summary={summary} districts={districts} dataStatus={dataStatus} onOpenDistrict={openDistrict} />}
          {view === 'analytics' && <Analytics summary={summary} dataStatus={dataStatus} districts={mergedDistricts} districtName={districtName} selectedDistrict={selectedDistrict} categoryId={categoryId} institutionId={institutionId} onDistrictChange={(name) => { setDistrictName(name); setCategoryId(''); setInstitutionId(''); }} onCategory={(id) => { setCategoryId(id); setInstitutionId(''); }} onInstitution={setInstitutionId} onBack={() => setView('analytics')} />}
          {view === 'officer-approvals' && <GovernmentOfficerBoard pendingApprovals={pendingApprovals.data || []} onApprove={async (id) => {
            try {
              await fetchJson(`/api/government-approvals/${id}/approve`, 'POST', {});
              setPendingApprovalsRefresh((current) => current + 1);
            } catch (error) {
              console.error(error.message);
            }
          }} />}
          {view === 'scholarships' && <ScholarshipManagement role={role} />}
          {view === 'applications' && <StudentApplications onBrowse={() => setView('scholarships')} />}
          {view === 'student' && <StudentPortal />}
          {view === 'complaints' && <StudentComplaintManagement />}
          {view === 'institution' && <InstitutionVerificationBoard onForwardToGovernment={(entry) => {
            if (!entry?.applicationId) return;
            fetchJson(`/api/institution-applications/${entry.applicationId}/verify`, 'POST', {
              studentId: entry.studentId,
              studentName: entry.student,
              scholarshipId: entry.scholarshipId,
              scholarshipName: entry.scholarship,
              institutionName: entry.institute || 'Institution verification',
            }).then(() => setPendingApprovalsRefresh((current) => current + 1)).catch((error) => console.error(error.message));
          }} />}
        </main>
      </div>
      <footer className="bg-white border-t border-slate-200 px-5 lg:px-8 py-4 text-xs text-slate-500">Operational data is supplied by the scholarship API. Human officers retain final decision authority.</footer>
    </div>
  );
}

function LoginPage({ username, userId, onUsernameChange, onUserIdChange, onSubmit, error }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-indigo-950 text-white flex items-center justify-center mb-4"><Building2 className="w-6 h-6" /></div>
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Scholarship portal</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Login</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your username and user ID to open the correct view.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600">
            Username
            <input value={username} onChange={(event) => onUsernameChange(event.target.value)} placeholder="e.g. ramya" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" required />
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            User ID
            <input value={userId} onChange={(event) => onUserIdChange(event.target.value)} placeholder="std_ID_XXXXX / Govt_ID_XXXXX / Inst_ID_XXXXX" className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" required />
          </label>

          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

          <button type="submit" className="w-full bg-indigo-700 text-white rounded-lg px-4 py-2.5 text-sm font-bold">Open portal</button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800 mb-2">User ID patterns</p>
          <ul className="space-y-1">
            <li>â€¢ std_ID_XXXXX â†’ Student view</li>
            <li>â€¢ Govt_ID_XXXXX â†’ Government officer view</li>
            <li>â€¢ Admin_ID_XXXXX â†’ Admin scholarship management</li>
            <li>â€¢ Inst_ID_XXXXX â†’ Institution view</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, icon: Icon, onClick, children }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="w-4 h-4" />{children}</button>;
}

const emptyScholarship = {
  name: '', description: '', provider: '', scholarship_type: '', amount: '',
  category: '', eligible_course: '', district_name: '', start_date: '', end_date: '', status: 'active'
};

function ScholarshipManagement({ role }) {
  const isStudentView = role === 'student';
  const isGovernmentReadOnly = role === 'government';
  const isAdminRole = role === 'admin';
  const canCreateOrEdit = role === 'admin';
  const [mode, setMode] = useState(isStudentView ? 'student' : 'government');
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyScholarship);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isStudentView) setMode('student');
    else if (isGovernmentReadOnly || isAdminRole) setMode('government');
    else setMode('government');
    setSelected(null);
  }, [isStudentView, isGovernmentReadOnly, isAdminRole]);

  const path = mode === 'student' ? '/api/scholarships?status=open' : `/api/scholarships?search=${encodeURIComponent(search)}`;
  const scholarships = useApi(`${path}&refresh=${refresh}`, []);
  const visible = mode === 'student' ? scholarships.data : scholarships.data?.filter((item) => `${item.name} ${item.provider}`.toLowerCase().includes(search.toLowerCase()));

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const edit = (scholarship) => setForm({ ...scholarship, amount: String(scholarship.amount), start_date: String(scholarship.start_date).slice(0, 10), end_date: String(scholarship.end_date).slice(0, 10) });
  const save = async (event) => {
    event.preventDefault();
    if (!canCreateOrEdit) return;
    setError(''); setMessage('');
    try {
      await fetchJson(form.id ? `/api/scholarships/${form.id}` : '/api/scholarships', form.id ? 'PUT' : 'POST', form);
      setForm(emptyScholarship); setMessage('Scholarship saved.'); setRefresh((current) => current + 1);
    } catch (requestError) { setError(requestError.message); }
  };
  const changeStatus = async (scholarship) => {
    if (!canCreateOrEdit) return;
    try {
      await fetchJson(`/api/scholarships/${scholarship.id}/status`, 'PATCH', { status: scholarship.status === 'active' ? 'inactive' : 'active' });
      setRefresh((current) => current + 1); setMessage('Scholarship status updated.');
    } catch (requestError) { setError(requestError.message); }
  };
  const showDetails = async (scholarship) => {
    try { setSelected(await requestJson(`/api/scholarships/${scholarship.id}`)); } catch (requestError) { setError(requestError.message); }
  };

  return <div className="max-w-7xl mx-auto space-y-6"><PageHeading eyebrow="Scholarship management" title={mode === 'student' ? 'Open scholarships' : isGovernmentReadOnly ? 'Government officer view' : isAdminRole ? 'Admin scholarship management' : 'Government officer view'} detail={isGovernmentReadOnly ? 'View the current scholarship catalog without creating or editing program records.' : 'Scholarship records, dates, rules, and documents are supplied by MySQL through the scholarship API.'} />
    <div className="flex flex-wrap items-center gap-3">{!isStudentView && (canCreateOrEdit ? <><button onClick={() => { setMode('student'); setSelected(null); }} className={`px-3 py-2 rounded-lg text-xs font-bold ${mode === 'student' ? 'bg-indigo-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Public scholarships</button><button onClick={() => { setMode('government'); setSelected(null); }} className={`px-3 py-2 rounded-lg text-xs font-bold ${mode === 'government' ? 'bg-indigo-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Admin scholarship view</button>{mode === 'government' && <button onClick={() => setForm(emptyScholarship)} className="ml-auto flex items-center gap-2 text-xs font-bold text-indigo-700"><Plus className="w-4 h-4" />New scholarship</button>}</> : <span className="text-xs font-bold text-slate-500">Read-only access</span>)}{isStudentView && <span className="text-xs font-bold text-slate-500">Student portal</span>}</div>
    {message && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">{message}</div>}{error && <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">{error}</div>}
    {mode === 'government' && canCreateOrEdit && <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"><Field name="name" value={form.name} onChange={updateField} label="Scholarship name" required /><Field name="provider" value={form.provider} onChange={updateField} label="Provider / department" required /><Field name="scholarship_type" value={form.scholarship_type} onChange={updateField} label="Scholarship type" required /><Field name="amount" value={form.amount} onChange={updateField} label="Amount" type="number" min="0" required /><Field name="category" value={form.category} onChange={updateField} label="Category" /><Field name="eligible_course" value={form.eligible_course} onChange={updateField} label="Eligible course" /><Field name="district_name" value={form.district_name} onChange={updateField} label="District (optional)" /><Field name="start_date" value={form.start_date} onChange={updateField} label="Opening date" type="date" required /><Field name="end_date" value={form.end_date} onChange={updateField} label="Closing date" type="date" required /><label className="md:col-span-2 lg:col-span-3 text-xs font-semibold text-slate-600">Description<textarea name="description" value={form.description} onChange={updateField} required className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm min-h-20" /></label><button className="md:col-span-2 lg:col-span-3 justify-self-start flex items-center gap-2 bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-bold"><Save className="w-4 h-4" />{form.id ? 'Update scholarship' : 'Create scholarship'}</button></form>}
    {mode === 'government' && <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search scholarships" className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs" /></div>}
    {scholarships.loading ? <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State> : scholarships.error ? <State><ErrorMessage message={scholarships.error} /></State> : !visible?.length ? <State>{mode === 'student' ? 'No open scholarships are available at this time.' : 'No scholarship records match the current search.'}</State> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{visible.map((scholarship) => <article key={scholarship.id} className="bg-white border border-slate-200 rounded-xl p-5"><div className="flex justify-between gap-3"><div><h2 className="font-bold text-slate-900">{scholarship.name}</h2><p className="text-xs text-slate-500 mt-1">{scholarship.provider} Â· {scholarship.scholarship_type}</p></div><span className={`text-[10px] font-bold px-2 py-1 rounded h-fit ${scholarship.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{scholarship.status}</span></div><p className="text-sm text-slate-600 mt-4 line-clamp-3">{scholarship.description}</p><div className="grid grid-cols-2 gap-3 mt-4 text-xs"><Value label="Amount" value={scholarship.amount} /><Value label="Opening" value={String(scholarship.start_date).slice(0, 10)} /><Value label="Closing" value={String(scholarship.end_date).slice(0, 10)} /><Value label="Eligibility" value={scholarship.eligible_course || scholarship.category || 'See details'} /></div><div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100"><button onClick={() => showDetails(scholarship)} className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-3 py-2">View details</button>{mode === 'student' ? <button onClick={() => showDetails(scholarship)} className="text-xs font-bold text-white bg-indigo-700 rounded-lg px-3 py-2">Apply</button> : <><button onClick={() => edit(scholarship)} title="Edit scholarship" className="p-2 text-indigo-700 border border-slate-200 rounded-lg"><Pencil className="w-4 h-4" /></button><button onClick={() => changeStatus(scholarship)} title="Activate or deactivate scholarship" className="p-2 text-slate-600 border border-slate-200 rounded-lg"><Power className="w-4 h-4" /></button></>}</div></article>)}</div>}
    {selected && (mode === 'student' ? <ApplicationForm scholarshipId={selected.id} onClose={() => setSelected(null)} /> : <><ScholarshipDetail scholarship={selected} mode={mode} onClose={() => setSelected(null)} /><RuleEditor scholarshipId={selected.id} /><OfficialReadinessLookup /></>)}
  </div>;
}

async function fetchJson(path, method, body) {
  const response = await fetch(`${API_URL}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.message || 'Request failed.');
  return payload.data;
}

function Field({ name, value, onChange, label, ...props }) { return <label className="text-xs font-semibold text-slate-600">{label}<input name={name} value={value || ''} onChange={onChange} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm" {...props} /></label>; }
function DynamicControl({ field, value, onChange, onFile }) {
  const common = { name: field.field_key, value: value || '', onChange, required: Boolean(field.required), className: 'mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm' };
  if (field.field_type === 'textarea') return <textarea {...common} className={`${common.className} min-h-24`} />;
  if (field.field_type === 'dropdown' || field.field_type === 'radio') {
    const options = Array.isArray(field.options) ? field.options : [];
    if (field.field_type === 'radio') return <div className="flex flex-wrap gap-3 mt-2">{options.map((option) => <label key={String(option)} className="text-xs flex items-center gap-2"><input type="radio" name={field.field_key} value={option.value || option} checked={value === (option.value || option)} onChange={onChange} required={Boolean(field.required)} />{option.label || option}</label>)}</div>;
    return <select {...common}><option value="">Select an option</option>{options.map((option) => <option key={String(option.value || option)} value={option.value || option}>{option.label || option}</option>)}</select>;
  }
  if (field.field_type === 'checkbox') return <label className="flex items-center gap-2 mt-2 text-xs"><input type="checkbox" name={field.field_key} checked={Boolean(value)} onChange={(event) => onChange({ target: { name: field.field_key, value: event.target.checked } })} required={Boolean(field.required)} />{field.label}</label>;
  if (field.field_type === 'file') return <input name={`field_${field.id}`} type="file" onChange={(event) => onFile(field.field_key, event.target.files[0])} required={Boolean(field.required)} accept=".pdf,.jpg,.jpeg,.png" className={common.className} />;
  return <input {...common} type={['number', 'date'].includes(field.field_type) ? field.field_type : 'text'} min={field.validation?.min} max={field.validation?.max} pattern={field.validation?.pattern} />;
}

function ApplicationForm({ scholarshipId, initialStudentId = '', initialFiles = {}, onClose }) {
  const formState = useApi(`/api/scholarships/${scholarshipId}/application-form`, null);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const form = formState.data;
  useEffect(() => {
    if (!form || !Object.keys(initialFiles).length) return;
    const sourceEntries = Object.entries(initialFiles);
    const normaliseDocumentName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    setFiles((current) => Object.keys(current).length ? current : Object.fromEntries(form.requiredDocuments.map((document, index) => {
      const target = normaliseDocumentName(document.document_name);
      const match = sourceEntries.find(([name]) => normaliseDocumentName(name) === target || target.includes(normaliseDocumentName(name)) || normaliseDocumentName(name).includes(target));
      return [`document_${document.id}`, match?.[1] || initialFiles[`document_${index + 1}`] || Object.values(initialFiles)[index]];
    }).filter(([, file]) => file)));
  }, [form, initialFiles]);
  if (formState.loading) return <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State>;
  if (formState.error) return <State><ErrorMessage message={formState.error} /></State>;
  if (!form) return <State>Application form is unavailable.</State>;
  const scholarship = form.scholarship;
  const normaliseDocumentName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const resolvedFiles = Object.fromEntries(form.requiredDocuments.map((document, index) => {
    const documentKey = `document_${document.id}`;
    if (files[documentKey]) return [documentKey, files[documentKey]];
    const target = normaliseDocumentName(document.document_name);
    const matchingInitialFile = Object.entries(initialFiles).find(([name]) => {
      const source = normaliseDocumentName(name);
      return source === target || target.includes(source) || source.includes(target);
    });
    return [documentKey, matchingInitialFile?.[1] || initialFiles[`document_${index + 1}`] || Object.values(initialFiles)[index]];
  }).filter(([, file]) => file));
  const updateValue = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const validate = (status) => {
    const nextErrors = {};
    if (status === 'submitted') form.formFields.forEach((field) => { if (field.required && !values[field.field_key] && !files[field.field_key]) nextErrors[field.field_key] = `${field.label} is required.`; });
    if (status === 'submitted') form.requiredDocuments.forEach((document) => {
      const documentKey = `document_${document.id}`;
      if (document.required && !resolvedFiles[documentKey]) nextErrors[documentKey] = `${document.document_name} is required.`;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const submit = async (status) => {
    setMessage('');
    if (!validate(status)) return;
    const body = new FormData();
    body.append('scholarship_id', scholarshipId); body.append('status', status); body.append('form_data', JSON.stringify(values));
    Object.entries(resolvedFiles).forEach(([name, file]) => body.append(name, file));
    const documentPayload = await Promise.all(Object.entries(resolvedFiles).map(async ([fieldName, file]) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
      return { fieldName, originalName: file.name, mimeType: file.type || 'application/octet-stream', content: btoa(binary) };
    }));
    body.append('document_payload', JSON.stringify(documentPayload));
    Object.entries(files).filter(([name]) => !name.startsWith('document_')).forEach(([name, file]) => {
      const field = form.formFields.find((item) => item.field_key === name);
      if (field && file) body.append(`field_${field.id}`, file);
    });
    try { const result = await submitMultipart('/api/applications', body); setApplicationId(String(result.id)); setMessage(`Application ${result.id} ${status === 'draft' ? 'saved as draft' : 'submitted'} successfully.`); } catch (error) { setMessage(error.message); setErrors(error.errors || {}); }
  };
  return <section className="bg-white border border-slate-200 rounded-xl p-5"><div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Application form</p><h2 className="text-xl font-bold text-slate-900 mt-1">{scholarship.name}</h2><p className="text-xs text-slate-500 mt-1">{scholarship.provider}</p></div><button onClick={onClose} className="text-xs font-semibold text-slate-500">Close</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5"><label className="text-xs font-semibold text-slate-600">Student ID<input value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm" required />{errors.student_id && <span className="text-rose-600 text-[11px]">{errors.student_id}</span>}</label>{form.formFields.map((field) => <label key={field.id} className="text-xs font-semibold text-slate-600">{field.label}{field.field_type !== 'checkbox' && <DynamicControl field={field} value={values[field.field_key]} onChange={updateValue} onFile={(name, file) => setFiles((current) => ({ ...current, [name]: file }))} />}{errors[field.field_key] && <span className="text-rose-600 text-[11px]">{errors[field.field_key]}</span>}</label>)}</div><div className="mt-6"><h3 className="text-sm font-bold text-slate-900">Required documents</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">{form.requiredDocuments.map((document) => { const documentKey = `document_${document.id}`; const selectedFile = files[documentKey]; return <label key={document.id} className="text-xs font-semibold text-slate-600">{document.document_name}{document.required && ' *'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => { const file = event.target.files?.[0]; setFiles((current) => { const next = { ...current }; if (file) next[documentKey] = file; else delete next[documentKey]; return next; }); }} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm" />{selectedFile && <div className="mt-2 rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] text-emerald-700">Selected: {selectedFile.name}</div>}{errors[documentKey] && <span className="text-rose-600 text-[11px]">{errors[documentKey]}</span>}</label>; })}</div></div><EligibilityCheck scholarshipId={scholarshipId} studentId={studentId} /><div className="flex flex-wrap gap-2 mt-6"><button onClick={() => submit('draft')} className="border border-slate-300 rounded-lg px-4 py-2 text-xs font-bold text-slate-700">Save as Draft</button><button onClick={() => submit('submitted')} className="bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-bold">Submit Application</button></div>{message && <p className="mt-4 text-xs font-semibold text-indigo-700">{message}</p>}{applicationId && <ReadinessPanel applicationId={applicationId} />}</section>;
}

async function submitMultipart(path, body) {
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', body });
  const payload = await response.json();
  if (!response.ok || payload.success === false) { const error = new Error(payload.message || 'Application could not be saved.'); error.errors = payload.errors; throw error; }
  return payload.data;
}

function ReadinessPanel({ applicationId }) {
  const readiness = useApi(`/api/applications/${applicationId}/readiness`, null);
  if (readiness.loading) return <div className="mt-5 text-xs text-slate-500">Calculating readiness...</div>;
  if (readiness.error) return <div className="mt-5 text-xs text-rose-700">{readiness.error}</div>;
  const result = readiness.data;
  if (!result) return null;
  return <div className="mt-5 border border-slate-200 rounded-lg p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Application readiness</p><p className="text-xl font-black text-slate-900 mt-1">{result.score}%</p></div><span className={`text-xs font-bold px-2 py-1 rounded ${result.status === 'READY' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{result.status_label || result.status}</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">{result.factors.map((factor) => <div key={factor.name} className="bg-slate-50 rounded p-2 text-xs"><span className="font-semibold text-slate-700">{factor.name}</span><span className="block text-slate-500 mt-1">{factor.score} / {factor.max_score} Â· {factor.completed ? 'Complete' : 'Incomplete'}</span></div>)}</div>{result.missing_items?.length > 0 && <div className="mt-4 text-xs"><p className="font-bold text-rose-700">Missing items</p><p className="text-slate-600 mt-1">{result.missing_items.join(', ')}</p></div>}</div>;
}

function OfficialReadinessLookup() {
  const [value, setValue] = useState('');
  const [applicationId, setApplicationId] = useState('');
  return <section className="bg-white border border-slate-200 rounded-xl p-5"><h2 className="font-bold text-slate-900">Application readiness review</h2><p className="text-xs text-slate-500 mt-1">Enter an application ID to recalculate the current database-backed readiness result.</p><div className="flex flex-wrap gap-2 mt-4"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Application ID" className="border border-slate-200 rounded-lg px-3 py-2 text-xs" /><button type="button" onClick={() => setApplicationId(value.trim())} disabled={!value.trim()} className="bg-slate-900 disabled:bg-slate-300 text-white rounded-lg px-3 py-2 text-xs font-bold">Review readiness</button></div>{applicationId && <ReadinessPanel applicationId={applicationId} />}</section>;
}

function EligibilityCheck({ scholarshipId, studentId }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const check = async () => {
    setError('');
    try { setResult(await fetchJson('/api/eligibility/check', 'POST', { scholarship_id: scholarshipId, student_id: studentId })); } catch (requestError) { setResult(null); setError(requestError.message); }
  };
  return <div className="mt-6 border-t border-slate-100 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Eligibility check</h3><p className="text-xs text-slate-500 mt-1">Uses the current database rules and records an auditable evaluation.</p></div><button type="button" onClick={check} disabled={!studentId.trim()} className="bg-slate-900 disabled:bg-slate-300 text-white rounded-lg px-3 py-2 text-xs font-bold">Check eligibility</button></div>{error && <p className="text-xs text-rose-700 mt-3">{error}</p>}{result && <div className={`mt-4 rounded-lg p-4 ${result.eligible ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}><p className="font-bold text-sm">{result.eligible ? 'Eligible' : 'Not eligible'}</p><p className="text-xs mt-1">{result.explanation}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">{result.rules.map((rule) => <div key={`${rule.rule}-${rule.operator}`} className="bg-white/70 rounded p-2 text-xs"><span className="font-semibold">{rule.rule}</span><span className={`ml-2 font-bold ${rule.passed ? 'text-emerald-700' : 'text-rose-700'}`}>{rule.passed ? 'Passed' : 'Failed'}</span>{!rule.passed && <span className="block mt-1">Actual: {String(rule.actual ?? 'missing')} Â· Required: {String(rule.required ?? '')}</span>}</div>)}</div></div>}</div>;
}

function RuleEditor({ scholarshipId }) {
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({ rule_key: '', operator: '', rule_value: '', description: '' });
  const [message, setMessage] = useState('');
  const rules = useApi(`/api/scholarships/${scholarshipId}/eligibility-rules?refresh=${refresh}`, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const save = async (event) => { event.preventDefault(); try { const body = { ...form, rule_value: ['IN', 'NOT_IN'].includes(form.operator) ? form.rule_value.split(',').map((value) => value.trim()) : form.rule_value }; await fetchJson(form.id ? `/api/eligibility-rules/${form.id}` : `/api/scholarships/${scholarshipId}/eligibility-rules`, form.id ? 'PUT' : 'POST', body); setForm({ rule_key: '', operator: '', rule_value: '', description: '' }); setMessage('Rule saved.'); setRefresh((current) => current + 1); } catch (error) { setMessage(error.message); } };
  const edit = (rule) => setForm({ id: rule.id, rule_key: rule.rule_key, operator: rule.operator, rule_value: Array.isArray(rule.rule_value) ? rule.rule_value.join(', ') : rule.rule_value, description: rule.description || '' });
  const remove = async (id) => { try { await fetchJson(`/api/eligibility-rules/${id}`, 'DELETE'); setMessage('Rule removed.'); setRefresh((current) => current + 1); } catch (error) { setMessage(error.message); } };
  return <section className="bg-white border border-slate-200 rounded-xl p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Eligibility rules</h2><p className="text-xs text-slate-500 mt-1">Officials can change the deterministic rule set stored for this scholarship.</p></div><ShieldCheck className="w-5 h-5 text-indigo-700" /></div><form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4"><Field name="rule_key" value={form.rule_key} onChange={update} label="Profile field" required /><Field name="operator" value={form.operator} onChange={update} label="Operator" placeholder="For example: >= or IN" required /><Field name="rule_value" value={form.rule_value} onChange={update} label="Required value" placeholder="Comma-separate values for IN" required /><Field name="description" value={form.description} onChange={update} label="Explanation label" /><button className="md:col-span-2 lg:col-span-4 justify-self-start bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-bold">{form.id ? 'Update rule' : 'Add rule'}</button></form>{message && <p className="text-xs text-indigo-700 mt-3">{message}</p>}{rules.loading ? <p className="text-xs text-slate-500 mt-4">Loading rules...</p> : rules.error ? <p className="text-xs text-rose-700 mt-4">{rules.error}</p> : <div className="divide-y divide-slate-100 mt-4">{rules.data.map((rule) => <div key={rule.id} className="py-3 flex items-center justify-between gap-3 text-xs"><div><p className="font-semibold text-slate-800">{rule.description || rule.rule_key}</p><p className="text-slate-500">{rule.rule_key} {rule.operator} {Array.isArray(rule.rule_value) ? rule.rule_value.join(', ') : rule.rule_value}</p></div><div className="flex gap-3"><button type="button" onClick={() => edit(rule)} className="text-indigo-700 font-bold">Edit</button><button type="button" onClick={() => remove(rule.id)} className="text-rose-700 font-bold">Remove</button></div></div>)}</div>}</section>;
}
function ScholarshipDetail({ scholarship, mode, onClose }) { const [studentId, setStudentId] = useState(''); const [message, setMessage] = useState(''); const apply = async () => { try { const result = await fetchJson(`/api/scholarships/${scholarship.id}/applications`, 'POST', { student_id: studentId }); setMessage(`Application ${result.id} submitted.`); } catch (error) { setMessage(error.message); } }; return <div className="bg-slate-900 text-white rounded-xl p-5"><div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase tracking-wider text-slate-300">Scholarship details</p><h2 className="text-xl font-bold mt-1">{scholarship.name}</h2></div><button onClick={onClose} className="text-xs text-slate-300">Close</button></div><p className="text-sm text-slate-300 mt-4">{scholarship.description}</p><div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 text-xs"><Value label="Provider" value={scholarship.provider} /><Value label="Amount" value={scholarship.amount} /><Value label="Period" value={`${String(scholarship.start_date).slice(0, 10)} to ${String(scholarship.end_date).slice(0, 10)}`} /></div><div className="mt-5"><p className="text-xs font-bold">Eligibility rules</p>{scholarship.eligibilityRules?.length ? <ul className="text-xs text-slate-300 mt-2 space-y-1">{scholarship.eligibilityRules.map((rule) => <li key={rule.id}>{rule.description || `${rule.rule_key} ${rule.operator} ${rule.rule_value}`}</li>)}</ul> : <p className="text-xs text-slate-400 mt-2">No eligibility rules configured.</p>}</div>{mode === 'student' && <div className="flex flex-wrap gap-2 mt-5"><input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Student ID" className="text-slate-900 rounded-lg px-3 py-2 text-xs" /><button onClick={apply} disabled={!studentId.trim()} className="bg-emerald-500 disabled:bg-slate-600 rounded-lg px-3 py-2 text-xs font-bold">Apply using scholarship ID {scholarship.id}</button></div>}{message && <p className="text-xs text-amber-200 mt-3">{message}</p>}</div>; }

function Dashboard({ summary, districts, dataStatus, onOpenDistrict }) {
  return <div className="max-w-7xl mx-auto space-y-6"><PageHeading eyebrow="Government workspace" title="Scholarship monitoring" detail="Review database-backed district performance and route cases for human review." />
    {!dataStatus.loading && dataStatus.data && <div className={`border rounded-xl px-4 py-3 text-xs ${dataStatus.data.source === 'internet' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}><strong>{dataStatus.data.source === 'internet' ? 'Live internet dataset active' : dataStatus.data.source === 'mysql' ? 'Using local MySQL dataset' : 'Using fallback dataset'}</strong><span className="ml-2">Last checked {dataStatus.data.lastSyncedAt ? new Date(dataStatus.data.lastSyncedAt).toLocaleString() : 'not yet'}.</span>{dataStatus.data.error && <span className="block mt-1">Live source notice: {dataStatus.data.error}</span>}</div>}
    {summary.loading ? <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State> : summary.error ? <State><ErrorMessage message={summary.error} /></State> : <MetricGrid values={[['Districts', summary.data?.totalDistricts], ['Registered', summary.data?.totalRegistered], ['Approved', summary.data?.totalApproved], ['Pending', summary.data?.totalPending], ['Average coverage', `${formatValue(summary.data?.averageCoverage)}%`]]} />}
    <section><div className="flex items-end justify-between gap-4 mb-3"><div><h2 className="text-lg font-bold text-slate-900">District performance</h2><p className="text-xs text-slate-500 mt-1">Select a district to inspect categories and institutions.</p></div><List className="w-5 h-5 text-slate-400" /></div>
      {districts.loading ? <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State> : districts.error ? <State><ErrorMessage message={districts.error} /></State> : !Object.keys(districts.data || {}).length ? <State>No district records are available.</State> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{Object.entries(districts.data).map(([name, item]) => <button key={name} onClick={() => onOpenDistrict(name)} className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-500 hover:shadow-sm transition"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-slate-900">{name}</h3><p className="text-xs text-slate-400 mt-1">{item.code || 'No code'}</p></div><ArrowRight className="w-4 h-4 text-slate-400" /></div><div className="grid grid-cols-2 gap-3 mt-5 text-xs"><Value label="Registered" value={item.regCount} /><Value label="Approved" value={item.approvedCount} /><Value label="Pending" value={item.pendingCount} /><Value label="Coverage" value={`${formatValue(item.coverage)}%`} /></div><div className="h-2 bg-slate-100 rounded-full mt-5"><div className="h-full bg-indigo-700 rounded-full" style={{ width: `${Math.min(100, Number(item.coverage) || 0)}%` }} /></div></button>)}</div>}
    </section>
  </div>;
}

function Analytics({ districts, districtName, selectedDistrict, categoryId, institutionId, onDistrictChange, onCategory, onInstitution, onBack, summary, dataStatus }) {
  const category = selectedDistrict?.categories?.find((item) => item.id === categoryId);
  const institutions = selectedDistrict?.institutions?.[categoryId] || [];
  const selectedInstitution = institutions.find((item) => item.id === institutionId);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => institutions.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase())), [institutions, search]);
  return <div className="max-w-7xl mx-auto space-y-6"><PageHeading eyebrow="Dashboard / District analytics" title={districtName || 'District analytics'} detail="All figures below are read from the configured district and institution APIs." />
    {dataStatus && dataStatus.data && <div className={`border rounded-xl px-4 py-3 text-xs ${dataStatus.data.source === 'internet' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}><strong>{dataStatus.data.source === 'internet' ? 'Live internet dataset active' : dataStatus.data.source === 'mysql' ? 'Using local MySQL dataset' : 'Using fallback dataset'}</strong><span className="ml-2">Last checked {dataStatus.data.lastSyncedAt ? new Date(dataStatus.data.lastSyncedAt).toLocaleString() : 'not yet'}.</span>{dataStatus.data.error && <span className="block mt-1">Live source notice: {dataStatus.data.error}</span>}</div>}
    {summary && !summary.loading && !summary.error && <MetricGrid values={[['Districts', summary.data?.totalDistricts], ['Registered', summary.data?.totalRegistered], ['Approved', summary.data?.totalApproved], ['Pending', summary.data?.totalPending], ['Average coverage', `${formatValue(summary.data?.averageCoverage)}%`]]} />}
    <div className="flex flex-wrap gap-3 items-center"><select value={districtName} onChange={(event) => onDistrictChange(event.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" disabled={districts.loading}>{Object.keys(districts || {}).map((name) => <option key={name} value={name}>{name}</option>)}</select><button onClick={onBack} className="text-xs font-semibold text-indigo-700 flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Back</button></div>
    {!selectedDistrict ? <State>Select a district returned by the API.</State> : <><MetricGrid values={[['Institutions', selectedDistrict.instCount], ['Registered', selectedDistrict.regCount], ['Approved', selectedDistrict.approvedCount], ['Pending', selectedDistrict.pendingCount], ['Coverage', `${formatValue(selectedDistrict.coverage)}%`]]} />
      <section><h2 className="text-lg font-bold text-slate-900 mb-3">Configurable categories</h2>{!selectedDistrict.categories?.length ? <State>No categories are configured for this district.</State> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{selectedDistrict.categories.map((item) => <button key={item.id} onClick={() => onCategory(item.id)} className={`text-left bg-white border rounded-xl p-5 transition ${categoryId === item.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-400'}`}><CategoryIcon id={item.id} /><h3 className="font-bold text-slate-900 mt-4">{item.name}</h3><p className="text-xs text-slate-500 mt-1">{item.sub}</p><div className="grid grid-cols-2 gap-3 mt-5 text-xs"><Value label="Institutions" value={item.total} /><Value label="Students" value={item.students} /><Value label="Approved" value={item.approved} /><Value label="Rate" value={item.rate} /></div></button>)}</div>}</section>
      {category && <section className="bg-white border border-slate-200 rounded-xl p-5"><div className="flex flex-wrap justify-between gap-3 items-center"><div><h2 className="font-bold text-slate-900">{category.name} institutions</h2><p className="text-xs text-slate-500 mt-1">Institution-level values are returned by the backend.</p></div><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs" placeholder="Search returned records" /></div></div>{!filtered.length ? <div className="py-8 text-center text-sm text-slate-500">No institution records match this filter.</div> : <div className="overflow-x-auto mt-4"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100"><tr><th className="p-3">Institution</th><th className="p-3">Applied</th><th className="p-3">Approved</th><th className="p-3">Pending</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} onClick={() => onInstitution(item.id)} className="hover:bg-indigo-50 cursor-pointer"><td className="p-3 font-semibold text-slate-800">{item.name}<span className="block text-[10px] text-slate-400">{item.id}</span></td><td className="p-3">{item.applied}</td><td className="p-3 text-emerald-700 font-semibold">{item.approved}</td><td className="p-3 text-amber-700 font-semibold">{item.pending}</td><td className="p-3">{item.pct}</td></tr>)}</tbody></table></div>}</section>}
      {selectedInstitution && <section className="bg-slate-900 text-white rounded-xl p-5"><div className="flex items-start gap-3"><ShieldCheck className="w-5 h-5 text-emerald-300 mt-0.5" /><div><h2 className="font-bold">Human review context</h2><p className="text-xs text-slate-300 mt-1">{selectedInstitution.name} has {selectedInstitution.pending} pending records and an API-reported rate of {selectedInstitution.pct}. Any final action must be recorded by an authorized officer.</p></div></div></section>}
    </>}
  </div>;
}

function StudentPortal() {
  const overview = useApi('/api/student/overview', null);
  return <div className="max-w-5xl mx-auto space-y-6"><PageHeading eyebrow="Student portal" title="Scholarship applications" detail="Open scholarships, eligibility, documents, applications, and complaints are loaded from the student service." />{overview.loading ? <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State> : overview.error ? <State><ErrorMessage message={overview.error} /></State> : overview.data ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><PortalCard icon={GraduationCap} title="Open scholarships" value={overview.data.openScholarships} /><PortalCard icon={ClipboardList} title="Applications" value={overview.data.applications} /><PortalCard icon={UploadCloud} title="Documents" value={overview.data.documents} /><PortalCard icon={MessageSquare} title="Complaints" value={overview.data.complaints} /></div> : <State><p className="font-semibold text-slate-700">Student records are not available yet.</p><p className="text-xs mt-2">Connect the student profile and scholarship APIs to enable applications, uploads, eligibility, and complaints.</p></State>}<RecommendationPanel /></div>;
}

function InstitutionVerificationBoard({ onForwardToGovernment }) {
  const initialApplications = [
    {
      id: 1012,
      studentName: 'Aisha Nair',
      studentId: 'STU-2048',
      course: 'B.E. Computer Science',
      department: 'CSE',
      year: '2nd Year',
      enrollmentStatus: 'Pending',
      documents: [
        { name: 'College ID', status: 'Pending' },
        { name: 'Bonafide Certificate', status: 'Pending' },
        { name: 'Marks Card', status: 'Pending' }
      ]
    },
    {
      id: 1014,
      studentName: 'Rohit Kumar',
      studentId: 'STU-3189',
      course: 'B.Com',
      department: 'Commerce',
      year: '1st Year',
      enrollmentStatus: 'Verified',
      documents: [
        { name: 'College ID', status: 'Verified' },
        { name: 'Bonafide Certificate', status: 'Correction required' },
        { name: 'Admission Proof', status: 'Pending' }
      ]
    }
  ];

  const [applications, setApplications] = useState(initialApplications);
  const [selectedDocumentSet, setSelectedDocumentSet] = useState(null);

  const getDocumentPreview = (documentName) => {
    if (documentName === 'College ID') return 'This is the student card copy with institution name, student\'s photo, enrollment number, and valid academic year details.';
    if (documentName === 'Bonafide Certificate') return 'This certificate confirms the student is enrolled and in good standing at the institution for the current academic period.';
    if (documentName === 'Marks Card') return 'This academic record lists the student\'s latest semester exam results and grade representation for review.';
    return 'The uploaded file confirms the student\'s identity and academic record as submitted for scholarship verification.';
  };

  const updateEnrollment = (id, nextStatus) => {
    setApplications((current) => current.map((application) => application.id === id ? { ...application, enrollmentStatus: nextStatus } : application));
  };

  const updateDocumentStatus = (applicationId, docName, nextStatus) => {
    setApplications((current) => current.map((application) => application.id === applicationId ? { ...application, documents: application.documents.map((doc) => doc.name === docName ? { ...doc, status: nextStatus } : doc) } : application));
  };

  const verifyApplication = (application) => {
    const forwarded = {
      id: application.id,
      student: application.studentName,
      scholarship: 'Pending scholarship review',
      institute: 'Institution verification complete',
      status: 'Sent to government approval',
      applicationId: application.id,
      studentId: application.studentId,
      course: application.course,
      department: application.department,
      year: application.year,
      enrollmentStatus: application.enrollmentStatus,
      documents: application.documents,
      scholarshipId: application.id
    };
    onForwardToGovernment?.(forwarded);
    setApplications((current) => current.filter((item) => item.id !== application.id));
  };

  return <div className="max-w-7xl mx-auto space-y-6"><PageHeading eyebrow="Institution workspace" title="Institution verification" detail="Review student enrollment and document authenticity before forwarding eligible scholarship applications." />
    {!applications.length ? <State>No applications are pending for institution verification.</State> : <div className="space-y-5">{applications.map((application) => <section key={application.id} className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap justify-between gap-3 items-center"><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Application #{application.id}</p><h2 className="text-xl font-bold text-slate-900 mt-1">{application.studentName}</h2></div><span className="bg-amber-50 text-amber-700 rounded-full px-3 py-1 text-xs font-bold">Review pending</span></div>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <Value label="Student ID / USN" value={application.studentId} />
        <Value label="Course" value={application.course} />
        <Value label="Department" value={application.department} />
        <Value label="Year" value={application.year} />
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-bold text-slate-900">Enrollment status</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Verified', 'Not enrolled', 'Pending'].map((status) => <button type="button" key={status} onClick={() => updateEnrollment(application.id, status)} className={`rounded-lg px-3 py-2 text-xs font-bold border ${application.enrollmentStatus === status ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200'}`}>{status}</button>)}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-bold text-slate-900">Document verification</h3>
        <div className="mt-4 space-y-3">{application.documents.map((doc) => <div key={doc.name} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
          <div className="flex flex-wrap justify-between gap-3 items-center"><div><p className="font-semibold text-slate-800">{doc.name}</p><p className="text-[11px] text-slate-500 mt-1">Status: {doc.status}</p></div><div className="flex flex-wrap gap-2">
            {['Verified', 'Invalid', 'Correction required', 'Pending'].map((status) => <button type="button" key={status} onClick={() => updateDocumentStatus(application.id, doc.name, status)} className={`rounded px-2 py-1 text-[10px] font-bold border ${doc.status === status ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200'}`}>{status}</button>)}
          </div></div>
        </div>)}</div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => setSelectedDocumentSet(application.documents)} className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold">View document</button>
        <button type="button" onClick={() => verifyApplication(application)} className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-xs font-bold">Verify</button>
        <button type="button" className="bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold">Send back for correction</button>
      </div>
    </section>)}</div>}

    {selectedDocumentSet && <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Submitted documents</p>
            <h3 className="text-lg font-bold text-slate-900">Student document review</h3>
          </div>
          <button type="button" onClick={() => setSelectedDocumentSet(null)} className="text-sm font-semibold text-slate-500">Close</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {selectedDocumentSet.map((doc) => (
            <div key={doc.name} className="border border-slate-200 rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{doc.name}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Status: {doc.status}</p>
                </div>
                <span className="rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1">Submitted</span>
              </div>
              <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-600 leading-6">
                <p className="font-semibold text-slate-800 mb-2">Document preview</p>
                <p>{getDocumentPreview(doc.name)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>}
  </div>;
}

function GovernmentOfficerBoard({ pendingApprovals, onApprove }) {
  return <div className="max-w-7xl mx-auto space-y-6"><PageHeading eyebrow="Government officer" title="Pending scholarship decisions" detail="Review student eligibility, institution verification, and final scholarship approval." />
    {!pendingApprovals?.length ? <State>No institution-verified applications are waiting for government approval.</State> : <div className="bg-white border border-slate-200 rounded-xl p-5"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100"><tr><th className="p-3">Student</th><th className="p-3">Scholarship</th><th className="p-3">Institute</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{pendingApprovals.map((item) => <tr key={item.id}><td className="p-3 font-semibold text-slate-800">{item.student}</td><td className="p-3">{item.scholarship}</td><td className="p-3">{item.institute}</td><td className="p-3"><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">{item.status}</span></td><td className="p-3"><button type="button" onClick={() => onApprove?.(item.id)} className="bg-indigo-700 text-white rounded-lg px-3 py-2 font-bold">Approve</button></td></tr>)}</tbody></table></div></div>}
  </div>;
}

function StudentApplications({ onBrowse }) {
  const applications = useApi('/api/applications/my', []);
  const rows = Array.isArray(applications.data) ? applications.data : [];
  return <div className="max-w-6xl mx-auto space-y-6"><PageHeading eyebrow="Student portal / applications" title="My applications" detail="Track scholarship submissions, uploaded documents, and the latest readiness assessment." />
    {applications.loading ? <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State> : applications.error ? <State><ErrorMessage message={applications.error} /></State> : !rows.length ? <State><p>No applications have been submitted yet.</p><button type="button" onClick={onBrowse} className="mt-4 bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-bold">Browse open scholarships</button></State> : <div className="space-y-3">{rows.map((application) => <article key={application.id} className="bg-white border border-slate-200 rounded-xl p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-slate-900">{application.scholarship_name}</h2><p className="text-xs text-slate-500 mt-1">Application #{application.id} Â· {application.provider}</p></div><span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">{application.status}</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs"><Value label="Amount" value={application.amount} /><Value label="Documents" value={application.document_count} /><Value label="Readiness" value={application.readiness_score == null ? 'Pending' : `${application.readiness_score}%`} /><Value label="Submitted" value={String(application.submitted_at).slice(0, 10)} /></div></article>)}</div>}
  </div>;
}

function ComplaintManagement() {
  const [refresh, setRefresh] = useState(0);
  const options = useApi('/api/complaints/options', { categories: [], scholarships: [] });
  const applications = useApi('/api/complaints/application-options', []);
  const complaints = useApi(`/api/complaints/my?refresh=${refresh}`, []);
  const [form, setForm] = useState({ scholarship_id: '', application_id: '', category_id: '', description: '' });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setMessage('');
    const body = new FormData(); Object.entries(form).forEach(([key, value]) => value && body.append(key, value)); if (file) body.append('supporting_document', file);
    try { const result = await submitMultipart('/api/complaints', body); setMessage(`Complaint ${result.id} submitted. AI classification is pending and is not an official finding.`); setForm({ scholarship_id: '', application_id: '', category_id: '', description: '' }); setFile(null); setRefresh((current) => current + 1); } catch (error) { setMessage(error.message); }
  };
  return <div className="max-w-5xl mx-auto space-y-6"><PageHeading eyebrow="Student portal / grievances" title="Complaints and support" detail="Submit a complaint using your authenticated student session and track official responses." /><form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="text-xs font-semibold text-slate-600">Scholarship<select name="scholarship_id" value={form.scholarship_id} onChange={update} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm"><option value="">Select scholarship</option>{options.data.scholarships?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Application<select name="application_id" value={form.application_id} onChange={update} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm"><option value="">Select application</option>{applications.data?.filter((item) => !form.scholarship_id || String(item.scholarship_id) === String(form.scholarship_id)).map((item) => <option key={item.id} value={item.id}>#{item.id} Â· {item.scholarship_name}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Category (optional)<select name="category_id" value={form.category_id} onChange={update} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm"><option value="">Select category</option>{options.data.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label className="text-xs font-semibold text-slate-600">Complaint description<textarea name="description" value={form.description} onChange={update} required className="mt-1 w-full border border-slate-200 rounded-lg p-3 text-sm min-h-28" placeholder="Describe the issue" /></label><label className="text-xs font-semibold text-slate-600">Supporting document (optional)<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files[0])} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm" /></label><button disabled={!form.description.trim()} className="bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2 text-xs font-bold">Submit complaint</button>{message && <p className="text-xs text-indigo-700">{message}</p>}</form><section><h2 className="text-lg font-bold text-slate-900 mb-3">My complaints</h2>{complaints.loading ? <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State> : complaints.error ? <State><ErrorMessage message={complaints.error} /></State> : !complaints.data?.length ? <State>No complaints have been submitted.</State> : <div className="space-y-3">{complaints.data.map((complaint) => <article key={complaint.id} className="bg-white border border-slate-200 rounded-xl p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold text-slate-900">Complaint #{complaint.id}</h3><p className="text-xs text-slate-500 mt-1">{complaint.scholarship_name || 'General support'} Â· {new Date(complaint.created_at).toLocaleDateString()}</p></div><span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">{complaint.status_key}</span></div><p className="text-sm text-slate-600 mt-3">{complaint.description}</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs"><Value label="AI classification" value={complaint.ai_classification || 'Pending'} /><Value label="Probable reason" value={complaint.probable_reason || 'Pending'} /><Value label="Duplicate status" value={Number(complaint.duplicate_count) ? 'Review pending' : 'No match recorded'} /></div>{complaint.official_response && <p className="mt-3 text-xs text-emerald-800 bg-emerald-50 rounded p-3">Official response: {complaint.official_response}</p>}<p className="text-[10px] text-amber-700 mt-3">AI labels are predictions, not official findings.</p></article>)}</div>}</section></div>;
}

function StudentComplaintManagement() {
  const [refresh, setRefresh] = useState(0);
  const options = useApi('/api/complaints/options', { categories: [], scholarships: [], statuses: [] });
  const applications = useApi('/api/complaints/application-options', []);
  const complaints = useApi(`/api/complaints/my?refresh=${refresh}`, []);
  const [form, setForm] = useState({ scholarship_id: '', application_id: '', category_id: '', description: '' });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateScholarship = (event) => setForm((current) => ({ ...current, scholarship_id: event.target.value, application_id: '' }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value) body.append(key, value);
    });
    if (file) body.append('supporting_document', file);

    try {
      const result = await submitMultipart('/api/complaints', body);
      setMessage(`Complaint #${result.id} submitted. The AI classification is an AI-generated prediction and not an official finding.`);
      setForm({ scholarship_id: '', application_id: '', category_id: '', description: '' });
      setFile(null);
      setRefresh((current) => current + 1);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const complaintList = Array.isArray(complaints.data) ? complaints.data : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Student portal / grievances"
        title="Complaints and support"
        detail="Submit a complaint using your authenticated student session and track official responses."
      />

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {options.error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{options.error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-slate-600">
            Scholarship
            <select name="scholarship_id" value={form.scholarship_id} onChange={updateScholarship} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm">
              <option value="">Select scholarship</option>
              {options.data?.scholarships?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Application
            <select name="application_id" value={form.application_id} onChange={update} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm">
              <option value="">{applications.loading ? 'Loading applications...' : applications.data?.length ? 'Select application' : 'No applications found'}</option>
              {Array.isArray(applications.data) && applications.data
                ?.filter((item) => !form.scholarship_id || String(item.scholarship_id) === String(form.scholarship_id))
                .map((item) => <option key={item.id} value={item.id}>#{item.id} Â· {item.scholarship_name}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Category (optional)
            <select name="category_id" value={form.category_id} onChange={update} className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm">
              <option value="">{options.loading ? 'Loading categories...' : options.data?.categories?.length ? 'Select category' : 'No categories available'}</option>
              {options.data?.categories?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>

        <label className="text-xs font-semibold text-slate-600 block">
          Complaint description
          <textarea
            name="description"
            value={form.description}
            onChange={update}
            required
            className="mt-1 w-full border border-slate-200 rounded-lg p-3 text-sm min-h-28"
            placeholder="Describe the issue"
          />
        </label>

        <label className="text-xs font-semibold text-slate-600 block">
          Supporting document (if required)
          <input
            type="file"
            accept=".pdf,.txt,.jpg,.jpeg,.png"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="mt-1 w-full border border-slate-200 rounded-lg p-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700"
          />
        </label>

        {message && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {message}
          </div>
        )}

        <button type="submit" className="bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-bold">
          Submit complaint
        </button>
      </form>

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My grievance history</h2>
            <p className="text-xs text-slate-500 mt-1">AI-generated predictions are clearly marked and not official findings.</p>
          </div>
        </div>

        {complaints.loading ? (
          <State><Loader2 className="w-5 h-5 animate-spin mx-auto" /></State>
        ) : complaints.error ? (
          <State><ErrorMessage message={complaints.error} /></State>
        ) : complaintList.length === 0 ? (
          <State>No complaints submitted yet.</State>
        ) : (
          <div className="space-y-4">
            {complaintList.map((item) => (
              <article key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Complaint ID</p>
                    <h3 className="text-lg font-black text-slate-900">#{item.id}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Current status</p>
                    <span className="inline-flex rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-[10px] font-bold">
                      {item.status_label || item.status_key || 'Submitted'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm text-slate-700">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Submitted date</p>
                    <p className="mt-1 font-semibold">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Duplicate status</p>
                    <p className="mt-1 font-semibold">
                      {item.duplicate_status === 'possible_duplicate' ? 'Possible duplicate under review' : 'No duplicate match'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">AI classification</p>
                    <p className="mt-1 font-semibold text-amber-700">AI-generated prediction: {item.ai_classification || 'Pending classification'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Probable reason</p>
                    <p className="mt-1 font-semibold text-amber-700">{item.probable_reason || 'No probable reason recorded yet'}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Complaint</p>
                  <p className="mt-1 text-sm text-slate-700">{item.description}</p>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Official response / action</p>
                  <p className="mt-1 text-sm text-slate-700">{item.official_response || 'No official response is available yet.'}</p>
                </div>

                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  AI-generated prediction: not an official finding.
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const recommendationDocuments = ['Government ID proof', 'Income certificate', 'Academic marksheet', 'Admission proof'];

function RecommendationPanel() {
  const [studentId, setStudentId] = useState(process.env.REACT_APP_DEV_STUDENT_ID || '');
  const [state, setState] = useState({ data: null, loading: false, error: '' });
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [documentsRequested, setDocumentsRequested] = useState(false);
  const [documents, setDocuments] = useState({});
  const load = async () => {
    if (!documentsRequested) { setDocumentsRequested(true); return; }
    const missing = recommendationDocuments.filter((name) => !documents[name]);
    if (missing.length) { setState((current) => ({ ...current, error: `Please select: ${missing.join(', ')}.` })); return; }
    setState({ data: null, loading: true, error: '' });
    try {
      const documentPayload = Object.entries(documents).map(([name, file]) => ({ name, text: `${name}: ${file.name}` }));
      setState({ data: await fetchJson('/api/recommendations', 'POST', { student_id: studentId, documents: documentPayload }), loading: false, error: '' });
    } catch (error) { setState({ data: null, loading: false, error: error.message }); }
  };
  const recommendations = state.data?.catalog_recommendations || [];
  if (selectedScholarship) return <ApplicationForm scholarshipId={selectedScholarship.scholarship.id} initialStudentId={studentId} initialFiles={selectedScholarship.files} onClose={() => setSelectedScholarship(null)} />;
  return <section className="bg-white border border-slate-200 rounded-xl p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Scholarship recommendations</h2><p className="text-xs text-slate-500 mt-1">Upload the required documents so your profile can be matched against the scholarship catalog.</p></div><span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-1 rounded">AI assistance</span></div><div className="flex flex-wrap gap-2 mt-4"><input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Student ID" className="border border-slate-200 rounded-lg px-3 py-2 text-xs" /><button onClick={load} disabled={!studentId.trim() || state.loading} className="bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg px-3 py-2 text-xs font-bold">{state.loading ? 'Analyzing documents...' : documentsRequested ? 'Analyze documents and find scholarships' : 'Find suitable scholarships'}</button></div>{documentsRequested && <div className="mt-5 border border-indigo-100 bg-indigo-50/40 rounded-lg p-4"><h3 className="text-sm font-bold text-slate-900">Required documents</h3><p className="text-xs text-slate-600 mt-1">Select each document before analysis.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">{recommendationDocuments.map((name) => <label key={name} className="text-xs font-semibold text-slate-700">{name}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" onChange={(event) => setDocuments((current) => ({ ...current, [name]: event.target.files?.[0] }))} className="mt-1 w-full border border-slate-200 rounded-lg bg-white p-2 text-xs" /></label>)}</div></div>}{state.error && <p className="text-xs text-rose-700 mt-3">{state.error}</p>}{recommendations.length > 0 && <div className="space-y-3 mt-5">{recommendations.map((item, index) => { const scholarship = item.scholarship; return <article key={scholarship.id} className="border border-slate-200 rounded-lg p-4"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">#{index + 1} recommended</p><h3 className="font-bold text-slate-900 mt-1">{scholarship.name}</h3><p className="text-xs text-slate-500 mt-1">{scholarship.provider} Â· {scholarship.category}</p></div><div className="text-right"><p className="text-xs font-black text-indigo-700">{(Number(item.score) * 100).toFixed(1)}% match</p><button onClick={() => setSelectedScholarship({ scholarship, files: documents })} className="mt-2 bg-indigo-700 text-white rounded-lg px-3 py-2 text-xs font-bold">Apply</button></div></div><p className="text-xs text-slate-600 mt-3">{item.eligibility || scholarship.eligible_course || 'Review the eligibility requirements before applying.'}</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs"><Value label="Award" value={item.award || scholarship.amount} /><Value label="Deadline" value={item.deadline || scholarship.end_date} /><Value label="Status" value={item.status || scholarship.status} /></div></article>; })}</div>}{state.data && !recommendations.length && <p className="text-xs text-slate-500 mt-4">{state.data.message || 'No recommendation results are available.'}</p>}</section>;
}

function PageHeading({ eyebrow, title, detail }) { return <div><p className="text-xs font-semibold text-slate-500">{eyebrow}</p><h1 className="text-2xl font-black text-slate-900 mt-2">{title}</h1><p className="text-sm text-slate-500 mt-1">{detail}</p></div>; }
function MetricGrid({ values }) { return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">{values.map(([label, value]) => <div key={label} className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p><p className="text-xl font-black text-slate-900 mt-2">{formatValue(value)}</p></div>)}</div>; }
function Value({ label, value }) { return <div><span className="block text-[10px] uppercase font-bold text-slate-400">{label}</span><span className="font-bold text-slate-800">{formatValue(value)}</span></div>; }
function CategoryIcon({ id }) { const Icon = id === 'schools' ? School : id === 'univ' ? GraduationCap : id === 'pg' ? BookOpen : Building2; return <span className="inline-flex p-2 rounded-lg bg-indigo-50 text-indigo-700"><Icon className="w-5 h-5" /></span>; }
function PortalCard({ icon: Icon, title, value }) { return <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4"><span className="p-3 rounded-lg bg-indigo-50 text-indigo-700"><Icon className="w-5 h-5" /></span><div><p className="text-xs text-slate-500">{title}</p><p className="text-xl font-black text-slate-900 mt-1">{formatValue(value)}</p></div></div>; }
function ErrorMessage({ message }) { return <span className="inline-flex items-center gap-2 text-rose-700"><AlertTriangle className="w-4 h-4" />{message}</span>; }
