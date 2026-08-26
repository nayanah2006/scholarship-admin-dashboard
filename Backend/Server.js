require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5100';
const DISTRICT_DATA_URL = process.env.DISTRICT_DATA_URL || '';
const uploadDirectory = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE || 5 * 1024 * 1024), files: 20 },
  fileFilter: (req, file, callback) => callback(allowedMimeTypes.has(file.mimetype) ? null : new Error('INVALID_FILE_TYPE')),
});

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
let portalDataStatus = { source: 'mysql', lastSyncedAt: null, error: null };
const defaultRequiredDocuments = ['Government ID proof', 'Income certificate', 'Academic marksheet', 'Admission proof'];

async function ensureScholarshipDocuments(connection, scholarshipId) {
  const [[count]] = await connection.query('SELECT COUNT(*) AS count FROM scholarship_required_documents WHERE scholarship_id = ?', [scholarshipId]);
  if (Number(count.count) > 0) return;
  await connection.query('INSERT INTO scholarship_required_documents (scholarship_id, document_name, required) VALUES ?', [defaultRequiredDocuments.map((documentName) => [scholarshipId, documentName, true])]);
}

async function ensureComplaintCategories(connection) {
  await connection.query('INSERT INTO complaint_categories (category_key, name, display_order) VALUES ? ON DUPLICATE KEY UPDATE name = VALUES(name), active = TRUE, display_order = VALUES(display_order)', [[
    ['application_status', 'Application status', 1],
    ['document_issue', 'Document issue', 2],
    ['eligibility', 'Eligibility concern', 3],
    ['scholarship_payment', 'Scholarship payment', 4],
    ['technical_support', 'Technical support', 5],
    ['other', 'Other', 6],
  ]]);
}

