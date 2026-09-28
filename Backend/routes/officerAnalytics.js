/**
 * routes/officerAnalytics.js
 *
 * Government Officer Scholarship Analytics API
 * Provides high-performance, database-aggregated metrics across districts,
 * monthly trends, status distributions, and deep-dive district analytics.
 *
 * Security: Strict session authentication + GOVERNMENT/ADMIN role enforcement.
 */

function buildFilterClauses(query) {
  const clauses = [];
  const params = [];

  const district = (query.district || '').trim();
  if (district && district !== 'ALL' && district !== 'All districts') {
    if (district === 'Unassigned') {
      clauses.push('(i.district IS NULL OR i.district = "")');
    } else {
      clauses.push('i.district = ?');
      params.push(district);
    }
  }

  const startDate = (query.startDate || '').trim();
  if (startDate) {
    clauses.push('DATE(a.created_at) >= ?');
    params.push(startDate);
  }

  const endDate = (query.endDate || '').trim();
  if (endDate) {
    clauses.push('DATE(a.created_at) <= ?');
    params.push(endDate);
  }

  const scholarshipId = Number(query.scholarshipId);
  if (scholarshipId && Number.isSafeInteger(scholarshipId) && scholarshipId > 0) {
    clauses.push('a.scholarship_id = ?');
    params.push(scholarshipId);
  }

  const status = (query.status || '').trim().toUpperCase();
  if (status && status !== 'ALL') {
    if (status === 'PENDING') {
      clauses.push("a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED')");
    } else {
      clauses.push('a.status = ?');
      params.push(status);
    }
  }

  const institutionId = (query.institutionId || '').trim();
  if (institutionId && institutionId !== 'ALL') {
    clauses.push('a.institution_id = ?');
    params.push(institutionId);
  }

  const academicYear = (query.academicYear || '').trim();
  if (academicYear && academicYear !== 'ALL') {
    const parts = academicYear.split('-');
    const yStart = Number(parts[0]);
    if (yStart && yStart >= 2020 && yStart <= 2040) {
      clauses.push('a.created_at >= ? AND a.created_at < ?');
      params.push(`${yStart}-06-01 00:00:00`, `${yStart + 1}-06-01 00:00:00`);
    }
  }

  return { clauses, params };
}

