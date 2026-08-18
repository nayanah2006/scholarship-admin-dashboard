require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

const fallbackPortalData = {
  'Bengaluru Urban': {
    code: '101',
    instCount: '2,410',
    regCount: '452,103',
    approvedCount: '398,401',
    pendingCount: '53,702',
    coverage: 88,
    categories: [
      { id: 'schools', name: 'Schools', sub: 'Primary & Secondary Education', total: 1432, students: '425k', approved: '284,102', rate: '82.4%', badge: '+2.1%', badgeColor: 'bg-emerald-50 text-emerald-600' },
      { id: 'pu', name: 'Pre-University Colleges', sub: 'Vocational & Junior Colleges', total: 648, students: '186k', approved: '142,509', rate: '75.1%', badge: '-0.5%', badgeColor: 'bg-red-50 text-red-600' },
      { id: 'univ', name: 'Universities', sub: 'Undergraduate & Tech Studies', total: 82, students: '312k', approved: '198,334', rate: '90.2%', badge: '+5.4%', badgeColor: 'bg-emerald-50 text-emerald-600' },
      { id: 'pg', name: 'Postgraduate Institutions', sub: 'Masters, Doctoral & Research', total: 124, students: '45k', approved: '32,110', rate: '62.8%', badge: 'STABLE', badgeColor: 'bg-slate-100 text-slate-600' }
    ],
    institutions: {
      pu: [
        { id: 'PU12849', name: "Government PU College, Jayanagar", total: '1,240', applied: '1,140', pct: '92%', approved: '1,140', rejected: '40', pending: '60', disbursed: '₹12.4L' },
        { id: 'PU33012', name: "St. Joseph's Pre-University College", total: '2,850', applied: '2,109', pct: '74%', approved: '2,109', rejected: '121', pending: '620', disbursed: '₹28.5L' },
        { id: 'PU88211', name: 'Seshadripuram PU College, Yelahanka', total: '1,890', applied: '907', pct: '48%', approved: '907', rejected: '93', pending: '890', disbursed: '₹9.8L' },
        { id: 'PU00291', name: 'Mount Carmel Pre-University College', total: '3,200', applied: '2,816', pct: '88%', approved: '2,816', rejected: '70', pending: '314', disbursed: '₹34.1L' }
      ],
      schools: [
        { id: 'SCH101', name: 'Government High School, Malleshwaram', total: '850', applied: '800', pct: '94%', approved: '780', rejected: '10', pending: '10', disbursed: '₹5.2L' },
        { id: 'SCH102', name: 'National High School, Basavanagudi', total: '1,100', applied: '950', pct: '86%', approved: '910', rejected: '25', pending: '15', disbursed: '₹7.8L' }
      ],
      univ: [
        { id: 'UNV001', name: 'Bangalore University, Jnana Bharathi', total: '12,400', applied: '11,800', pct: '95%', approved: '11,200', rejected: '300', pending: '300', disbursed: '₹1.4Cr' }
      ],
      pg: [
        { id: 'PG001', name: 'Indian Institute of Science (IISc)', total: '3,200', applied: '2,900', pct: '90%', approved: '2,800', rejected: '50', pending: '50', disbursed: '₹85L' }
      ]
    }
  },
  Mysuru: {
    code: '104',
    instCount: '1,120',
    regCount: '184,200',
    approvedCount: '152,400',
    pendingCount: '31,800',
    coverage: 76,
    categories: [
      { id: 'schools', name: 'Schools', sub: 'Primary & Secondary Education', total: 680, students: '110k', approved: '92,100', rate: '83.7%', badge: '+1.2%', badgeColor: 'bg-emerald-50 text-emerald-600' },
      { id: 'pu', name: 'Pre-University Colleges', sub: 'Vocational & Junior Colleges', total: 310, students: '45k', approved: '38,200', rate: '84.8%', badge: '+3.1%', badgeColor: 'bg-emerald-50 text-emerald-600' },
      { id: 'univ', name: 'Universities', sub: 'Undergraduate & Tech Studies', total: 24, students: '82k', approved: '68,400', rate: '83.4%', badge: '+0.8%', badgeColor: 'bg-emerald-50 text-emerald-600' },
      { id: 'pg', name: 'Postgraduate Institutions', sub: 'Masters, Doctoral & Research', total: 42, students: '18k', approved: '14,200', rate: '78.8%', badge: '+1.5%', badgeColor: 'bg-emerald-50 text-emerald-600' }
    ],
    institutions: {
      pu: [
        { id: 'PU2201', name: 'Maharanis PU College for Women, Mysuru', total: '2,100', applied: '1,950', pct: '92%', approved: '1,880', rejected: '30', pending: '40', disbursed: '₹21.0L' },
        { id: 'PU2202', name: 'Marimallappa PU College, Mysuru', total: '1,980', applied: '1,800', pct: '90%', approved: '1,750', rejected: '20', pending: '30', disbursed: '₹18.5L' }
      ]
    }
  },
  Belagavi: {
    code: '112',
    instCount: '1,450',
    regCount: '212,800',
    approvedCount: '168,400',
    pendingCount: '44,400',
    coverage: 82,
    categories: [
      { id: 'schools', name: 'Schools', sub: 'Primary & Secondary Education', total: 890, students: '130k', approved: '105,000', rate: '80.7%', badge: '+0.4%', badgeColor: 'bg-emerald-50 text-emerald-600' },
      { id: 'pu', name: 'Pre-University Colleges', sub: 'Vocational & Junior Colleges', total: 420, students: '58k', approved: '44,100', rate: '76.0%', badge: '-1.2%', badgeColor: 'bg-red-50 text-red-600' }
    ],
    institutions: {
      pu: [
        { id: 'PU3301', name: 'RLS Pre-University College, Belagavi', total: '1,500', applied: '1,350', pct: '90%', approved: '1,280', rejected: '40', pending: '30', disbursed: '₹14.2L' }
      ]
    }
  },
  'Hubballi-Dharwad': {
    code: '118',
    instCount: '890',
    regCount: '125,400',
    approvedCount: '108,200',
    pendingCount: '17,200',
    coverage: 86,
    categories: [
      { id: 'pu', name: 'Pre-University Colleges', sub: 'Junior Colleges', total: 240, students: '35k', approved: '29,100', rate: '83.1%', badge: '+2.0%', badgeColor: 'bg-emerald-50 text-emerald-600' }
    ],
    institutions: {
      pu: [
        { id: 'PU4401', name: 'Kittel Junior College, Dharwad', total: '1,100', applied: '980', pct: '89%', approved: '940', rejected: '20', pending: '20', disbursed: '₹10.1L' }
      ]
    }
  },
  Mangaluru: {
    code: '125',
    instCount: '740',
    regCount: '98,200',
    approvedCount: '89,500',
    pendingCount: '8,700',
    coverage: 91,
    categories: [
      { id: 'pu', name: 'Pre-University Colleges', sub: 'Junior Colleges', total: 180, students: '28k', approved: '25,400', rate: '90.7%', badge: '+4.1%', badgeColor: 'bg-emerald-50 text-emerald-600' }
    ],
    institutions: {
      pu: [
        { id: 'PU5501', name: 'St. Aloysius PU College, Mangaluru', total: '3,100', applied: '2,950', pct: '95%', approved: '2,900', rejected: '25', pending: '25', disbursed: '₹32.0L' }
      ]
    }
  },
  Kalaburagi: {
    code: '132',
    instCount: '1,210',
    regCount: '165,900',
    approvedCount: '112,400',
    pendingCount: '53,500',
    coverage: 68,
    categories: [
      { id: 'pu', name: 'Pre-University Colleges', sub: 'Junior Colleges', total: 390, students: '48k', approved: '32,100', rate: '66.8%', badge: '-3.5%', badgeColor: 'bg-red-50 text-red-600' }
    ],
    institutions: {
      pu: [
        { id: 'PU6601', name: 'Government PU College, Kalaburagi', total: '1,600', applied: '1,100', pct: '68%', approved: '980', rejected: '60', pending: '60', disbursed: '₹9.5L' }
      ]
    }
  }
};

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scholarship_admin',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  multipleStatements: true,
};