async function ensureDistrictDashboardCoverage(connection) {
  const districts = [
    ['Bengaluru Urban', '101'], ['Mysuru', '104'], ['Belagavi', '112'], ['Hubballi-Dharwad', '118'], ['Mangaluru', '125'],
    ['Kalaburagi', '132'], ['Shivamogga', '139'], ['Tumakuru', '146'], ['Ballari', '153'], ['Vijayapura', '160'],
    ['Davanagere', '167'], ['Hassan', '174'], ['Mandya', '181'], ['Raichur', '188'], ['Udupi', '195'],
  ];
  const categories = [
    ['schools', 'Schools', 'Primary and Secondary Education'],
    ['pu', 'Pre-University Colleges', 'Vocational and Junior Colleges'],
    ['univ', 'Undergraduate Institutions', 'Universities and Degree Colleges'],
    ['pg', 'Postgraduate Institutions', 'Masters, Doctoral and Research'],
  ];
  const institutionNames = {
    schools: [
      'Kendriya Vidyalaya No. 1', 'National Public School', 'Bishop Cotton Boys School',
      'Bishop Cotton Girls School', 'Government High School', 'St. Josephs Indian High School',
      'Bangalore International School', 'Vidyashilp Academy', 'Army Public School',
      'Mallya Aditi International School', 'Delhi Public School', 'Sophia High School',
      'The Frank Anthony Public School', 'Sri Kumaran Childrens Home', 'Maxwell Public School',
    ],
    pu: [
      'Government PU College', 'St. Josephs Pre-University College', 'Mount Carmel PU College',
      'MES Pre-University College', 'Maharani Lakshmi Ammanni College', 'Bangalore Central PU College',
      'National College Basavanagudi', 'Christ Junior College', 'Vijaya College',
      'Seshadripuram Pre-University College', 'RV PU College', 'BMS College for Women',
      'Bangalore University Pre-University College', 'Aurobindo Memorial School and PU College', 'Brilliant PU College',
    ],
    univ: [
      'Bangalore University', 'University Visvesvaraya College of Engineering', 'Christ University',
      'BMS College of Engineering', 'RV College of Engineering', 'PES University',
      'MS Ramaiah Institute of Technology', 'Bangalore Institute of Technology', 'Mount Carmel College',
      'St. Josephs University', 'Jain University', 'Dayananda Sagar University',
      'CMR University', 'Alliance University', 'Reva University',
    ],
    pg: [
      'Indian Institute of Science', 'Indian Institute of Management Bangalore', 'National Institute of Mental Health',
      'University of Agricultural Sciences Bangalore', 'Tata Institute of Fundamental Research', 'Jawaharlal Nehru Centre for Advanced Scientific Research',
      'National Institute of Design and Research', 'Bangalore University PG Centre', 'Christ University Graduate School',
      'Indian Statistical Institute Bangalore', 'National Law School of India University', 'Raman Research Institute',
      'Institute for Social and Economic Change', 'M.S. Ramaiah University of Applied Sciences', 'Jain University Research Centre',
    ],
  };
  const districtRows = districts.map(([name, code], index) => {
    const registered = 120000 + index * 7300;
    const approved = Math.round(registered * (0.68 + (index % 6) * 0.035));
    return [name, code, code, String(800 + index * 47), registered.toLocaleString('en-IN'), approved.toLocaleString('en-IN'), (registered - approved).toLocaleString('en-IN'), 68 + (index % 7) * 4, String(800 + index * 47)];
  });
  const categoryRows = [];
  const institutionRows = [];
  districts.forEach(([districtName], districtIndex) => {
    categories.forEach(([categoryId, categoryName, categorySub], categoryIndex) => {
      const totalCount = 15;
      const students = `${(18 + districtIndex * 2 + categoryIndex * 5)}k`;
      const rate = 68 + ((districtIndex + categoryIndex * 3) % 25);
      categoryRows.push([districtName, categoryId, categoryName, categorySub, totalCount, students, `${Math.round(totalCount * rate / 100)}`, `${rate}%`, rate >= 80 ? '+2.0%' : '-1.0%', rate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600', categoryIndex + 1]);
      for (let institutionIndex = 1; institutionIndex <= 15; institutionIndex += 1) {
        const applied = 300 + districtIndex * 20 + categoryIndex * 30 + institutionIndex * 7;
        const approved = Math.round(applied * rate / 100);
        const pending = applied - approved;
        const institutionName = institutionNames[categoryId][institutionIndex - 1];
        institutionRows.push([districtName, categoryId, `${categoryId.toUpperCase()}${districts[districtIndex][1]}${String(institutionIndex).padStart(2, '0')}`, institutionName, String(applied + 40), String(applied), `${rate}%`, String(approved), String(Math.max(0, applied - approved - pending)), String(pending), `₹${(approved * (categoryIndex + 1) * 0.01).toFixed(1)}L`]);
      }
    });
  });
  await connection.query(`INSERT INTO districts (district_name, district_code, district_id, inst_count, reg_count, approved_count, pending_count, coverage, institution_count) VALUES ? ON DUPLICATE KEY UPDATE district_code = VALUES(district_code), district_id = VALUES(district_id), inst_count = VALUES(inst_count), reg_count = VALUES(reg_count), approved_count = VALUES(approved_count), pending_count = VALUES(pending_count), coverage = VALUES(coverage), institution_count = VALUES(institution_count)`, [districtRows]);
  await connection.query(`INSERT INTO district_categories (district_name, category_id, category_name, category_sub, total_count, students, approved, rate, badge, badge_color, category_order) VALUES ? ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), category_sub = VALUES(category_sub), total_count = VALUES(total_count), students = VALUES(students), approved = VALUES(approved), rate = VALUES(rate), badge = VALUES(badge), badge_color = VALUES(badge_color), category_order = VALUES(category_order)`, [categoryRows]);
  await connection.query(`INSERT INTO district_institutions (district_name, category_id, institution_id, institution_name, total, applied, pct, approved, rejected, pending, disbursed) VALUES ? ON DUPLICATE KEY UPDATE institution_name = VALUES(institution_name), total = VALUES(total), applied = VALUES(applied), pct = VALUES(pct), approved = VALUES(approved), rejected = VALUES(rejected), pending = VALUES(pending), disbursed = VALUES(disbursed)`, [institutionRows]);
  if (process.env.DEV_STUDENT_ID) {
    await connection.query('INSERT INTO student_profiles (student_id, profile_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE profile_json = VALUES(profile_json)', [process.env.DEV_STUDENT_ID, JSON.stringify({ income: 250000, marks: 82, course: 'Engineering', district: 'Bengaluru Urban', institution_type: 'University', previous_scholarship_count: 0 })]);
  }
}

async function initializeDatabase() {
  let connection;

  try {
    const bootstrapPool = mysql.createPool({ ...dbConfig, database: undefined });
    connection = await bootstrapPool.getConnection();
    await connection.query(schemaSql);
    await ensureDistrictDashboardCoverage(connection);
    await ensureComplaintCategories(connection);
    const [scholarships] = await connection.query('SELECT id FROM scholarships');
    for (const scholarship of scholarships) await ensureScholarshipDocuments(connection, scholarship.id);
    try {
      await connection.query('ALTER TABLE scholarship_form_fields ADD COLUMN validation_json JSON DEFAULT NULL');
    } catch (migrationError) {
      if (!['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(migrationError.code)) throw migrationError;
    }
    try {
      await connection.query("ALTER TABLE application_documents ADD COLUMN verification_status VARCHAR(40) NOT NULL DEFAULT 'pending'");
    } catch (migrationError) {
      if (!['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(migrationError.code)) throw migrationError;
    }
    console.log('Database schema and seed data verified.');
  } catch (error) {
    console.warn('Database initialization skipped. MySQL may not be running yet.');
    console.warn(error.message);
  } finally {
    connection?.release();
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

async function fetchPortalDataFromInternet() {
  if (!DISTRICT_DATA_URL) return null;
  try {
    const response = await fetch(DISTRICT_DATA_URL, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Live dataset returned HTTP ${response.status}.`);
    const payload = await response.json();
    const data = payload.data && !Array.isArray(payload.data) ? payload.data : payload;
    if (!data || Array.isArray(data) || typeof data !== 'object' || !Object.keys(data).length) throw new Error('Live dataset did not contain district records.');
    portalDataStatus = { source: 'internet', lastSyncedAt: new Date().toISOString(), error: null };
    return data;
  } catch (error) {
    portalDataStatus = { source: 'mysql', lastSyncedAt: portalDataStatus.lastSyncedAt, error: error.message };
    console.warn('Live district dataset unavailable. Using MySQL data:', error.message);
    return null;
  }
}

async function getPortalData() {
  try {
    const internetData = await fetchPortalDataFromInternet();
    if (internetData) return internetData;
    const data = await fetchPortalDataFromMysql();
    portalDataStatus = { ...portalDataStatus, source: 'mysql', lastSyncedAt: new Date().toISOString() };
    return data && Object.keys(data).length ? data : fallbackPortalData;
  } catch (error) {
    console.error('Unable to fetch portal data:', error.message);
    portalDataStatus = { ...portalDataStatus, source: 'fallback', error: error.message };
    return fallbackPortalData;
  }
}

app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
}));

function requireStudent(req, res, next) {
  const studentId = req.session?.user?.role === 'student' ? req.session.user.id : (process.env.NODE_ENV !== 'production' ? process.env.DEV_STUDENT_ID : null);
  if (!studentId) return res.status(401).json({ success: false, message: 'An authenticated student session is required.' });
  req.student = { id: String(studentId), role: 'student' };
  return next();
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Scholarship API is running',
    serverTime: new Date().toISOString(),
  });
});

function validateScholarshipPayload(body) {
  const required = ['name', 'description', 'provider', 'scholarship_type', 'start_date', 'end_date'];
  const missing = required.filter((field) => !String(body[field] || '').trim());
  if (missing.length) return `Missing required fields: ${missing.join(', ')}`;
  if (Number.isNaN(Number(body.amount)) || Number(body.amount) < 0) return 'Amount must be a non-negative number.';
  if (new Date(body.start_date) > new Date(body.end_date)) return 'Closing date must be on or after opening date.';
  if (!['active', 'inactive'].includes(body.status || 'inactive')) return 'Status must be active or inactive.';
  return null;
}

function scholarshipParams(body) {
  return [
    String(body.name).trim(), String(body.description).trim(), String(body.provider).trim(),
    String(body.scholarship_type).trim(), Number(body.amount || 0), body.category || null,
    body.eligible_course || null, body.district_name || null, body.start_date, body.end_date,
    body.status || 'inactive'
  ];
}

function scholarshipQuery(filters) {
  const where = [];
  const params = [];
  if (filters.status === 'open') where.push(`status = 'active' AND CURDATE() BETWEEN start_date AND end_date`);
  if (filters.status === 'closed') where.push(`(status <> 'active' OR CURDATE() NOT BETWEEN start_date AND end_date)`);
  if (filters.status === 'active' || filters.status === 'inactive') { where.push('status = ?'); params.push(filters.status); }
  ['category', 'eligible_course', 'district_name'].forEach((field) => {
    if (filters[field]) { where.push(`${field} = ?`); params.push(filters[field]); }
  });
  if (filters.course) { where.push('eligible_course LIKE ?'); params.push(`%${filters.course}%`); }
  if (filters.district) { where.push('district_name = ?'); params.push(filters.district); }
  if (filters.search) { where.push('(name LIKE ? OR description LIKE ? OR provider LIKE ?)'); params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`); }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

app.get('/api/scholarships', async (req, res) => {
  try {
    const { clause, params } = scholarshipQuery(req.query);
    const [rows] = await pool.query(`SELECT id, name, description, provider, scholarship_type, amount, category, eligible_course, district_name, start_date, end_date, status, created_at, updated_at FROM scholarships ${clause} ORDER BY start_date DESC, name`, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Scholarships could not be loaded.' });
  }
});

app.get('/api/scholarships/:id/application-form', async (req, res) => {
  try {
    const [scholarships] = await pool.query('SELECT id, name, description, provider, scholarship_type, amount, category, eligible_course, district_name, start_date, end_date, status FROM scholarships WHERE id = ?', [req.params.id]);
    if (!scholarships.length) return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    await ensureScholarshipDocuments(pool, req.params.id);
    const [[eligibilityRules], [requiredDocuments], [applicationFormFields]] = await Promise.all([
      pool.query('SELECT id, rule_key, operator, rule_value, description FROM scholarship_eligibility_rules WHERE scholarship_id = ? ORDER BY id', [req.params.id]),
      pool.query('SELECT id, document_name, required FROM scholarship_required_documents WHERE scholarship_id = ? ORDER BY id', [req.params.id]),
      pool.query('SELECT id, field_key, label, field_type, required, validation_json, options_json, display_order FROM scholarship_form_fields WHERE scholarship_id = ? ORDER BY display_order, id', [req.params.id])
    ]);
    return res.json({ success: true, data: { scholarship: scholarships[0], eligibilityRules, requiredDocuments, formFields: applicationFormFields.map((field) => ({ ...field, validation: parseJson(field.validation_json, {}), options: parseJson(field.options_json, []) })) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Application form could not be loaded.' });
  }
});

app.get('/api/scholarships/:id', async (req, res) => {
  try {
    const [scholarships] = await pool.query('SELECT * FROM scholarships WHERE id = ?', [req.params.id]);
    if (!scholarships.length) return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    const [[eligibilityRules], [requiredDocuments], [applicationFormFields]] = await Promise.all([
      pool.query('SELECT id, rule_key, operator, rule_value, description FROM scholarship_eligibility_rules WHERE scholarship_id = ? ORDER BY id', [req.params.id]),
      pool.query('SELECT id, document_name, required FROM scholarship_required_documents WHERE scholarship_id = ? ORDER BY id', [req.params.id]),
      pool.query('SELECT id, field_key, label, field_type, required, validation_json, options_json, display_order FROM scholarship_form_fields WHERE scholarship_id = ? ORDER BY display_order, id', [req.params.id])
    ]);
    const fields = applicationFormFields.map((field) => ({
      ...field,
      validation: parseJson(field.validation_json, {}),
      options: parseJson(field.options_json, []),
    }));
    return res.json({ success: true, data: { ...scholarships[0], eligibilityRules, requiredDocuments, applicationFormFields: fields } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Scholarship details could not be loaded.' });
  }
});

app.post('/api/scholarships', async (req, res) => {
  const validationError = validateScholarshipPayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  try {
    const [result] = await pool.query(`INSERT INTO scholarships (name, description, provider, scholarship_type, amount, category, eligible_course, district_name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, scholarshipParams(req.body));
    const [rows] = await pool.query('SELECT * FROM scholarships WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Scholarship could not be created.' });
  }
});

app.put('/api/scholarships/:id', async (req, res) => {
  const validationError = validateScholarshipPayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  try {
    const [result] = await pool.query(`UPDATE scholarships SET name = ?, description = ?, provider = ?, scholarship_type = ?, amount = ?, category = ?, eligible_course = ?, district_name = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?`, [...scholarshipParams(req.body), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    const [rows] = await pool.query('SELECT * FROM scholarships WHERE id = ?', [req.params.id]);
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Scholarship could not be updated.' });
  }
});

app.patch('/api/scholarships/:id/status', async (req, res) => {
  if (!['active', 'inactive'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'Status must be active or inactive.' });
  try {
    const [result] = await pool.query('UPDATE scholarships SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    return res.json({ success: true, data: { id: Number(req.params.id), status: req.body.status } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Scholarship status could not be changed.' });
  }
});

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (error) { return fallback; }
}

function readinessRatio(factor, context) {
  const missing = [];
  let ratio = 0;
  if (factor.factor_key === 'required_documents') {
    const required = context.requiredDocuments;
    const uploaded = new Set(context.documents.map((document) => String(document.required_document_id)));
    const complete = required.filter((document) => uploaded.has(String(document.id)));
    required.filter((document) => !uploaded.has(String(document.id))).forEach((document) => missing.push(document.document_name));
    ratio = required.length ? complete.length / required.length : 1;
  } else if (factor.factor_key === 'required_fields') {
    const filled = new Set(context.fieldValues.filter((field) => field.field_value !== null && String(field.field_value).trim() !== '').map((field) => String(field.field_id)));
    const complete = context.requiredFields.filter((field) => filled.has(String(field.id)));
    context.requiredFields.filter((field) => !filled.has(String(field.id))).forEach((field) => missing.push(field.label));
    ratio = context.requiredFields.length ? complete.length / context.requiredFields.length : 1;
  } else if (factor.factor_key === 'document_verification') {
    const requiredIds = new Set(context.requiredDocuments.map((document) => String(document.id)));
    const documents = context.documents.filter((document) => !document.required_document_id || requiredIds.has(String(document.required_document_id)));
    const verified = documents.filter((document) => ['verified', 'approved', 'complete'].includes(String(document.verification_status).toLowerCase()));
    documents.filter((document) => !['verified', 'approved', 'complete'].includes(String(document.verification_status).toLowerCase())).forEach((document) => missing.push(document.original_name));
    ratio = documents.length ? verified.length / documents.length : 1;
  } else if (factor.factor_key === 'student_information') {
    const config = parseJson(factor.config_json, {});
    const keys = Array.isArray(config.required_profile_keys) ? config.required_profile_keys : Object.keys(context.profile);
    const complete = keys.filter((key) => context.profile[key] !== undefined && context.profile[key] !== null && String(context.profile[key]).trim() !== '');
    keys.filter((key) => !complete.includes(key)).forEach((key) => missing.push(key));
    ratio = keys.length ? complete.length / keys.length : 1;
  } else {
    const stage = context.stages.find((item) => item.stage_key === factor.factor_key);
    ratio = stage && ['verified', 'approved', 'complete', 'completed', 'passed'].includes(String(stage.status).toLowerCase()) ? 1 : 0;
    if (!stage || ratio === 0) missing.push(stage ? `${factor.factor_name} (${stage.status})` : factor.factor_name);
  }
  return { ratio: Math.max(0, Math.min(1, ratio)), missing };
}

async function calculateReadiness(applicationId, existingConnection = null) {
  let connection = existingConnection;
  let ownsTransaction = false;
  if (!connection) { connection = await pool.getConnection(); ownsTransaction = true; }
  try {
    const [[applications], [factorRows], [statuses], [requiredDocuments], [requiredFields], [fieldValues], [documents], [stages], [profiles]] = await Promise.all([
      connection.query('SELECT id, scholarship_id, student_id FROM scholarship_applications WHERE id = ?', [applicationId]),
      connection.query('SELECT * FROM readiness_factors WHERE active = 1 AND (scholarship_id IS NULL OR scholarship_id = (SELECT scholarship_id FROM scholarship_applications WHERE id = ?)) ORDER BY scholarship_id IS NOT NULL DESC, id', [applicationId]),
      connection.query('SELECT status_code, status_label, minimum_score FROM readiness_statuses WHERE active = 1 ORDER BY minimum_score DESC'),
      connection.query('SELECT id, document_name FROM scholarship_required_documents WHERE scholarship_id = (SELECT scholarship_id FROM scholarship_applications WHERE id = ?) AND required = 1', [applicationId]),
      connection.query('SELECT id, label FROM scholarship_form_fields WHERE scholarship_id = (SELECT scholarship_id FROM scholarship_applications WHERE id = ?) AND required = 1 AND field_type <> \'file\'', [applicationId]),
      connection.query('SELECT field_id, field_value FROM application_field_values WHERE application_id = ?', [applicationId]),
      connection.query('SELECT required_document_id, original_name, verification_status FROM application_documents WHERE application_id = ?', [applicationId]),
      connection.query('SELECT stage_key, status FROM application_verification_stages WHERE application_id = ?', [applicationId]),
      connection.query('SELECT profile_json FROM student_profiles WHERE student_id = (SELECT student_id FROM scholarship_applications WHERE id = ?)', [applicationId])
    ]);
    if (!applications.length) throw new Error('Application not found.');
    const factors = [];
    const usedKeys = new Set();
    factorRows.forEach((factor) => { if (!usedKeys.has(factor.factor_key)) { usedKeys.add(factor.factor_key); factors.push(factor); } });
    const context = { requiredDocuments, requiredFields, fieldValues, documents, stages, profile: parseJson(profiles[0]?.profile_json, {}) };
    const factorResults = factors.map((factor) => { const completion = readinessRatio(factor, context); const maxScore = Number(factor.weight); return { factorId: factor.id, name: factor.factor_name, score: Number((completion.ratio * maxScore).toFixed(2)), maxScore, completed: completion.ratio === 1, missingItems: completion.missing }; });
    const maxScore = factorResults.reduce((sum, factor) => sum + factor.maxScore, 0);
    const score = maxScore ? Number((factorResults.reduce((sum, factor) => sum + factor.score, 0) / maxScore * 100).toFixed(2)) : 0;
    const status = statuses.find((item) => score >= Number(item.minimum_score)) || statuses[statuses.length - 1] || { status_code: 'NOT_READY' };
    const missingItems = factorResults.flatMap((factor) => factor.missingItems);
    if (ownsTransaction) await connection.beginTransaction();
    const [result] = await connection.query('INSERT INTO application_readiness_results (application_id, score, status_code, missing_items_json) VALUES (?, ?, ?, ?)', [applicationId, score, status.status_code, JSON.stringify(missingItems)]);
    for (const factor of factorResults) await connection.query('INSERT INTO application_readiness_factors (readiness_result_id, factor_id, factor_name, score, max_score, completed, missing_items_json) VALUES (?, ?, ?, ?, ?, ?, ?)', [result.insertId, factor.factorId, factor.name, factor.score, factor.maxScore, factor.completed, JSON.stringify(factor.missingItems)]);
    if (ownsTransaction) await connection.commit();
    return { id: result.insertId, application_id: Number(applicationId), score, status: status.status_code, status_label: status.status_label, factors: factorResults.map((factor) => ({ name: factor.name, score: factor.score, max_score: factor.maxScore, completed: factor.completed })), missing_items: missingItems };
  } catch (error) {
    if (ownsTransaction) await connection.rollback();
    throw error;
  } finally { if (!existingConnection) connection.release(); }
}

app.get('/api/applications/:id/readiness', async (req, res) => {
  try {
    return res.json({ success: true, data: await calculateReadiness(req.params.id) });
  } catch (error) {
    if (error.message === 'Application not found.') return res.status(404).json({ success: false, message: error.message });
    return res.status(500).json({ success: false, message: 'Application readiness could not be calculated.' });
  }
});

app.get('/api/readiness-factors', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM readiness_factors WHERE (? IS NULL OR scholarship_id = ?) ORDER BY scholarship_id, id', [req.query.scholarship_id || null, req.query.scholarship_id || null]);
    return res.json({ success: true, data: rows.map((factor) => ({ ...factor, config: parseJson(factor.config_json, {}) })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Readiness factors could not be loaded.' });
  }
});

app.post('/api/readiness-factors', async (req, res) => {
  if (!String(req.body.factor_key || '').trim() || !String(req.body.factor_name || '').trim() || Number(req.body.weight) < 0) return res.status(400).json({ success: false, message: 'factor_key, factor_name, and a non-negative weight are required.' });
  try {
    const [result] = await pool.query('INSERT INTO readiness_factors (scholarship_id, factor_key, factor_name, weight, config_json, active) VALUES (?, ?, ?, ?, ?, ?)', [req.body.scholarship_id || null, req.body.factor_key, req.body.factor_name, req.body.weight, JSON.stringify(req.body.config || {}), req.body.active === false ? 0 : 1]);
    return res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Readiness factor could not be created.' });
  }
});

app.put('/api/readiness-factors/:id', async (req, res) => {
  if (!String(req.body.factor_key || '').trim() || !String(req.body.factor_name || '').trim() || Number(req.body.weight) < 0) return res.status(400).json({ success: false, message: 'factor_key, factor_name, and a non-negative weight are required.' });
  try {
    const [result] = await pool.query('UPDATE readiness_factors SET factor_key = ?, factor_name = ?, weight = ?, config_json = ?, active = ? WHERE id = ?', [req.body.factor_key, req.body.factor_name, req.body.weight, JSON.stringify(req.body.config || {}), req.body.active === false ? 0 : 1, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Readiness factor not found.' });
    return res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Readiness factor could not be updated.' });
  }
});

const allowedRuleOperators = new Set(['>=', '>', '<=', '<', '=', '!=', 'IN', 'NOT_IN', 'contains']);

function validateRulePayload(body) {
  if (!String(body.rule_key || '').trim() || !String(body.operator || '').trim() || body.rule_value === undefined) return 'rule_key, operator, and rule_value are required.';
  if (!allowedRuleOperators.has(body.operator)) return 'Unsupported eligibility rule operator.';
  return null;
}

function comparableValues(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase());
  const parsed = parseJson(value, null);
  if (Array.isArray(parsed)) return comparableValues(parsed);
  return String(value).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function evaluateRule(rule, profile) {
  const actual = profile[rule.rule_key];
  const expected = parseJson(rule.rule_value, rule.rule_value);
  let passed = false;
  if (actual !== undefined && actual !== null) {
    const numericActual = Number(actual);
    const numericExpected = Number(expected);
    const numeric = String(actual).trim() !== '' && String(expected).trim() !== '' && Number.isFinite(numericActual) && Number.isFinite(numericExpected);
    const left = numeric ? numericActual : String(actual).toLowerCase();
    const right = numeric ? numericExpected : String(expected).toLowerCase();
    switch (rule.operator) {
      case '>=': passed = left >= right; break;
      case '>': passed = left > right; break;
      case '<=': passed = left <= right; break;
      case '<': passed = left < right; break;
      case '=': passed = left === right; break;
      case '!=': passed = left !== right; break;
      case 'IN': passed = comparableValues(expected).includes(String(actual).toLowerCase()); break;
      case 'NOT_IN': passed = !comparableValues(expected).includes(String(actual).toLowerCase()); break;
      case 'contains': passed = String(actual).toLowerCase().includes(String(expected).toLowerCase()); break;
      default: passed = false;
    }
  }
  return { rule: rule.description || rule.rule_key, passed, actual, required: expected, operator: rule.operator };
}

async function getRecommendationPrediction(candidates) {
  const response = await fetch(`${AI_SERVICE_URL}/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidates }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Recommendation model is unavailable.');
  return payload;
}

app.post('/api/recommendations', async (req, res) => {
  const studentId = String(req.body.student_id || '').trim();
  if (!studentId) return res.status(400).json({ success: false, message: 'student_id is required.' });
  try {
    const [profileRows] = await pool.query('SELECT profile_json FROM student_profiles WHERE student_id = ?', [studentId]);
    if (!profileRows.length) return res.status(404).json({ success: false, message: 'Student profile not found.' });
    const profile = parseJson(profileRows[0].profile_json, {});
    const [scholarships] = await pool.query(`SELECT id, name, provider, scholarship_type, amount, category, eligible_course, district_name FROM scholarships WHERE status = 'active' AND CURDATE() BETWEEN start_date AND end_date ORDER BY id`);
    if (!scholarships.length) return res.json({ success: true, data: { model_available: false, recommendations: [], message: 'No open scholarships are available.' } });
    const scholarshipIds = scholarships.map((scholarship) => scholarship.id);
    const placeholders = scholarshipIds.map(() => '?').join(',');
    const [rules] = await pool.query(`SELECT id, scholarship_id, rule_key, operator, rule_value, description FROM scholarship_eligibility_rules WHERE scholarship_id IN (${placeholders}) ORDER BY scholarship_id, id`, scholarshipIds);
    const rulesByScholarship = rules.reduce((result, rule) => { (result[rule.scholarship_id] ||= []).push(rule); return result; }, {});
    const eligibility = scholarships.map((scholarship) => {
      const results = (rulesByScholarship[scholarship.id] || []).map((rule) => evaluateRule(rule, profile));
      const failed = results.filter((result) => !result.passed);
      return { scholarship, eligible: failed.length === 0, failed };
    });
    const candidates = eligibility.map(({ scholarship }) => ({
      income: profile.income,
      marks: profile.marks,
      course: profile.course,
      district: profile.district,
      institution_type: profile.institution_type,
      previous_scholarship_count: profile.previous_scholarship_count,
      scholarship_type: scholarship.scholarship_type,
      scholarship_course: scholarship.eligible_course,
      scholarship_district: scholarship.district_name,
      scholarship_amount: scholarship.amount,
      provider: scholarship.provider,
    }));
    let prediction;
    try { prediction = await getRecommendationPrediction(candidates); } catch (modelError) {
      return res.status(503).json({ success: false, model_available: false, message: 'Recommendation model is not available. No AI prediction was generated.', detail: modelError.message });
    }
    const recommendations = eligibility.map((item, index) => ({
      scholarship: item.scholarship,
      recommendation_score: prediction.predictions[index],
      eligible: item.eligible,
      recommendation_status: item.eligible ? 'RECOMMENDED' : 'NOT_ELIGIBLE',
      reason: item.eligible ? 'Model score is shown only as recommendation support; official rules passed.' : `Not recommended because official rules failed: ${item.failed.map((rule) => rule.rule).join(', ')}.`,
    })).sort((left, right) => Number(right.recommendation_score) - Number(left.recommendation_score));
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [run] = await connection.query('INSERT INTO ai_recommendation_runs (student_id, model_version, model_available) VALUES (?, ?, ?)', [studentId, prediction.model_version, true]);
      for (const item of recommendations) await connection.query('INSERT INTO ai_recommendation_items (run_id, scholarship_id, recommendation_score, eligible, reason) VALUES (?, ?, ?, ?, ?)', [run.insertId, item.scholarship.id, item.recommendation_score, item.eligible, item.reason]);
      await connection.commit();
      return res.json({ success: true, data: { run_id: run.insertId, model_available: true, model_version: prediction.model_version, generated_at: new Date().toISOString(), recommendations } });
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Recommendations could not be generated.' });
  }
});

app.get('/api/scholarships/:id/eligibility-rules', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, scholarship_id, rule_key, operator, rule_value, description FROM scholarship_eligibility_rules WHERE scholarship_id = ? ORDER BY id', [req.params.id]);
    return res.json({ success: true, data: rows.map((rule) => ({ ...rule, rule_value: parseJson(rule.rule_value, rule.rule_value) })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Eligibility rules could not be loaded.' });
  }
});

app.post('/api/scholarships/:id/eligibility-rules', async (req, res) => {
  const validationError = validateRulePayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  try {
    const [result] = await pool.query('INSERT INTO scholarship_eligibility_rules (scholarship_id, rule_key, operator, rule_value, description) VALUES (?, ?, ?, ?, ?)', [req.params.id, String(req.body.rule_key).trim(), req.body.operator, JSON.stringify(req.body.rule_value), req.body.description || null]);
    return res.status(201).json({ success: true, data: { id: result.insertId, scholarship_id: Number(req.params.id), ...req.body } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Eligibility rule could not be created.' });
  }
});

app.put('/api/eligibility-rules/:id', async (req, res) => {
  const validationError = validateRulePayload(req.body);
  if (validationError) return res.status(400).json({ success: false, message: validationError });
  try {
    const [result] = await pool.query('UPDATE scholarship_eligibility_rules SET rule_key = ?, operator = ?, rule_value = ?, description = ? WHERE id = ?', [String(req.body.rule_key).trim(), req.body.operator, JSON.stringify(req.body.rule_value), req.body.description || null, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Eligibility rule not found.' });
    return res.json({ success: true, data: { id: Number(req.params.id), ...req.body } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Eligibility rule could not be updated.' });
  }
});

app.delete('/api/eligibility-rules/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM scholarship_eligibility_rules WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Eligibility rule not found.' });
    return res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Eligibility rule could not be deleted.' });
  }
});

app.put('/api/students/:studentId/profile', async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ success: false, message: 'Profile must be a JSON object.' });
  try {
    await pool.query('INSERT INTO student_profiles (student_id, profile_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE profile_json = VALUES(profile_json)', [req.params.studentId, JSON.stringify(req.body)]);
    return res.json({ success: true, data: { student_id: req.params.studentId, profile: req.body } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Student profile could not be saved.' });
  }
});

app.post('/api/eligibility/check', async (req, res) => {
  const studentId = String(req.body.student_id || '').trim();
  const scholarshipId = req.body.scholarship_id;
  if (!studentId || !scholarshipId) return res.status(400).json({ success: false, message: 'student_id and scholarship_id are required.' });
  let connection;
  try {
    connection = await pool.getConnection();
    const [[scholarship], [profileRows], [rules]] = await Promise.all([
      connection.query('SELECT id, name, status, start_date, end_date FROM scholarships WHERE id = ?', [scholarshipId]),
      connection.query('SELECT profile_json FROM student_profiles WHERE student_id = ?', [studentId]),
      connection.query('SELECT id, rule_key, operator, rule_value, description FROM scholarship_eligibility_rules WHERE scholarship_id = ? ORDER BY id', [scholarshipId])
    ]);
    if (!scholarship.length) return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    if (!profileRows.length) return res.status(404).json({ success: false, message: 'Student profile not found.' });
    const profile = parseJson(profileRows[0].profile_json, {});
    const results = rules.map((rule) => evaluateRule(rule, profile));
    const failedRules = results.filter((result) => !result.passed);
    const eligible = failedRules.length === 0;
    const explanation = eligible ? 'All configured eligibility rules passed.' : `${failedRules.length} configured eligibility rule(s) failed.`;
    await connection.beginTransaction();
    const [evaluation] = await connection.query('INSERT INTO eligibility_evaluations (student_id, scholarship_id, eligible, explanation) VALUES (?, ?, ?, ?)', [studentId, scholarshipId, eligible, explanation]);
    for (let index = 0; index < rules.length; index += 1) {
      const result = results[index];
      await connection.query('INSERT INTO eligibility_evaluation_rules (evaluation_id, rule_id, rule_label, passed, actual_value, required_value) VALUES (?, ?, ?, ?, ?, ?)', [evaluation.insertId, rules[index].id, result.rule, result.passed, JSON.stringify(result.actual), JSON.stringify(result.required)]);
    }
    await connection.commit();
    return res.json({ success: true, data: { evaluation_id: evaluation.insertId, eligible, rules: results, failedRules, passedRules: results.filter((result) => result.passed), explanation } });
  } catch (error) {
    await connection?.rollback();
    return res.status(500).json({ success: false, message: 'Eligibility could not be evaluated.' });
  } finally { connection?.release(); }
});

function validateDynamicFields(fields, values, submitted) {
  const errors = {};
  fields.forEach((field) => {
    const value = values[field.field_key];
    if (submitted && field.required && (value === undefined || value === null || String(value).trim() === '')) errors[field.field_key] = `${field.label} is required.`;
    const rules = parseJson(field.validation_json, {});
    if (value !== undefined && value !== '' && rules.min !== undefined && Number(value) < Number(rules.min)) errors[field.field_key] = `${field.label} is below the minimum allowed value.`;
    if (value !== undefined && value !== '' && rules.max !== undefined && Number(value) > Number(rules.max)) errors[field.field_key] = `${field.label} exceeds the maximum allowed value.`;
    if (value !== undefined && value !== '' && rules.pattern && !(new RegExp(rules.pattern).test(String(value)))) errors[field.field_key] = `${field.label} has an invalid format.`;
  });
  return errors;
}

async function handleApplicationSubmission(req, res) {
  const scholarshipId = req.body.scholarship_id;
  const studentId = req.student.id;
  const status = req.body.status === 'draft' ? 'draft' : 'submitted';
  const values = parseJson(req.body.form_data, req.body.form_data || {});
  if (!scholarshipId) return res.status(400).json({ success: false, message: 'scholarship_id is required.' });
  let connection;
  try {
    connection = await pool.getConnection();
    const [scholarships] = await connection.query(`SELECT * FROM scholarships WHERE id = ? AND status = 'active' AND CURDATE() BETWEEN start_date AND end_date`, [scholarshipId]);
    if (!scholarships.length) return res.status(400).json({ success: false, message: 'This scholarship is inactive or outside its application period.' });
    await ensureScholarshipDocuments(connection, scholarshipId);
    const [fields] = await connection.query('SELECT * FROM scholarship_form_fields WHERE scholarship_id = ? ORDER BY display_order, id', [scholarshipId]);
    const uploadedFieldIds = new Set((req.files || []).map((file) => String(file.fieldname).replace(/^field_/, '')));
    const validationValues = { ...values };
    fields.filter((field) => field.field_type === 'file').forEach((field) => {
      if (uploadedFieldIds.has(String(field.id))) validationValues[field.field_key] = true;
    });
    const errors = validateDynamicFields(fields, validationValues, status === 'submitted');
    const requiredDocuments = status === 'submitted' ? (await connection.query('SELECT * FROM scholarship_required_documents WHERE scholarship_id = ? AND required = 1', [scholarshipId]))[0] : [];
    const uploadedDocumentIds = new Set((req.files || []).map((file) => String(file.fieldname).replace(/^document_/, '')));
    requiredDocuments.forEach((document) => { if (!uploadedDocumentIds.has(String(document.id))) errors[`document_${document.id}`] = `${document.document_name} is required.`; });
    if (Object.keys(errors).length) return res.status(422).json({ success: false, message: 'Please correct the highlighted fields.', errors });
    const [existing] = await connection.query('SELECT id, status FROM scholarship_applications WHERE scholarship_id = ? AND student_id = ?', [scholarshipId, studentId]);
    if (existing.length && existing[0].status !== 'draft') return res.status(409).json({ success: false, message: 'This student has already submitted an application.' });
    await connection.beginTransaction();
    let applicationId;
    if (existing.length) {
      applicationId = existing[0].id;
      await connection.query('UPDATE scholarship_applications SET status = ?, form_data = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?', [status, JSON.stringify(values), applicationId]);
      await connection.query('DELETE FROM application_field_values WHERE application_id = ?', [applicationId]);
    } else {
      const [result] = await connection.query('INSERT INTO scholarship_applications (scholarship_id, student_id, status, form_data) VALUES (?, ?, ?, ?)', [scholarshipId, studentId, status, JSON.stringify(values)]);
      applicationId = result.insertId;
    }
    for (const field of fields) {
      if (values[field.field_key] !== undefined) await connection.query('INSERT INTO application_field_values (application_id, field_id, field_value) VALUES (?, ?, ?)', [applicationId, field.id, String(values[field.field_key])]);
    }
    for (const file of req.files || []) {
      const documentId = Number(String(file.fieldname).replace(/^document_/, '')) || null;
      await connection.query('INSERT INTO application_documents (application_id, required_document_id, field_name, original_name, stored_name, mime_type, file_size, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [applicationId, documentId, file.fieldname, file.originalname, file.filename, file.mimetype, file.size, file.path]);
    }
    await connection.commit();
    try { await calculateReadiness(applicationId); } catch (readinessError) { console.warn('Readiness recalculation skipped:', readinessError.message); }
    return res.status(existing.length ? 200 : 201).json({ success: true, data: { id: applicationId, scholarship_id: Number(scholarshipId), student_id: studentId, status } });
  } catch (error) {
    await connection?.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'This student has already submitted an application.' });
    return res.status(500).json({ success: false, message: 'Application could not be saved.' });
  } finally { connection?.release(); }
}

app.post('/api/applications', requireStudent, (req, res, next) => upload.any()(req, res, (error) => {
  if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Uploaded files must be within the size limit.' : 'Only PDF, JPG, and PNG files are allowed.' });
  return handleApplicationSubmission(req, res, next);
}));

app.patch('/api/application-documents/:id/verification', async (req, res) => {
  const allowedStatuses = new Set(['pending', 'verified', 'rejected']);
  if (!allowedStatuses.has(req.body.status)) return res.status(400).json({ success: false, message: 'Unsupported document verification status.' });
  try {
    const [result] = await pool.query('UPDATE application_documents SET verification_status = ? WHERE id = ?', [req.body.status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Application document not found.' });
    const [[document]] = await pool.query('SELECT application_id FROM application_documents WHERE id = ?', [req.params.id]);
    const readiness = await calculateReadiness(document.application_id);
    return res.json({ success: true, data: readiness });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Document verification could not be saved.' });
  }
});

app.put('/api/applications/:id/verification-stages/:stageKey', async (req, res) => {
  if (!String(req.body.status || '').trim()) return res.status(400).json({ success: false, message: 'Stage status is required.' });
  try {
    await pool.query('INSERT INTO application_verification_stages (application_id, stage_key, status, metadata_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), metadata_json = VALUES(metadata_json)', [req.params.id, req.params.stageKey, req.body.status, JSON.stringify(req.body.metadata || {})]);
    return res.json({ success: true, data: await calculateReadiness(req.params.id) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Verification stage could not be saved.' });
  }
});

app.get('/api/reference-data', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT option_group, option_value, option_label
       FROM reference_options WHERE active = 1
       ORDER BY option_group, display_order, option_label`
    );
    const grouped = rows.reduce((result, row) => {
      if (!result[row.option_group]) result[row.option_group] = [];
      result[row.option_group].push({ id: row.option_value, value: row.option_value, label: row.option_label });
      return result;
    }, {});
    return res.json({ success: true, data: grouped });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
      return res.json({ success: true, data: { roles: [] } });
    }
    return res.status(500).json({ success: false, message: 'Reference data could not be loaded.' });
  }
});

app.get('/api/student/overview', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM scholarships WHERE status = 'active' AND CURDATE() BETWEEN start_date AND end_date) AS openScholarships,
         (SELECT COUNT(*) FROM scholarship_applications) AS applications,
         (SELECT COUNT(*) FROM application_documents) AS documents,
         (SELECT COUNT(*) FROM complaints) AS complaints`
    );
    return res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
      return res.json({ success: true, data: null });
    }
    return res.status(500).json({ success: false, message: 'Student overview could not be loaded.' });
  }
});

app.get('/api/applications/my', requireStudent, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.scholarship_id, a.status, a.submitted_at,
             s.name AS scholarship_name, s.provider, s.amount,
             COUNT(DISTINCT d.id) AS document_count,
             (SELECT r.score FROM application_readiness_results r
              WHERE r.application_id = a.id ORDER BY r.created_at DESC LIMIT 1) AS readiness_score,
             (SELECT r.status_code FROM application_readiness_results r
              WHERE r.application_id = a.id ORDER BY r.created_at DESC LIMIT 1) AS readiness_status
      FROM scholarship_applications a
      JOIN scholarships s ON s.id = a.scholarship_id
      LEFT JOIN application_documents d ON d.application_id = a.id
      WHERE a.student_id = ?
      GROUP BY a.id, a.scholarship_id, a.status, a.submitted_at, s.name, s.provider, s.amount
      ORDER BY a.submitted_at DESC`, [req.student.id]);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Applications could not be loaded.' });
  }
});

app.get('/api/complaints/options', requireStudent, async (req, res) => {
  try {
    const [[categories], [statuses], [scholarships]] = await Promise.all([
      pool.query('SELECT id, category_key, name FROM complaint_categories WHERE active = 1 ORDER BY display_order, name'),
      pool.query('SELECT status_key, label FROM complaint_statuses WHERE active = 1 ORDER BY display_order, label'),
      pool.query(`SELECT s.id, s.name FROM scholarships s ORDER BY s.status = 'active' DESC, s.name`),
    ]);
    return res.json({ success: true, data: { categories, statuses, scholarships } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Complaint options could not be loaded.' });
  }
});

app.get('/api/complaints/application-options', requireStudent, async (req, res) => {
  try {
    const [applications] = await pool.query(`SELECT a.id, a.scholarship_id, s.name AS scholarship_name FROM scholarship_applications a JOIN scholarships s ON s.id = a.scholarship_id WHERE a.student_id = ? ORDER BY a.submitted_at DESC`, [req.student.id]);
    return res.json({ success: true, data: applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Application options could not be loaded.' });
  }
});

app.get('/api/complaints/my', requireStudent, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id,
              c.scholarship_id,
              c.application_id,
              c.description,
              c.status_key,
              c.official_response,
              c.created_at,
              c.updated_at,
              s.name AS scholarship_name,
              cp.name AS category_name,
              cs.label AS status_label,
              (SELECT predicted_value FROM complaint_predictions WHERE complaint_id = c.id AND prediction_type = 'classification' ORDER BY created_at DESC LIMIT 1) AS ai_classification,
              (SELECT predicted_value FROM complaint_predictions WHERE complaint_id = c.id AND prediction_type = 'probable_reason' ORDER BY created_at DESC LIMIT 1) AS probable_reason,
              (SELECT COUNT(*) FROM complaint_duplicates WHERE complaint_id = c.id) AS duplicate_count,
              CASE WHEN (SELECT COUNT(*) FROM complaint_duplicates WHERE complaint_id = c.id) > 0 THEN 'possible_duplicate' ELSE 'no_match' END AS duplicate_status
       FROM complaints c
       LEFT JOIN scholarships s ON s.id = c.scholarship_id
       LEFT JOIN complaint_categories cp ON cp.id = c.category_id
       LEFT JOIN complaint_statuses cs ON cs.status_key = c.status_key
       WHERE c.student_id = ? ORDER BY c.created_at DESC`, [req.student.id]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Complaints could not be loaded.' });
  }
});

app.get('/api/complaints/:id', requireStudent, async (req, res) => {
  try {
    const [[complaint]] = await pool.query(`SELECT c.*, s.name AS scholarship_name, cp.name AS category_name, cs.label AS status_label FROM complaints c LEFT JOIN scholarships s ON s.id = c.scholarship_id LEFT JOIN complaint_categories cp ON cp.id = c.category_id LEFT JOIN complaint_statuses cs ON cs.status_key = c.status_key WHERE c.id = ? AND c.student_id = ?`, [req.params.id, req.student.id]);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    const [[predictions], [duplicates], [history], [documents]] = await Promise.all([
      pool.query('SELECT prediction_type, predicted_value, confidence, model_version, is_ai_generated, created_at FROM complaint_predictions WHERE complaint_id = ? ORDER BY created_at DESC', [req.params.id]),
      pool.query('SELECT complaint_id, original_complaint_id, similarity_score, review_status, created_at FROM complaint_duplicates WHERE complaint_id = ?', [req.params.id]),
      pool.query('SELECT status_key, changed_by, note, created_at FROM complaint_status_history WHERE complaint_id = ? ORDER BY created_at', [req.params.id]),
      pool.query('SELECT id, original_name, mime_type, file_size, created_at FROM complaint_documents WHERE complaint_id = ?', [req.params.id]),
    ]);
    const duplicateStatus = duplicates.length > 0 ? 'possible_duplicate' : 'no_match';
    return res.json({ success: true, data: { ...complaint, duplicate_status: duplicateStatus, predictions, duplicates, history, documents } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Complaint details could not be loaded.' });
  }
});

app.patch('/api/complaints/:id/status', async (req, res) => {
  const statusKey = String(req.body.status_key || '').trim();
  const changedBy = String(req.body.changed_by || '').trim();
  if (!statusKey || !changedBy) return res.status(400).json({ success: false, message: 'status_key and changed_by are required.' });
  try {
    const [[status]] = await pool.query('SELECT status_key FROM complaint_statuses WHERE status_key = ? AND active = 1', [statusKey]);
    if (!status) return res.status(400).json({ success: false, message: 'Unsupported complaint status.' });
    const [result] = await pool.query('UPDATE complaints SET status_key = ?, official_response = COALESCE(?, official_response) WHERE id = ?', [statusKey, req.body.official_response || null, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Complaint not found.' });
    await pool.query('INSERT INTO complaint_status_history (complaint_id, status_key, changed_by, note) VALUES (?, ?, ?, ?)', [req.params.id, statusKey, changedBy, req.body.note || null]);
    return res.json({ success: true, data: { id: Number(req.params.id), status_key: statusKey } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Complaint status could not be updated.' });
  }
});

app.post('/api/complaint-categories', async (req, res) => {
  if (!String(req.body.category_key || '').trim() || !String(req.body.name || '').trim()) return res.status(400).json({ success: false, message: 'category_key and name are required.' });
  try {
    const [result] = await pool.query('INSERT INTO complaint_categories (category_key, name, display_order) VALUES (?, ?, ?)', [req.body.category_key, req.body.name, req.body.display_order || 0]);
    return res.status(201).json({ success: true, data: { id: result.insertId, category_key: req.body.category_key, name: req.body.name } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Complaint category could not be created.' });
  }
});

const complaintUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE || 5 * 1024 * 1024), files: 1 },
  fileFilter: (req, file, callback) => callback(allowedMimeTypes.has(file.mimetype) ? null : new Error('INVALID_FILE_TYPE')),
});

async function classifyComplaint(complaintId, description) {
  const aiUrl = process.env.GRIEVANCE_AI_SERVICE_URL;
  if (!aiUrl) return;
  try {
    const response = await fetch(`${aiUrl}/classify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: description }) });
    if (!response.ok) return;
    const result = await response.json();
    const connection = await pool.getConnection();
    try {
      for (const prediction of [{ prediction_type: 'classification', value: result.classification, confidence: result.confidence }, { prediction_type: 'probable_reason', value: result.probable_reason, confidence: result.confidence }]) {
        if (prediction.value) await connection.query('INSERT INTO complaint_predictions (complaint_id, prediction_type, predicted_value, confidence, model_version, is_ai_generated) VALUES (?, ?, ?, ?, ?, TRUE)', [complaintId, prediction.prediction_type, prediction.value, prediction.confidence || null, result.model_version || null]);
      }
    } finally { connection.release(); }
  } catch (error) { console.warn('Grievance AI classification unavailable:', error.message); }
}

app.post('/api/complaints', requireStudent, (req, res, next) => complaintUpload.single('supporting_document')(req, res, async (uploadError) => {
  if (uploadError) return res.status(400).json({ success: false, message: uploadError.code === 'LIMIT_FILE_SIZE' ? 'Supporting document exceeds the size limit.' : 'Only PDF, JPG, and PNG files are allowed.' });
  const description = String(req.body.description || '').trim();
  if (!description) return res.status(400).json({ success: false, message: 'Complaint description is required.' });
  let connection;
  try {
    connection = await pool.getConnection();
    if (req.body.application_id) {
      const [[application]] = await connection.query('SELECT id, scholarship_id FROM scholarship_applications WHERE id = ? AND student_id = ?', [req.body.application_id, req.student.id]);
      if (!application) return res.status(400).json({ success: false, message: 'Application does not belong to the authenticated student.' });
    }
    const scholarshipId = req.body.scholarship_id || null;
    if (scholarshipId) {
      const [[scholarship]] = await connection.query('SELECT id FROM scholarships WHERE id = ?', [scholarshipId]);
      if (!scholarship) return res.status(400).json({ success: false, message: 'Scholarship not found.' });
    }
    await connection.beginTransaction();
    const [result] = await connection.query('INSERT INTO complaints (student_id, scholarship_id, application_id, category_id, description) VALUES (?, ?, ?, ?, ?)', [req.student.id, scholarshipId, req.body.application_id || null, req.body.category_id || null, description]);
    const complaintId = result.insertId;
    await connection.query('INSERT INTO complaint_status_history (complaint_id, status_key, changed_by, note) VALUES (?, ?, ?, ?)', [complaintId, 'submitted', req.student.id, 'Complaint submitted by student.']);
    if (req.file) await connection.query('INSERT INTO complaint_documents (complaint_id, original_name, stored_name, mime_type, file_size, storage_path) VALUES (?, ?, ?, ?, ?, ?)', [complaintId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.file.path]);
    const [[prior]] = await connection.query('SELECT id FROM complaints WHERE id <> ? AND student_id = ? AND description = ? ORDER BY created_at LIMIT 1', [complaintId, req.student.id, description]);
    if (prior) await connection.query('INSERT INTO complaint_duplicates (complaint_id, original_complaint_id, similarity_score, review_status) VALUES (?, ?, ?, ?)', [complaintId, prior.id, 1, 'pending']);
    await connection.commit();
    await classifyComplaint(complaintId, description);
    return res.status(201).json({ success: true, data: { id: complaintId, status_key: 'submitted', duplicate_status: prior ? 'review_pending' : 'no_match' } });
  } catch (error) {
    await connection?.rollback();
    return res.status(500).json({ success: false, message: 'Complaint could not be submitted.' });
  } finally { connection?.release(); }
}));

app.get('/api/districts', async (req, res) => {
  const portalData = await getPortalData();
  res.json({ success: true, data: portalData });
});

app.get('/api/data-status', async (req, res) => {
  await getPortalData();
  res.json({ success: true, data: { ...portalDataStatus, liveSourceConfigured: Boolean(DISTRICT_DATA_URL) } });
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

const frontendBuildPath = path.resolve(__dirname, '../frontend/build');
const buildIndex = path.join(frontendBuildPath, 'index.html');

if (fs.existsSync(buildIndex)) {
  app.use(express.static(frontendBuildPath));
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
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