function registerRoutes(app, pool, fail, requireAuth, role) {
  const officerAuth = [requireAuth, role('GOVERNMENT', 'ADMIN')];

  /**
   * 1. Overview Analytics & High-Level KPIs
   * GET /api/officer/analytics/overview
   */
  async function getOverview(req, res) {
    try {
      const { clauses, params } = buildFilterClauses(req.query);
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      // Main aggregate query
      const [[summary]] = await pool.query(
        `SELECT
          COUNT(a.id) as total_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_applications,
          SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_applications,
          SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending_applications,
          SUM(CASE WHEN a.status = 'DRAFT' THEN 1 ELSE 0 END) as draft_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as total_amount_approved,
          COUNT(DISTINCT a.student_id) as total_students,
          COUNT(DISTINCT a.institution_id) as total_institutions
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN scholarships s ON a.scholarship_id = s.id
        ${whereSql}`,
        params
      );

      const total = Number(summary?.total_applications || 0);
      const approved = Number(summary?.approved_applications || 0);
      const rejected = Number(summary?.rejected_applications || 0);
      const pending = Number(summary?.pending_applications || 0);
      const draft = Number(summary?.draft_applications || 0);
      const amount = Number(summary?.total_amount_approved || 0);

      const approvalRate = total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0;
      const rejectionRate = total > 0 ? Number(((rejected / total) * 100).toFixed(1)) : 0;
      const pendingRate = total > 0 ? Number(((pending / total) * 100).toFixed(1)) : 0;

      // Status distribution
      const [statusRows] = await pool.query(
        `SELECT
          a.status,
          COUNT(a.id) as count
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN scholarships s ON a.scholarship_id = s.id
        ${whereSql}
        GROUP BY a.status
        ORDER BY count DESC`,
        params
      );

      const statusMap = {
        APPROVED: { label: 'Approved', color: '#10b981' },
        REJECTED: { label: 'Rejected', color: '#ef4444' },
        INSTITUTION_VERIFICATION: { label: 'Institution Verification', color: '#f59e0b' },
        DOCUMENT_VERIFICATION: { label: 'Document Verification', color: '#6366f1' },
        UNDER_REVIEW: { label: 'Under Review', color: '#3b82f6' },
        CORRECTION_REQUIRED: { label: 'Correction Required', color: '#ec4899' },
        SUBMITTED: { label: 'Submitted', color: '#8b5cf6' },
        DRAFT: { label: 'Draft', color: '#94a3b8' }
      };

      const statusDistribution = statusRows.map(r => ({
        status: r.status,
        label: statusMap[r.status]?.label || r.status.replace(/_/g, ' '),
        color: statusMap[r.status]?.color || '#64748b',
        count: Number(r.count),
        percentage: total > 0 ? Number(((r.count / total) * 100).toFixed(1)) : 0
      }));

      // Filter options for dropdowns
      const [districtsList] = await pool.query('SELECT district_name FROM districts ORDER BY district_name ASC');
      const [scholarshipsList] = await pool.query('SELECT id, name FROM scholarships WHERE status = "active" ORDER BY name ASC');
      const [institutionsList] = await pool.query('SELECT id, name, district FROM institutions ORDER BY name ASC');

      res.json({
        success: true,
        data: {
          kpi: {
            totalApplications: total,
            approvedApplications: approved,
            rejectedApplications: rejected,
            pendingApplications: pending,
            draftApplications: draft,
            overallApprovalRate: approvalRate,
            overallRejectionRate: rejectionRate,
            overallPendingRate: pendingRate,
            totalAmountApproved: amount,
            totalStudents: Number(summary?.total_students || 0),
            totalInstitutions: Number(summary?.total_institutions || 0)
          },
          statusDistribution,
          filterOptions: {
            districts: districtsList.map(d => d.district_name),
            scholarships: scholarshipsList,
            institutions: institutionsList,
            statuses: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'PENDING', label: 'Pending (Any Stage)' },
              { value: 'INSTITUTION_VERIFICATION', label: 'Institution Verification' },
              { value: 'DOCUMENT_VERIFICATION', label: 'Document Verification' },
              { value: 'UNDER_REVIEW', label: 'Under Review' },
              { value: 'CORRECTION_REQUIRED', label: 'Correction Required' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'DRAFT', label: 'Draft' }
            ],
            academicYears: ['2026-2027', '2025-2026']
          }
        }
      });
    } catch (err) {
      console.error('Error fetching overview analytics:', err);
      fail(res, 500, 'Failed to compute analytics overview.');
    }
  }

  app.get('/api/officer/analytics/overview', officerAuth, getOverview);
  app.get('/api/government/analytics/overview', officerAuth, getOverview);

  /**
   * 2. District Analytics List & Performance Metrics
   * GET /api/officer/analytics/districts
   */
  async function getDistricts(req, res) {
    try {
      const { clauses, params } = buildFilterClauses(req.query);
      const appFilterSql = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

      // 1. Group applications by institution district
      const [portalDistricts] = await pool.query(
        `SELECT
          COALESCE(i.district, 'Unassigned') as district_name,
          COUNT(a.id) as total_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_applications,
          SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_applications,
          SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as total_amount_approved,
          COUNT(DISTINCT a.institution_id) as active_institutions
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN scholarships s ON a.scholarship_id = s.id
        WHERE 1=1 ${appFilterSql}
        GROUP BY COALESCE(i.district, 'Unassigned')`,
        params
      );

      // Create lookup map
      const portalMap = {};
      portalDistricts.forEach(d => {
        portalMap[d.district_name] = {
          total: Number(d.total_applications || 0),
          approved: Number(d.approved_applications || 0),
          rejected: Number(d.rejected_applications || 0),
          pending: Number(d.pending_applications || 0),
          amount: Number(d.total_amount_approved || 0),
          institutions: Number(d.active_institutions || 0)
        };
      });

      // 2. Fetch all districts from districts reference table
      const [registryDistricts] = await pool.query(
        'SELECT district_name, district_code, reg_count, inst_count, coverage FROM districts ORDER BY district_name ASC'
      );

      const districtResults = [];

      for (const reg of registryDistricts) {
        const name = reg.district_name;
        const portalData = portalMap[name] || { total: 0, approved: 0, rejected: 0, pending: 0, amount: 0, institutions: 0 };
        const regCountRaw = String(reg.reg_count || '').replace(/[^0-9]/g, '');
        const registeredStudents = regCountRaw ? Number(regCountRaw) : null;

        const total = portalData.total;
        const approved = portalData.approved;
        const rejected = portalData.rejected;
        const pending = portalData.pending;

        const approvalRate = total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0;
        const rejectionRate = total > 0 ? Number(((rejected / total) * 100).toFixed(1)) : 0;
        const pendingRate = total > 0 ? Number(((pending / total) * 100).toFixed(1)) : 0;

        let applicationRate = null;
        let applicationRateNote = null;

        if (registeredStudents && registeredStudents > 0) {
          applicationRate = Number(((total / registeredStudents) * 100).toFixed(2));
        } else {
          applicationRateNote = 'Application rate unavailable — eligible student denominator not available.';
        }

        districtResults.push({
          districtName: name,
          districtCode: reg.district_code || '',
          registeredStudents,
          totalApplications: total,
          approvedApplications: approved,
          rejectedApplications: rejected,
          pendingApplications: pending,
          approvalRate,
          rejectionRate,
          pendingRate,
          applicationRate,
          applicationRateNote,
          totalAmountApproved: portalData.amount,
          institutionCount: portalData.institutions || Number(String(reg.inst_count || 0).replace(/[^0-9]/g, '')),
          coverage: Number(reg.coverage || 0)
        });
      }

      // Add 'Unassigned' if there are unassigned portal applications
      if (portalMap['Unassigned'] && portalMap['Unassigned'].total > 0) {
        const unassigned = portalMap['Unassigned'];
        const total = unassigned.total;
        districtResults.push({
          districtName: 'Unassigned',
          districtCode: 'N/A',
          registeredStudents: null,
          totalApplications: total,
          approvedApplications: unassigned.approved,
          rejectedApplications: unassigned.rejected,
          pendingApplications: unassigned.pending,
          approvalRate: total > 0 ? Number(((unassigned.approved / total) * 100).toFixed(1)) : 0,
          rejectionRate: total > 0 ? Number(((unassigned.rejected / total) * 100).toFixed(1)) : 0,
          pendingRate: total > 0 ? Number(((unassigned.pending / total) * 100).toFixed(1)) : 0,
          applicationRate: null,
          applicationRateNote: 'Application rate unavailable — eligible student denominator not available.',
          totalAmountApproved: unassigned.amount,
          institutionCount: 0,
          coverage: 0
        });
      }

      // Compute state benchmarks across active districts
      const activeDistricts = districtResults.filter(d => d.totalApplications > 0 && d.districtName !== 'Unassigned');
      const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const stateBenchmarks = {
        totalDistrictsTracked: registryDistricts.length,
        districtsWithPortalActivity: activeDistricts.length,
        avgApplicationsPerDistrict: Number(mean(activeDistricts.map(d => d.totalApplications)).toFixed(1)),
        avgApprovalRate: Number(mean(activeDistricts.map(d => d.approvalRate)).toFixed(1)),
        avgPendingRate: Number(mean(activeDistricts.map(d => d.pendingRate)).toFixed(1))
      };

      // Part 8: Identify districts with lower application activity & lower approval rates
      // Using objective data sorting without prejudice
      const lowerActivity = [...activeDistricts]
        .sort((a, b) => a.totalApplications - b.totalApplications)
        .slice(0, 5)
        .map(d => ({
          districtName: d.districtName,
          totalApplications: d.totalApplications,
          approvedApplications: d.approvedApplications,
          pendingApplications: d.pendingApplications,
          rejectedApplications: d.rejectedApplications,
          approvalRate: d.approvalRate,
          metricComparison: `${d.totalApplications} applications (vs state average ${stateBenchmarks.avgApplicationsPerDistrict})`
        }));

      const lowerApproval = [...activeDistricts]
        .sort((a, b) => a.approvalRate - b.approvalRate)
        .slice(0, 5)
        .map(d => ({
          districtName: d.districtName,
          totalApplications: d.totalApplications,
          approvedApplications: d.approvedApplications,
          pendingApplications: d.pendingApplications,
          rejectedApplications: d.rejectedApplications,
          approvalRate: d.approvalRate,
          metricComparison: `${d.approvalRate}% approval rate (vs state benchmark ${stateBenchmarks.avgApprovalRate}%)`
        }));

      res.json({
        success: true,
        data: {
          districts: districtResults,
          stateBenchmarks,
          lowerActivityDistricts: lowerActivity,
          lowerApprovalDistricts: lowerApproval
        }
      });
    } catch (err) {
      console.error('Error fetching districts analytics:', err);
      fail(res, 500, 'Failed to compute district analytics.');
    }
  }

  app.get('/api/officer/analytics/districts', officerAuth, getDistricts);
  app.get('/api/government/analytics/districts', officerAuth, getDistricts);

  /**
   * 3. Single District Deep-Dive Analytics
   * GET /api/officer/analytics/district/:district
   */
  async function getDistrictDetails(req, res) {
    try {
      const districtName = decodeURIComponent(req.params.district || '').trim();
      if (!districtName) return fail(res, 400, 'District name is required.');

      const isUnassigned = districtName === 'Unassigned';
      const instCondition = isUnassigned ? '(i.district IS NULL OR i.district = "")' : 'i.district = ?';
      const instParams = isUnassigned ? [] : [districtName];

      // Summary KPIs
      const [[summary]] = await pool.query(
        `SELECT
          COUNT(a.id) as total_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_applications,
          SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_applications,
          SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as total_amount_approved,
          COUNT(DISTINCT a.institution_id) as active_institutions,
          COUNT(DISTINCT a.student_id) as total_students
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN scholarships s ON a.scholarship_id = s.id
        WHERE ${instCondition}`,
        instParams
      );

      const total = Number(summary?.total_applications || 0);
      const approved = Number(summary?.approved_applications || 0);
      const rejected = Number(summary?.rejected_applications || 0);
      const pending = Number(summary?.pending_applications || 0);
      const amount = Number(summary?.total_amount_approved || 0);

      // Registry reference
      const [[registry]] = isUnassigned ? [[]] : await pool.query(
        'SELECT * FROM districts WHERE district_name = ? LIMIT 1',
        [districtName]
      );

      const regCountRaw = String(registry?.reg_count || '').replace(/[^0-9]/g, '');
      const registeredStudents = regCountRaw ? Number(regCountRaw) : null;
      let applicationRate = null;
      let applicationRateNote = null;

      if (registeredStudents && registeredStudents > 0) {
        applicationRate = Number(((total / registeredStudents) * 100).toFixed(2));
      } else {
        applicationRateNote = 'Application rate unavailable — eligible student denominator not available.';
      }

      // Monthly trends
      const [monthlyRows] = await pool.query(
        `SELECT
          DATE_FORMAT(a.created_at, '%Y-%m') as month,
          COUNT(a.id) as applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as amount
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN scholarships s ON a.scholarship_id = s.id
        WHERE ${instCondition}
        GROUP BY DATE_FORMAT(a.created_at, '%Y-%m')
        ORDER BY month ASC`,
        instParams
      );

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTrends = monthlyRows.map(m => {
        const [year, monthNum] = (m.month || '').split('-').map(Number);
        return {
          month: m.month,
          label: monthNum ? `${monthNames[monthNum - 1]} ${year}` : m.month,
          applications: Number(m.applications),
          approved: Number(m.approved),
          rejected: Number(m.rejected),
          pending: Number(m.pending),
          amount: Number(m.amount)
        };
      });

      // Scholarship breakdown
      const [scholarshipRows] = await pool.query(
        `SELECT
          s.id,
          s.name as scholarship_name,
          s.provider,
          COUNT(a.id) as applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as total_amount
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        JOIN scholarships s ON a.scholarship_id = s.id
        WHERE ${instCondition}
        GROUP BY s.id, s.name, s.provider
        ORDER BY applications DESC
        LIMIT 10`,
        instParams
      );

      // Institution breakdown
      const [institutionRows] = await pool.query(
        `SELECT
          COALESCE(i.id, 'unassigned') as id,
          COALESCE(i.name, 'Unassigned Institution') as institution_name,
          COALESCE(i.code, 'N/A') as code,
          COUNT(a.id) as applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as total_amount
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN scholarships s ON a.scholarship_id = s.id
        WHERE ${instCondition}
        GROUP BY i.id, i.name, i.code
        ORDER BY applications DESC
        LIMIT 10`,
        instParams
      );

      const institutionBreakdown = institutionRows.map(inst => ({
        id: inst.id,
        name: inst.institution_name,
        code: inst.code,
        applications: Number(inst.applications),
        approved: Number(inst.approved),
        rejected: Number(inst.rejected),
        pending: Number(inst.pending),
        approvalRate: inst.applications > 0 ? Number(((inst.approved / inst.applications) * 100).toFixed(1)) : 0,
        amount: Number(inst.total_amount)
      }));

      // Status distribution
      const [statusRows] = await pool.query(
        `SELECT a.status, COUNT(a.id) as count
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        WHERE ${instCondition}
        GROUP BY a.status`,
        instParams
      );

      res.json({
        success: true,
        data: {
          district: districtName,
          summary: {
            totalApplications: total,
            approvedApplications: approved,
            rejectedApplications: rejected,
            pendingApplications: pending,
            approvalRate: total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0,
            rejectionRate: total > 0 ? Number(((rejected / total) * 100).toFixed(1)) : 0,
            pendingRate: total > 0 ? Number(((pending / total) * 100).toFixed(1)) : 0,
            totalAmountApproved: amount,
            activeInstitutions: Number(summary?.active_institutions || 0),
            totalStudents: Number(summary?.total_students || 0),
            registeredStudents,
            applicationRate,
            applicationRateNote
          },
          registry: registry || null,
          monthlyTrends,
          scholarshipBreakdown: scholarshipRows.map(s => ({
            id: s.id,
            name: s.scholarship_name,
            provider: s.provider,
            applications: Number(s.applications),
            approved: Number(s.approved),
            rejected: Number(s.rejected),
            pending: Number(s.pending),
            amount: Number(s.total_amount)
          })),
          institutionBreakdown,
          statusDistribution: statusRows.map(r => ({
            status: r.status,
            label: r.status.replace(/_/g, ' '),
            count: Number(r.count)
          }))
        }
      });
    } catch (err) {
      console.error('Error fetching single district details:', err);
      fail(res, 500, 'Failed to fetch district details.');
    }
  }

  app.get('/api/officer/analytics/district/:district', officerAuth, getDistrictDetails);
  app.get('/api/government/analytics/district/:district', officerAuth, getDistrictDetails);

  /**
   * 4. Monthly Trend Analytics
   * GET /api/officer/analytics/trends
   */
  async function getTrends(req, res) {
    try {
      const { clauses, params } = buildFilterClauses(req.query);
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const [monthlyRows] = await pool.query(
        `SELECT
          DATE_FORMAT(a.created_at, '%Y-%m') as month,
          COUNT(a.id) as total_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_applications,
          SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_applications,
          SUM(CASE WHEN a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW','CORRECTION_REQUIRED','SUBMITTED') THEN 1 ELSE 0 END) as pending_applications,
          SUM(CASE WHEN a.status = 'APPROVED' THEN COALESCE(s.amount, 0) ELSE 0 END) as total_amount_approved
        FROM applications a
        LEFT JOIN institutions i ON a.institution_id = i.id
        LEFT JOIN scholarships s ON a.scholarship_id = s.id
        ${whereSql}
        GROUP BY DATE_FORMAT(a.created_at, '%Y-%m')
        ORDER BY month ASC`,
        params
      );

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trends = monthlyRows.map(m => {
        const [year, monthNum] = (m.month || '').split('-').map(Number);
        const total = Number(m.total_applications || 0);
        const approved = Number(m.approved_applications || 0);
        return {
          month: m.month,
          label: monthNum ? `${monthNames[monthNum - 1]} ${year}` : m.month,
          totalApplications: total,
          approvedApplications: approved,
          rejectedApplications: Number(m.rejected_applications || 0),
          pendingApplications: Number(m.pending_applications || 0),
          approvalRate: total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0,
          totalAmountApproved: Number(m.total_amount_approved || 0)
        };
      });

      res.json({
        success: true,
        data: trends
      });
    } catch (err) {
      console.error('Error fetching trends analytics:', err);
      fail(res, 500, 'Failed to compute monthly trends.');
    }
  }

  app.get('/api/officer/analytics/trends', officerAuth, getTrends);
  app.get('/api/government/analytics/trends', officerAuth, getTrends);
}

module.exports = { registerRoutes };