const pool = mysql.createPool(dbConfig);
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

async function initializeDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.query(schemaSql);
    console.log('Database schema and seed data verified.');
  } catch (error) {
    console.warn('Database initialization skipped. MySQL may not be running yet.');
    console.warn(error.message);
  } finally {
    connection.release();
  }
}

function buildSummary(portalData) {
  const districts = Object.entries(portalData || {});

  const totalRegistered = districts.reduce((sum, [, item]) => {
    return sum + Number(String(item.regCount || '0').replace(/,/g, ''));
  }, 0);

  const totalApproved = districts.reduce((sum, [, item]) => {
    return sum + Number(String(item.approvedCount || '0').replace(/,/g, ''));
  }, 0);

  const totalPending = districts.reduce((sum, [, item]) => {
    return sum + Number(String(item.pendingCount || '0').replace(/,/g, ''));
  }, 0);

  return {
    totalDistricts: districts.length,
    totalRegistered: totalRegistered.toLocaleString('en-IN'),
    totalApproved: totalApproved.toLocaleString('en-IN'),
    totalPending: totalPending.toLocaleString('en-IN'),
    averageCoverage: districts.length
      ? Math.round(districts.reduce((sum, [, item]) => sum + Number(item.coverage || 0), 0) / districts.length)
      : 0,
  };
}

