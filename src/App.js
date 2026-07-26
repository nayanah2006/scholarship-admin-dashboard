import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Lightbulb,
  Bell,
  Download,
  Filter,
  Search,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Building2,
  GraduationCap,
  School,
  BookOpen,
  PieChart,
  Megaphone,
  CheckSquare,
  FileCheck
} from 'lucide-react';

// ==========================================
// DYNAMIC PORTAL DATASTORE
// ==========================================
const portalData = {
  "Bengaluru Urban": {
    code: "101",
    instCount: "2,410",
    regCount: "452,103",
    approvedCount: "398,401",
    pendingCount: "53,702",
    coverage: 88,
    categories: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 1432, students: "425k", approved: "284,102", rate: "82.4%", badge: "+2.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Vocational & Junior Colleges", total: 648, students: "186k", approved: "142,509", rate: "75.1%", badge: "-0.5%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 82, students: "312k", approved: "198,334", rate: "90.2%", badge: "+5.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 124, students: "45k", approved: "32,110", rate: "62.8%", badge: "STABLE", badgeColor: "bg-slate-100 text-slate-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        { id: "PU12849", name: "Government PU College, Jayanagar", total: "1,240", applied: "1,140", pct: "92%", approved: "1,140", rejected: "40", pending: "60", disbursed: "₹12.4L" },
        { id: "PU33012", name: "St. Joseph's Pre-University College", total: "2,850", applied: "2,109", pct: "74%", approved: "2,109", rejected: "121", pending: "620", disbursed: "₹28.5L" },
        { id: "PU88211", name: "Seshadripuram PU College, Yelahanka", total: "1,890", applied: "907", pct: "48%", approved: "907", rejected: "93", pending: "890", disbursed: "₹9.8L" },
        { id: "PU00291", name: "Mount Carmel Pre-University College", total: "3,200", applied: "2,816", pct: "88%", approved: "2,816", rejected: "70", pending: "314", disbursed: "₹34.1L" },
      ],
      schools: [
        { id: "SCH101", name: "Government High School, Malleshwaram", total: "850", applied: "800", pct: "94%", approved: "780", rejected: "10", pending: "10", disbursed: "₹5.2L" },
        { id: "SCH102", name: "National High School, Basavanagudi", total: "1,100", applied: "950", pct: "86%", approved: "910", rejected: "25", pending: "15", disbursed: "₹7.8L" }
      ],
      univ: [
        { id: "UNV001", name: "Bangalore University, Jnana Bharathi", total: "12,400", applied: "11,800", pct: "95%", approved: "11,200", rejected: "300", pending: "300", disbursed: "₹1.4Cr" }
      ],
      pg: [
        { id: "PG001", name: "Indian Institute of Science (IISc)", total: "3,200", applied: "2,900", pct: "90%", approved: "2,800", rejected: "50", pending: "50", disbursed: "₹85L" }
      ]
    }
  },
  "Mysuru": {
    code: "104",
    instCount: "1,120",
    regCount: "184,200",
    approvedCount: "152,400",
    pendingCount: "31,800",
    coverage: 76,
    categories: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 680, students: "110k", approved: "92,100", rate: "83.7%", badge: "+1.2%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Vocational & Junior Colleges", total: 310, students: "45k", approved: "38,200", rate: "84.8%", badge: "+3.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 24, students: "82k", approved: "68,400", rate: "83.4%", badge: "+0.8%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 42, students: "18k", approved: "14,200", rate: "78.8%", badge: "+1.5%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        { id: "PU2201", name: "Maharanis PU College for Women, Mysuru", total: "2,100", applied: "1,950", pct: "92%", approved: "1,880", rejected: "30", pending: "40", disbursed: "₹21.0L" },
        { id: "PU2202", name: "Marimallappa PU College, Mysuru", total: "1,980", applied: "1,800", pct: "90%", approved: "1,750", rejected: "20", pending: "30", disbursed: "₹18.5L" }
      ]
    }
  },
  "Belagavi": {
    code: "112",
    instCount: "1,450",
    regCount: "212,800",
    approvedCount: "168,400",
    pendingCount: "44,400",
    coverage: 82,
    categories: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 890, students: "130k", approved: "105,000", rate: "80.7%", badge: "+0.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Vocational & Junior Colleges", total: 420, students: "58k", approved: "44,100", rate: "76.0%", badge: "-1.2%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen }
    ],
    institutions: {
      pu: [
        { id: "PU3301", name: "RLS Pre-University College, Belagavi", total: "1,500", applied: "1,350", pct: "90%", approved: "1,280", rejected: "40", pending: "30", disbursed: "₹14.2L" }
      ]
    }
  },
  "Hubballi-Dharwad": {
    code: "118", instCount: "890", regCount: "125,400", approvedCount: "108,200", pendingCount: "17,200", coverage: 86,
    categories: [{ id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 240, students: "35k", approved: "29,100", rate: "83.1%", badge: "+2.0%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen }],
    institutions: { pu: [{ id: "PU4401", name: "Kittel Junior College, Dharwad", total: "1,100", applied: "980", pct: "89%", approved: "940", rejected: "20", pending: "20", disbursed: "₹10.1L" }] }
  },
  "Mangaluru": {
    code: "125", instCount: "740", regCount: "98,200", approvedCount: "89,500", pendingCount: "8,700", coverage: 91,
    categories: [{ id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 180, students: "28k", approved: "25,400", rate: "90.7%", badge: "+4.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen }],
    institutions: { pu: [{ id: "PU5501", name: "St. Aloysius PU College, Mangaluru", total: "3,100", applied: "2,950", pct: "95%", approved: "2,900", rejected: "25", pending: "25", disbursed: "₹32.0L" }] }
  },
  "Kalaburagi": {
    code: "132", instCount: "1,210", regCount: "165,900", approvedCount: "112,400", pendingCount: "53,500", coverage: 68,
    categories: [{ id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 390, students: "48k", approved: "32,100", rate: "66.8%", badge: "-3.5%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen }],
    institutions: { pu: [{ id: "PU6601", name: "Government PU College, Kalaburagi", total: "1,600", applied: "1,100", pct: "68%", approved: "980", rejected: "60", pending: "60", disbursed: "₹9.5L" }] }
  }
};

export default function App() {
  // Navigation State
  // View 1: District Grid
  // View 2: District Category Overview
  // View 3: Institution Table
  // View 4: Institution Analytics
  const [currentView, setCurrentView] = useState(1);
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [selectedCategoryId, setSelectedCategoryId] = useState('pu');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('PU12849');

  // Navigate helpers
  const handleSelectDistrict = (distName) => {
    if (portalData[distName]) {
      setSelectedDistrict(distName);
      setCurrentView(2);
    } else {
      alert(`Data for ${distName} is being synchronized from state servers.`);
    }
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    setCurrentView(3);
  };

  const handleSelectInstitution = (instId) => {
    setSelectedInstitutionId(instId);
    setCurrentView(4);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-800 flex flex-col font-sans">
      {/* GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView(1)}>
          <div className="p-2 bg-indigo-950 text-white rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Karnataka Scholarship Portal
          </h1>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <button 
            onClick={() => setCurrentView(1)}
            className={`hover:text-indigo-600 ${currentView === 1 ? 'text-indigo-600 font-semibold underline underline-offset-8 decoration-2' : ''}`}
          >
            District Dashboard
          </button>
          <button className="hover:text-indigo-600">Institution Map</button>
          <button className="hover:text-indigo-600">Scheme Performance</button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <button className="relative p-1.5 rounded-full hover:bg-slate-100 text-slate-600">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
            AD
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-6 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-sm">
                KA
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Admin Panel</h2>
                <p className="text-xs text-slate-500">Education Dept. KA</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button 
                onClick={() => setCurrentView(1)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 1 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentView(2)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 2 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button 
                onClick={() => setCurrentView(3)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 3 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Reports
              </button>
              <button 
                onClick={() => setCurrentView(4)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 4 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                AI Insights
              </button>
            </nav>
          </div>

          <div className="text-xs text-slate-400 px-3">
            System Version v2.4.0
          </div>
        </aside>

        {/* DYNAMIC VIEW ROUTER */}
        <main className="flex-1 p-8 overflow-y-auto">
          {currentView === 1 && (
            <View1DistrictGrid onSelectDistrict={handleSelectDistrict} />
          )}

          {currentView === 2 && (
            <View2Categories 
              districtName={selectedDistrict} 
              onSelectCategory={handleSelectCategory}
              onBack={() => setCurrentView(1)}
            />
          )}

          {currentView === 3 && (
            <View3CollegeList 
              districtName={selectedDistrict}
              categoryId={selectedCategoryId}
              onSelectCollege={handleSelectInstitution}
              onBack={() => setCurrentView(2)}
            />
          )}

          {currentView === 4 && (
            <View4Analytics 
              districtName={selectedDistrict}
              categoryId={selectedCategoryId}
              institutionId={selectedInstitutionId}
              onBack={() => setCurrentView(3)}
            />
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between text-xs text-slate-500">
        <div>
          <span className="font-semibold text-slate-700">KA Scholarship Monitoring</span> © 2024 Government of Karnataka | Monitoring Division
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Support</a>
          <a href="#" className="hover:underline">Data Governance</a>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// VIEW 1: DISTRICT PERFORMANCE GRID
// ==========================================
function View1DistrictGrid({ onSelectDistrict }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="text-xs text-slate-500 font-medium">
        Dashboard &gt; <span className="text-slate-800">Karnataka District Analytics</span>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Academic Year</label>
              <select className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none">
                <option>2023-2024</option>
                <option>2024-2025</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Scholarship Scheme</label>
              <select className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none">
                <option>SSP Post-Matric</option>
                <option>SSP Pre-Matric</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
              <Download className="w-3.5 h-3.5" />
              Export State Report
            </button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded absolute top-3 right-3">+12% vs LY</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Applications</p>
            <p className="text-2xl font-black text-slate-900">2,482,901</p>
          </div>
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded absolute top-3 right-3">84.2% Rate</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Approved Claims</p>
            <p className="text-2xl font-black text-slate-900">2,091,012</p>
          </div>
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded absolute top-3 right-3">₹ 4.2k Cr</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Disbursed Amount</p>
            <p className="text-2xl font-black text-slate-900">₹ 3,842.50 Cr</p>
          </div>
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded absolute top-3 right-3">Active Institutions</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Enrolled Entities</p>
            <p className="text-2xl font-black text-slate-900">18,294</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">District Performance Grid</h2>
          <p className="text-xs text-slate-500">Real-time scholarship monitoring across 31 administrative districts. Click any card to drill down.</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg">
          <button className="p-1.5 bg-slate-100 rounded text-slate-700"><Grid className="w-4 h-4" /></button>
          <button className="p-1.5 text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(portalData).map(([distName, data]) => (
          <div 
            key={distName}
            onClick={() => onSelectDistrict(distName)}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition rounded-xl">
                    <Building2 className="w-5 h-5 text-slate-700 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition">{distName}</h3>
                    <p className="text-[11px] text-slate-400">District Code: {data.code}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-400 block">INSTITUTIONS</span>
                  <span className="font-bold text-slate-800">{data.instCount}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-400 block">REGISTERED</span>
                  <span className="font-bold text-slate-800">{data.regCount}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">APPROVED</span>
                  <span className="font-bold text-indigo-600">{data.approvedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">PENDING</span>
                  <span className="font-bold text-red-500">{data.pendingCount}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500">Scholarship Coverage</span>
                <span className="text-slate-800">{data.coverage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${data.coverage > 80 ? 'bg-indigo-900' : 'bg-amber-500'}`} 
                  style={{ width: `${data.coverage}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// VIEW 2: INSTITUTION CATEGORIES VIEW
// ==========================================
function View2Categories({ districtName, onSelectCategory, onBack }) {
  const district = portalData[districtName];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <button onClick={onBack} className="hover:underline text-indigo-600">Dashboard</button>
        <span>&gt;</span>
        <span>Karnataka</span>
        <span>&gt;</span>
        <span className="text-slate-800 font-semibold">{districtName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{districtName} Categories</h2>
          <p className="text-xs text-slate-500 mt-1">Select an institution category to inspect active scholarship performance metrics in {districtName}.</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          ← Back to All Districts
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {district?.categories?.map((cat) => {
          const IconComponent = cat.icon || School;
          return (
            <div 
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-600 hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition rounded-xl">
                    <IconComponent className="w-6 h-6 text-slate-700 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600">{cat.name}</h3>
                    <p className="text-[11px] text-slate-400">{cat.sub}</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs mb-8">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Total Institutions</span>
                    <span className="text-2xl font-black text-slate-900">{cat.total}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Total Students</span>
                    <span className="text-2xl font-black text-slate-900">{cat.students}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Scholarships</span>
                    <span className="text-2xl font-black text-slate-900">{cat.approved}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Approval Rate</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-black text-slate-900">{cat.rate}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.badgeColor}`}>
                        {cat.badge}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-indigo-600 font-bold text-xs flex items-center justify-between group-hover:translate-x-1 transition-transform">
                View All Institutions
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-indigo-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <PieChart className="w-6 h-6" />
          </div>
          <div className="max-w-2xl">
            <h4 className="font-bold text-slate-900 text-sm mb-1">District Performance Summary</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-800">{districtName}</span> is currently operating with a scholarship coverage rate of <span className="font-bold text-indigo-700">{district.coverage}%</span> across {district.instCount} registered entities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW 3: INSTITUTION LIST TABLE
// ==========================================
function View3CollegeList({ districtName, categoryId, onSelectCollege, onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const district = portalData[districtName];
  const category = district?.categories?.find(c => c.id === categoryId);
  const collegeList = district?.institutions?.[categoryId] || [];

  const filteredColleges = useMemo(() => {
    return collegeList.filter(col => 
      col.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      col.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [collegeList, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <button onClick={() => onBack()} className="hover:underline text-indigo-600">{districtName}</button>
        <span>&gt;</span>
        <span className="text-slate-800 font-semibold">{category?.name || 'Institutions'}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{category?.name || 'Institutions'}</h2>
          <p className="text-xs text-slate-500 mt-1">Showing institutions in {districtName}. Click any row to open deep analytics.</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          ← Back to Categories
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Institution name or code..." 
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Institution Details</th>
              <th className="p-4">Total</th>
              <th className="p-4">Applied</th>
              <th className="p-4">%</th>
              <th className="p-4">Approved</th>
              <th className="p-4">Rejected</th>
              <th className="p-4">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((col) => (
                <tr 
                  key={col.id} 
                  onClick={() => onSelectCollege(col.id)}
                  className="hover:bg-indigo-50/50 transition cursor-pointer group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                        <School className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition">{col.name}</span>
                        <span className="text-[10px] text-slate-400">Code: {col.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-slate-700">{col.total}</td>
                  <td className="p-4 font-semibold text-slate-700">{col.applied}</td>
                  <td className="p-4 font-bold text-indigo-900">{col.pct}</td>
                  <td className="p-4 font-semibold text-slate-700">{col.approved}</td>
                  <td className="p-4 font-bold text-red-500">{col.rejected}</td>
                  <td className="p-4 font-bold text-amber-600">{col.pending}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">
                  No institutions found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// VIEW 4: INSTITUTION ANALYTICS
// ==========================================
function View4Analytics({ districtName, categoryId, institutionId, onBack }) {
  const district = portalData[districtName];
  const list = district?.institutions?.[categoryId] || [];
  const inst = list.find(i => i.id === institutionId) || list[0] || { name: "Institution Analytics", total: "1,240", applied: "1,140", approved: "1,140", rejected: "40", pending: "60", disbursed: "₹12.4L" };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span>Dashboard</span>
        <span>&gt;</span>
        <span>{districtName}</span>
        <span>&gt;</span>
        <span className="text-slate-800 font-semibold">{inst.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Institution Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">Deep-dive scholarship performance metrics for {inst.name}.</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          ← Back to Institution List
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Students</span>
          <p className="text-xl font-black text-slate-900 mt-1">{inst.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Applications</span>
          <p className="text-xl font-black text-slate-900 mt-1">{inst.applied}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Approved</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{inst.approved}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Rejected</span>
          <p className="text-xl font-black text-red-500 mt-1">{inst.rejected}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Pending</span>
          <p className="text-xl font-black text-amber-500 mt-1">{inst.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Disbursed</span>
          <p className="text-xl font-black text-slate-900 mt-1">{inst.disbursed}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Gap Analysis</h3>
          <p className="text-xs text-slate-400 mb-6">Tracking non-applicants at {inst.name}</p>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Unaware of Schemes</span>
                <span>32%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full" style={{ width: '32%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Documentation Issues</span>
                <span>24%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: '24%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Aadhaar-Phone Mismatch</span>
                <span>12%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-300 h-full" style={{ width: '12%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <h3 className="font-bold text-slate-900 text-sm mb-4 text-left">Approval Status</h3>
          <div className="relative inline-flex items-center justify-center my-2">
            <div className="w-32 h-32 rounded-full border-8 border-emerald-500 border-t-red-500 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl font-black text-slate-900 block leading-tight">{inst.pct}</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">SUCCESS</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-6 text-xs font-semibold mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Approved ({inst.approved})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Rejected ({inst.rejected})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}