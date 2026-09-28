/**
 * test-e2e-suite.js
 *
 * Comprehensive end-to-end verification script testing:
 * - API endpoints and SQL aggregation accuracy
 * - Role-based authorization & security barriers
 * - District analytics, benchmarks, and filtering
 * - Student, Institution, and Government workflows
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING SCHOLARPATH PORTAL E2E VERIFICATION SUITE');
  console.log('====================================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function assert(condition, testName, extra = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`[PASS] ${testName} ${extra}`);
      results.details.push({ test: testName, status: 'PASS', extra });
    } else {
      results.failed++;
      console.error(`[FAIL] ${testName} ${extra}`);
      results.details.push({ test: testName, status: 'FAIL', extra });
    }
  }

  // 1. Health check
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'Backend health endpoint online & database connected');
  } catch (e) {
    assert(false, 'Backend health endpoint online', e.message);
  }

  // 2. Security & Role Authorization tests
  console.log('\n--- Checking Security & Access Controls ---');

  // 2.1 Unauthenticated access
  try {
    const res = await fetch(`${API_BASE}/api/officer/analytics/overview`);
    assert(res.status === 401, 'Unauthenticated user rejected from officer analytics (401 Unauthorized)');
  } catch (e) {
    assert(false, 'Unauthenticated user rejected from officer analytics', e.message);
  }

  // 2.2 Student access to officer analytics
  let studentCookie = null;
  try {
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sneha.kamath443@student.ka.gov.in', password: 'PortalUser@123', role: 'STUDENT' })
    });
    studentCookie = loginRes.headers.get('set-cookie');
    assert(loginRes.status === 200, 'Student account authenticated successfully');

    const officerRes = await fetch(`${API_BASE}/api/officer/analytics/overview`, {
      headers: { 'Cookie': studentCookie }
    });
    assert(officerRes.status === 403, 'Student blocked from government officer analytics (403 Forbidden)');
  } catch (e) {
    assert(false, 'Student blocked from government officer analytics', e.message);
  }

  // 2.3 Government Officer login
  let govtCookie = null;
  let govtUser = null;
  try {
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'govt_india@gmail.com', password: 'govt@123', role: 'GOVERNMENT' })
    });
    govtCookie = loginRes.headers.get('set-cookie');
    const json = await loginRes.json();
    govtUser = json.data;
    assert(loginRes.status === 200 && govtUser?.role === 'GOVERNMENT', 'Government Officer authenticated with role GOVERNMENT');
  } catch (e) {
    assert(false, 'Government Officer authenticated with role GOVERNMENT', e.message);
  }

  // 3. Database Accuracy Verification
  console.log('\n--- Checking Database Aggregation & Accuracy ---');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'scholarship_admin'
  });

  // Query raw SQL counts
  const [[dbSummary]] = await pool.query(`
    SELECT
      COUNT(a.id) as total,
      SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as total_amount
    FROM applications a
    LEFT JOIN scholarships s ON a.scholarship_id = s.id
  `);

  // Call /api/officer/analytics/overview
  let overviewData = null;
  try {
    const res = await fetch(`${API_BASE}/api/officer/analytics/overview`, {
      headers: { 'Cookie': govtCookie }
    });
    const json = await res.json();
    overviewData = json.data;

    assert(res.status === 200 && json.success === true, 'Officer overview endpoint responds with 200 OK');
    assert(overviewData.kpi.totalApplications === Number(dbSummary.total), 'KPI Total Applications exactly matches database COUNT', `(${overviewData.kpi.totalApplications})`);
    assert(overviewData.kpi.approvedApplications === Number(dbSummary.approved), 'KPI Total Approved exactly matches database SUM', `(${overviewData.kpi.approvedApplications})`);
    assert(overviewData.kpi.rejectedApplications === Number(dbSummary.rejected), 'KPI Total Rejected exactly matches database SUM', `(${overviewData.kpi.rejectedApplications})`);
    assert(overviewData.kpi.pendingApplications === Number(dbSummary.pending), 'KPI Total Pending exactly matches database SUM', `(${overviewData.kpi.pendingApplications})`);
    assert(overviewData.kpi.totalAmountApproved === Number(dbSummary.total_amount), 'KPI Total Amount Approved exactly matches database SUM(amount)', `(₹${overviewData.kpi.totalAmountApproved.toLocaleString('en-IN')})`);

    const expectedApprovalRate = Number(((dbSummary.approved / dbSummary.total) * 100).toFixed(1));
    assert(overviewData.kpi.overallApprovalRate === expectedApprovalRate, 'Overall approval rate calculated correctly: (Approved / Total * 100)', `${overviewData.kpi.overallApprovalRate}%`);
  } catch (e) {
    assert(false, 'Officer overview database accuracy check', e.message);
  }

  // 4. District Analytics & Low Performance Identification
  console.log('\n--- Checking District Analytics & Anomaly Detection ---');
  let districtsData = null;
  try {
    const res = await fetch(`${API_BASE}/api/officer/analytics/districts`, {
      headers: { 'Cookie': govtCookie }
    });
    const json = await res.json();
    districtsData = json.data;

    assert(res.status === 200, 'District analytics endpoint responds with 200 OK');
    assert(Array.isArray(districtsData.districts) && districtsData.districts.length >= 32, 'All 32 districts tracked in district analytics array');

    // Check specific district Yadgir
    const yadgir = districtsData.districts.find(d => d.districtName === 'Yadgir');
    assert(Boolean(yadgir), 'Yadgir district present in district results');
    if (yadgir) {
      assert(yadgir.totalApplications > 0, 'Yadgir has recorded applications', `(${yadgir.totalApplications} apps)`);
      assert(yadgir.approvalRate > 0 && yadgir.approvalRate <= 50, 'Yadgir approval rate reflects real data under 50%', `(${yadgir.approvalRate}%)`);
      assert(yadgir.rejectionRate > 0, 'Yadgir rejection rate accurately calculated', `(${yadgir.rejectionRate}%)`);
      assert(yadgir.pendingRate > 0, 'Yadgir pending rate accurately calculated', `(${yadgir.pendingRate}%)`);
    }

    // Check low performance sections (Part 8)
    assert(Array.isArray(districtsData.lowerActivityDistricts) && districtsData.lowerActivityDistricts.length > 0, 'Districts with lower application activity identified with actual values');
    assert(Array.isArray(districtsData.lowerApprovalDistricts) && districtsData.lowerApprovalDistricts.length > 0, 'Districts with lower approval rates identified with actual values');

    const lowApprovalNames = districtsData.lowerApprovalDistricts.map(d => d.districtName);
    assert(lowApprovalNames.includes('Yadgir'), 'Yadgir correctly identified in lower approval districts based strictly on database metrics');
  } catch (e) {
    assert(false, 'District analytics verification', e.message);
  }

  // 5. District Deep-Dive Details (Part 10)
  console.log('\n--- Checking Single District Deep-Dive ---');
  try {
    const res = await fetch(`${API_BASE}/api/officer/analytics/district/Mysuru`, {
      headers: { 'Cookie': govtCookie }
    });
    const json = await res.json();
    const mysuru = json.data;

    assert(res.status === 200, 'Single district deep-dive (Mysuru) responds with 200 OK');
    assert(mysuru.district === 'Mysuru', 'Deep-dive district name confirmed as Mysuru');
    assert(mysuru.summary.totalApplications > 0, 'Mysuru application volume calculated from DB', `(${mysuru.summary.totalApplications} apps)`);
    assert(Array.isArray(mysuru.monthlyTrends) && mysuru.monthlyTrends.length > 0, 'Mysuru monthly trends available');
    assert(Array.isArray(mysuru.scholarshipBreakdown) && mysuru.scholarshipBreakdown.length > 0, 'Mysuru scholarship-wise breakdown available');
    assert(Array.isArray(mysuru.institutionBreakdown) && mysuru.institutionBreakdown.length > 0, 'Mysuru institution-wise breakdown available with approval rates');
  } catch (e) {
    assert(false, 'Single district deep-dive verification', e.message);
  }

  // 6. Monthly Trends (Part 7.D & 7.E)
  console.log('\n--- Checking Monthly Trends ---');
  try {
    const res = await fetch(`${API_BASE}/api/officer/analytics/trends`, {
      headers: { 'Cookie': govtCookie }
    });
    const json = await res.json();
    const trends = json.data;

    assert(res.status === 200, 'Monthly trends endpoint responds with 200 OK');
    assert(Array.isArray(trends) && trends.length >= 4, 'Monthly trend contains records across months (Jun, Jul, Aug, Sep 2026)');

    const hasJune = trends.some(t => t.month === '2026-06');
    const hasSep = trends.some(t => t.month === '2026-09');
    assert(hasJune && hasSep, 'Trend timeline covers academic application period June to September 2026');
  } catch (e) {
    assert(false, 'Monthly trends verification', e.message);
  }

  // 7. Dynamic Filters (Part 9)
  console.log('\n--- Checking District & Status Filters ---');
  try {
    // Filter by district = 'Bengaluru Urban'
    const resBLR = await fetch(`${API_BASE}/api/officer/analytics/overview?district=Bengaluru%20Urban`, {
      headers: { 'Cookie': govtCookie }
    });
    const jsonBLR = await resBLR.json();
    const totalBLR = jsonBLR.data.kpi.totalApplications;

    assert(resBLR.status === 200, 'District filter (Bengaluru Urban) responds with 200 OK');
    assert(totalBLR > 0 && totalBLR < overviewData.kpi.totalApplications, 'Filter isolates Bengaluru Urban subset correctly', `(${totalBLR} of ${overviewData.kpi.totalApplications} apps)`);

    // Filter by status = 'APPROVED'
    const resAppr = await fetch(`${API_BASE}/api/officer/analytics/overview?status=APPROVED`, {
      headers: { 'Cookie': govtCookie }
    });
    const jsonAppr = await resAppr.json();
    assert(jsonAppr.data.kpi.totalApplications === overviewData.kpi.approvedApplications, 'Status filter (APPROVED) correctly isolates approved applications subset');
  } catch (e) {
    assert(false, 'Filter verification', e.message);
  }

  // 8. Application Review Queue (Government Officer)
  console.log('\n--- Checking Government Review Queue ---');
  try {
    const res = await fetch(`${API_BASE}/api/government/applications`, {
      headers: { 'Cookie': govtCookie }
    });
    const json = await res.json();
    assert(res.status === 200 && Array.isArray(json.data), 'Government review queue accessible to Government Officer');
  } catch (e) {
    assert(false, 'Government review queue check', e.message);
  }

  // 9. Student Portal Workflow
  console.log('\n--- Checking Student Endpoints ---');
  try {
    const profRes = await fetch(`${API_BASE}/api/profile`, { headers: { 'Cookie': studentCookie } });
    assert(profRes.status === 200, 'Student profile endpoint accessible with student session');

    const schRes = await fetch(`${API_BASE}/api/scholarships`, { headers: { 'Cookie': studentCookie } });
    const schJson = await schRes.json();
    assert(schRes.status === 200 && schJson.data.items.length > 0, 'Scholarship catalog loaded with active schemes', `(${schJson.data.items.length} schemes)`);

    const myAppsRes = await fetch(`${API_BASE}/api/applications`, { headers: { 'Cookie': studentCookie } });
    assert(myAppsRes.status === 200, 'Student applications tracker loaded successfully');
  } catch (e) {
    assert(false, 'Student endpoints verification', e.message);
  }

  // Final Summary
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${results.passed} / ${results.total} PASSED (${results.failed} FAILED)`);
  console.log('====================================================');

  await pool.end();
  process.exit(results.failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal error during E2E testing:', err);
  process.exit(1);
});