function normalizeDistrictName(value) {
  return String(value || '').replace(/_/g, ' ');
}

function mapDistrictRowsToPortalData(districtRows, categoryRows, institutionRows) {
  const mapped = {};

  districtRows.forEach((district) => {
    mapped[district.district_name] = {
      code: district.district_code || district.district_id || '',
      instCount: district.inst_count || district.institution_count || '0',
      regCount: district.reg_count || district.registered_count || '0',
      approvedCount: district.approved_count || '0',
      pendingCount: district.pending_count || '0',
      coverage: Number(district.coverage || 0),
      categories: [],
      institutions: {},
    };
  });

  categoryRows.forEach((category) => {
    const districtName = category.district_name;
    if (!mapped[districtName]) return;

    mapped[districtName].categories.push({
      id: category.category_id,
      name: category.category_name,
      sub: category.category_sub || '',
      total: Number(category.total_count || 0),
      students: category.students || '0',
      approved: category.approved || '0',
      rate: category.rate || '0%',
      badge: category.badge || '0%',
      badgeColor: category.badge_color || 'bg-slate-100 text-slate-600',
    });
  });

  institutionRows.forEach((institution) => {
    const districtName = institution.district_name;
    if (!mapped[districtName]) return;

    const categoryId = institution.category_id;
    if (!mapped[districtName].institutions[categoryId]) {
      mapped[districtName].institutions[categoryId] = [];
    }

    mapped[districtName].institutions[categoryId].push({
      id: institution.institution_id,
      name: institution.institution_name,
      total: institution.total || '0',
      applied: institution.applied || '0',
      pct: institution.pct || '0%',
      approved: institution.approved || '0',
      rejected: institution.rejected || '0',
      pending: institution.pending || '0',
      disbursed: institution.disbursed || '₹0',
    });
  });

  Object.keys(mapped).forEach((districtName) => {
    if (!mapped[districtName].categories) mapped[districtName].categories = [];
    if (!mapped[districtName].institutions) mapped[districtName].institutions = {};
  });

  return mapped;
}

async function fetchPortalDataFromMysql() {
  const connection = await pool.getConnection();

  try {
    const [districtRows] = await connection.query(
      `SELECT district_name, district_code, district_id, inst_count, reg_count, approved_count, pending_count, coverage, institution_count
       FROM districts ORDER BY district_name`
    );

    const [categoryRows] = await connection.query(
      `SELECT district_name, category_id, category_name, category_sub, total_count, students, approved, rate, badge, badge_color
       FROM district_categories ORDER BY district_name, category_order`
    );

    const [institutionRows] = await connection.query(
      `SELECT district_name, category_id, institution_id, institution_name, total, applied, pct, approved, rejected, pending, disbursed
       FROM district_institutions ORDER BY district_name, category_id, institution_name`
    );

    return mapDistrictRowsToPortalData(districtRows, categoryRows, institutionRows);
  } catch (error) {
    if (error && (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR')) {
      console.warn('MySQL tables not found. Using fallback portal data.');
      return fallbackPortalData;
    }

    console.error('MySQL query error. Using fallback portal data:', error.message);
    return fallbackPortalData;
  } finally {
    connection.release();
  }
}

async function getPortalData() {
  try {
    const data = await fetchPortalDataFromMysql();
    return data && Object.keys(data).length ? data : fallbackPortalData;
  } catch (error) {
    console.error('Unable to fetch portal data:', error.message);
    return fallbackPortalData;
  }
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Scholarship API is running',
    serverTime: new Date().toISOString(),
  });
});

app.get('/api/districts', async (req, res) => {
  const portalData = await getPortalData();
  res.json({ success: true, data: portalData });
});

app.get('/api/summary', async (req, res) => {
  const portalData = await getPortalData();
  res.json({ success: true, data: buildSummary(portalData) });
});

app.get('/api/district/:districtName', async (req, res) => {
  const districtName = normalizeDistrictName(req.params.districtName);
  const portalData = await getPortalData();

  if (!portalData[districtName]) {
    return res.status(404).json({
      success: false,
      message: `District '${districtName}' not found`,
    });
  }

  return res.json({ success: true, data: portalData[districtName] });
});

const frontendBuildPath = path.resolve(__dirname, '../scholarship-admin-dashboard-main/build');
const buildIndex = path.join(frontendBuildPath, 'index.html');

if (fs.existsSync(buildIndex)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(buildIndex);
  });
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
});

initializeDatabase();

app.listen(PORT, HOST, () => {
  console.log(`Scholarship server running on http://${HOST}:${PORT}`);
});
