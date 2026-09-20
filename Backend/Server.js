require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const pool = mysql.createPool({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'scholarship_admin', waitForConnections: true, connectionLimit: 10, multipleStatements: true });
const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(x => x.trim());
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin(origin, cb) { return !origin || origins.includes(origin) ? cb(null, true) : cb(new Error('CORS')); }, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(session({ secret: process.env.SESSION_SECRET || 'development-secret-change-me', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 28800000 } }));
const loginLimit = rateLimit({ windowMs: 900000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Try again later.' } });
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const text = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const id = v => { const n = Number(v); return Number.isSafeInteger(n) && n > 0 ? n : null; };
const numeric = (v, min, max) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : null; };
const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function requireAuth(req, res, next) { if (!req.session.user) return fail(res, 401, 'Please sign in to continue.'); req.user = req.session.user; return next(); }
const role = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : fail(res, 403, 'You are not authorized to perform this action.');
async function notify(userId, type, title, message, applicationId = null, connection = pool) { await connection.query('INSERT INTO notifications (user_id,type,title,message,application_id) VALUES (?,?,?,?,?)', [userId, type, title, message, applicationId]); }
async function audit(actor, action, type, entity, metadata) { try { await pool.query('INSERT INTO audit_logs (actor_id,action,entity_type,entity_id,metadata) VALUES (?,?,?,?,?)', [actor, action, type, String(entity), metadata ? JSON.stringify(metadata) : null]); } catch (_) {} }
async function application(applicationId) { const [rows] = await pool.query('SELECT a.*,s.name scholarship_name,s.provider,s.amount,u.full_name student_name FROM applications a JOIN scholarships s ON s.id=a.scholarship_id JOIN users u ON u.id=a.student_id WHERE a.id=?', [applicationId]); return rows[0]; }
function canRead(user, item) { return user.role === 'ADMIN' || item.student_id === user.id || (user.role === 'INSTITUTION' && item.institution_id === user.institutionId); }
function recommendationsFor(scholarship, profile, education) { const reasons = []; const course = String(scholarship.eligible_course || '').toLowerCase(); if (!course || !education?.qualification || course.includes(String(education.qualification).toLowerCase())) reasons.push('Education requirement satisfied'); if (!scholarship.category || !profile.community || String(scholarship.category).toLowerCase().includes(String(profile.community).toLowerCase())) reasons.push('Category requirement satisfied'); if (!scholarship.district_name || !profile.state || String(scholarship.district_name).toLowerCase().includes(String(profile.state).toLowerCase())) reasons.push('Location requirement satisfied'); reasons.push('Application deadline is open'); return reasons; }
async function initialize() { try { const conn = await pool.getConnection(); await conn.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')); const migrationsDir = path.join(__dirname, 'migrations'); for (const migration of fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort()) await conn.query(fs.readFileSync(path.join(migrationsDir, migration), 'utf8')); conn.release(); console.log('Database schema is ready.'); } catch (error) { console.warn(`Database initialization skipped: ${error.message}`); } }

app.get('/api/health', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ success: true, data: { status: 'ok', database: 'connected', time: new Date().toISOString() } }); } catch (_) { fail(res, 503, 'Database is unavailable.'); } });
app.post('/api/auth/register', loginLimit, async (req, res) => { const email = text(req.body.email).toLowerCase(), password = String(req.body.password || ''), fullName = text(req.body.fullName, 160), userRole = text(req.body.role).toUpperCase(); if (!validEmail(email) || !fullName || !['STUDENT', 'INSTITUTION'].includes(userRole)) return fail(res, 400, 'Provide a valid name, email, and supported role.'); if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return fail(res, 400, 'Password must be at least 10 characters and include letters and numbers.'); if (userRole === 'INSTITUTION' && (!text(req.body.institutionName) || !text(req.body.institutionCode, 60))) return fail(res, 400, 'Institution name and code are required.'); let conn; try { const userId = randomUUID(), hash = await bcrypt.hash(password, 12); conn = await pool.getConnection(); await conn.beginTransaction(); await conn.query('INSERT INTO users (id,email,password_hash,role,full_name,phone) VALUES (?,?,?,?,?,?)', [userId, email, hash, userRole, fullName, text(req.body.phone, 25) || null]); if (userRole === 'STUDENT') await conn.query('INSERT INTO student_profiles_v2 (user_id) VALUES (?)', [userId]); else await conn.query('INSERT INTO institutions (id,user_id,name,code,state,address) VALUES (?,?,?,?,?,?)', [randomUUID(), userId, text(req.body.institutionName), text(req.body.institutionCode, 60), text(req.body.state,100)||null, text(req.body.address,1000)||null]); await conn.commit(); await audit(userId, 'REGISTER', 'user', userId); res.status(201).json({ success: true, data: { id: userId, email, role: userRole, fullName } }); } catch (e) { await conn?.rollback(); if (e.code === 'ER_DUP_ENTRY') return fail(res, 409, 'That email or institution code is already registered.'); fail(res, 500, 'Registration could not be completed.'); } finally { conn?.release(); } });
app.post('/api/auth/login', loginLimit, async (req, res) => { try { const [rows] = await pool.query('SELECT u.*,i.id institution_id FROM users u LEFT JOIN institutions i ON i.user_id=u.id WHERE u.email=? LIMIT 1', [text(req.body.email).toLowerCase()]); const u = rows[0]; if (!u || !u.is_active || !(await bcrypt.compare(String(req.body.password || ''), u.password_hash))) return fail(res, 401, 'Invalid email or password.'); req.session.regenerate(err => { if (err) return fail(res, 500, 'Could not create a secure session.'); req.session.user = { id: u.id, role: u.role, fullName: u.full_name, institutionId: u.institution_id || null }; req.session.save(() => res.json({ success: true, data: req.session.user })); }); } catch (_) { fail(res, 500, 'Login could not be completed.'); } });
app.post('/api/auth/logout', requireAuth, (req, res) => req.session.destroy(() => res.clearCookie('connect.sid').json({ success: true })));
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ success: true, data: req.user }));

app.get('/api/profile', requireAuth, role('STUDENT'), async (req, res) => {
  try {
    const [[p]] = await pool.query(`SELECT u.full_name AS fullName,u.email,u.phone,
      p.date_of_birth AS dateOfBirth,p.gender,p.community,p.religion,
      p.annual_income AS annualIncome,p.citizenship,p.disability,p.sports,
      p.ex_servicemen AS exServicemen,p.state,p.institution_id AS institutionId,
      p.profile_completion AS profileCompletion,p.updated_at AS updatedAt,
      e.qualification,e.institution_name AS institutionName,e.course,e.percentage,e.graduation_year AS graduationYear
      FROM users u JOIN student_profiles_v2 p ON p.user_id=u.id
      LEFT JOIN education e ON e.student_id=u.id AND e.is_current=1
      WHERE u.id=?`, [req.user.id]);
    res.json({ success: true, data: p || {} });
  } catch (error) {
    console.error('Profile load failed', { userId: req.user.id, error: error.message });
    fail(res, 500, 'Profile could not be loaded.');
  }
});
app.put('/api/profile', requireAuth, role('STUDENT'), async (req, res) => {
  const income =
    req.body.annualIncome === '' || req.body.annualIncome == null
      ? null
      : numeric(req.body.annualIncome, 0, 100000000);

  const marks =
    req.body.percentage === '' || req.body.percentage == null
      ? null
      : numeric(req.body.percentage, 0, 100);

  if (
    (income === null && req.body.annualIncome) ||
    (marks === null && req.body.percentage)
  ) {
    return fail(res, 400, 'Income or percentage is invalid.');
  }

  const fields = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE users SET full_name=?,phone=? WHERE id=?',
      [
        text(fields.fullName, 160),
        text(fields.phone, 25) || null,
        req.user.id
      ]
    );

    // Find the institution ID using the institution name
    const institutionName = text(fields.institutionName, 255);

    let institutionId = null;

    if (institutionName) {
      const [[institution]] = await conn.query(
        'SELECT id FROM institutions WHERE name=? LIMIT 1',
        [institutionName]
      );

      institutionId = institution?.id || null;
    }

    // Save student profile including institution_id
    await conn.query(
      `INSERT INTO student_profiles_v2
       (
         user_id,
         date_of_birth,
         gender,
         community,
         religion,
         annual_income,
         citizenship,
         disability,
         sports,
         ex_servicemen,
         state,
         institution_id,
         profile_completion
       )
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,80)
       ON DUPLICATE KEY UPDATE
         date_of_birth=VALUES(date_of_birth),
         gender=VALUES(gender),
         community=VALUES(community),
         religion=VALUES(religion),
         annual_income=VALUES(annual_income),
         citizenship=VALUES(citizenship),
         disability=VALUES(disability),
         sports=VALUES(sports),
         ex_servicemen=VALUES(ex_servicemen),
         state=VALUES(state),
         institution_id=VALUES(institution_id),
         profile_completion=80`,
      [
        req.user.id,
        text(fields.dateOfBirth, 10) || null,
        text(fields.gender, 30) || null,
        text(fields.community, 100) || null,
        text(fields.religion, 100) || null,
        income,
        text(fields.citizenship, 80) || null,
        Boolean(fields.disability),
        Boolean(fields.sports),
        Boolean(fields.exServicemen),
        text(fields.state, 100) || null,
        institutionId
      ]
    );

    const [[profileRow]] = await conn.query(
      'SELECT user_id FROM student_profiles_v2 WHERE user_id=?',
      [req.user.id]
    );

    if (!profileRow) {
      throw new Error('Profile database row was not persisted.');
    }

    await conn.query(
      'DELETE FROM education WHERE student_id=? AND is_current=1',
      [req.user.id]
    );

    if (text(fields.qualification)) {
      await conn.query(
        `INSERT INTO education
         (student_id,qualification,institution_name,course,percentage,graduation_year)
         VALUES (?,?,?,?,?,?)`,
        [
          req.user.id,
          text(fields.qualification, 150),
          text(fields.institutionName, 255) || null,
          text(fields.course, 200) || null,
          marks,
          numeric(fields.graduationYear, 1900, 2200)
        ]
      );
    }

    await conn.commit();

    await audit(
      req.user.id,
      'UPDATE',
      'profile',
      req.user.id
    );

    res.json({ success: true });

  } catch (error) {
    await conn.rollback();

    console.error('Profile save failed', {
      userId: req.user.id,
      error: error.message
    });

    fail(res, 500, 'Profile could not be saved.');

  } finally {
    conn.release();
  }
});

app.get('/api/scholarships', async (req,res) => { const page=Math.max(1,id(req.query.page)||1), limit=Math.min(50,id(req.query.limit)||12), clauses=["status='active'",'end_date>=CURDATE()'], values=[], q=text(req.query.q,100); if(q){clauses.push('(name LIKE ? OR provider LIKE ? OR description LIKE ?)');values.push(`%${q}%`,`%${q}%`,`%${q}%`);} if(text(req.query.category)){clauses.push('category=?');values.push(text(req.query.category,100));} if(text(req.query.course)){clauses.push('eligible_course LIKE ?');values.push(`%${text(req.query.course,100)}%`);} const where=clauses.join(' AND '); try {const [[count]]=await pool.query(`SELECT COUNT(*) total FROM scholarships WHERE ${where}`,values);const [items]=await pool.query(`SELECT * FROM scholarships WHERE ${where} ORDER BY end_date LIMIT ? OFFSET ?`,[...values,limit,(page-1)*limit]);res.json({success:true,data:{items,total:count.total,page,limit}});}catch(_){fail(res,500,'Scholarships could not be loaded.');} });
app.get('/api/scholarships/:id', async(req,res) => { const scholarshipId=id(req.params.id); if(!scholarshipId)return fail(res,400,'Invalid scholarship ID.'); const [[s]]=await pool.query('SELECT * FROM scholarships WHERE id=?',[scholarshipId]);if(!s)return fail(res,404,'Scholarship not found.');const [rules]=await pool.query('SELECT rule_key,operator,rule_value,description FROM scholarship_eligibility_rules WHERE scholarship_id=?',[scholarshipId]);const [documents]=await pool.query('SELECT document_name,required FROM scholarship_required_documents WHERE scholarship_id=?',[scholarshipId]);res.json({success:true,data:{...s,rules,requiredDocuments:documents}}); });
app.post('/api/scholarships/:id/save', requireAuth, role('STUDENT'), async(req,res)=>{const scholarshipId=id(req.params.id);if(!scholarshipId)return fail(res,400,'Invalid scholarship ID.');try{await pool.query('INSERT IGNORE INTO saved_scholarships (student_id,scholarship_id) VALUES (?,?)',[req.user.id,scholarshipId]);res.json({success:true});}catch(_){fail(res,500,'Scholarship could not be saved.');}});
app.delete('/api/scholarships/:id/save', requireAuth, role('STUDENT'), async(req,res)=>{await pool.query('DELETE FROM saved_scholarships WHERE student_id=? AND scholarship_id=?',[req.user.id,id(req.params.id)]);res.json({success:true});});
app.get('/api/saved-scholarships', requireAuth, role('STUDENT'), async(req,res)=>{const [items]=await pool.query('SELECT s.* FROM saved_scholarships x JOIN scholarships s ON s.id=x.scholarship_id WHERE x.student_id=? ORDER BY x.created_at DESC',[req.user.id]);res.json({success:true,data:items});});
app.get('/api/recommendations', requireAuth, role('STUDENT'), async(req,res)=>{try {const [[p]]=await pool.query('SELECT p.*,e.qualification,e.percentage FROM student_profiles_v2 p LEFT JOIN education e ON e.student_id=p.user_id AND e.is_current=1 WHERE p.user_id=?',[req.user.id]);const [all]=await pool.query("SELECT * FROM scholarships WHERE status='active' AND end_date>=CURDATE() ORDER BY end_date LIMIT 100");const items=all.map(s=>({scholarship:s,reasons:recommendationsFor(s,p||{},p)})).filter(x=>x.reasons.length>=2).slice(0,8);for(const x of items) await pool.query('INSERT INTO recommendations (student_id,scholarship_id,reasons,model_version) VALUES (?,?,?,?)',[req.user.id,x.scholarship.id,JSON.stringify(x.reasons),'rules-v1']);res.json({success:true,data:items});}catch(_){fail(res,500,'Recommendations could not be generated.');}});
app.post('/api/eligibility', requireAuth, role('STUDENT'), async (req, res) => {
  console.log("ELIGIBILITY USER ID:", req.user.id);

  try {
    const [[p]] = await pool.query(
      'SELECT p.*, e.qualification, e.percentage ' +
      'FROM student_profiles_v2 p ' +
      'LEFT JOIN education e ' +
      'ON e.student_id = p.user_id AND e.is_current = 1 ' +
      'WHERE p.user_id = ?',
      [req.user.id]
    );

    console.log("ELIGIBILITY PROFILE:", p);

    if (!p) {
      return fail(
        res,
        400,
        'Complete your profile before checking AI eligibility.'
      );
    }

    const candidate = {
      education_qualification: p.qualification || '',
      gender: p.gender || '',
      community: p.community || '',
      religion: p.religion || '',
      exservice_men: p.ex_servicemen ? 'Yes' : 'No',
      disability: p.disability ? 'Yes' : 'No',
      sports: p.sports ? 'Yes' : 'No',
      annual_percentage: p.percentage || '',
      income: p.annual_income || '',
      india:
          String(p.citizenship || '').toLowerCase().startsWith('india')
          ? 'In'
          : 'Out'   
    };     

    const response = await fetch(
      `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5100'}/eligibility`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(candidate),
        signal: AbortSignal.timeout(5000)
      }
    );

    const body = await response.json();

    if (!response.ok) {
      return fail(
        res,
        503,
        body.message || 'Eligibility model is unavailable.'
      );
    }

    res.json({
      success: true,
      data: {
        ...body,
        notice:
          'This is an assistive prediction. Official scholarship rules determine eligibility.'
      }
    });

  } catch (error) {
    console.error('Eligibility check failed:', error.message);

    fail(
      res,
      503,
      'Eligibility model is unavailable. Start the AI service after training the model.'
    );
  }
});

    // KEEP THE REST OF YOUR ORIGINAL CODE HERE
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE || 5 * 1024 * 1024), files: 8 }, fileFilter: (_req, file, cb) => cb(null, ['application/pdf','image/jpeg','image/png'].includes(file.mimetype)) });
function magic(file) { const b=file.buffer; return (file.mimetype==='application/pdf' && b.subarray(0,4).toString()==='%PDF') || (file.mimetype==='image/jpeg' && b[0]===255 && b[1]===216) || (file.mimetype==='image/png' && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))); }
app.get('/api/applications', requireAuth, role('STUDENT'), async(req,res)=>{const [items]=await pool.query('SELECT a.*,s.name scholarship_name,s.provider,s.amount FROM applications a JOIN scholarships s ON s.id=a.scholarship_id WHERE a.student_id=? ORDER BY a.updated_at DESC',[req.user.id]);res.json({success:true,data:items});});
app.post('/api/applications', requireAuth, role('STUDENT'), async(req,res)=>{const scholarshipId=id(req.body.scholarshipId);if(!scholarshipId)return fail(res,400,'Invalid scholarship ID.');const [[s]]=await pool.query("SELECT id FROM scholarships WHERE id=? AND status='active' AND end_date>=CURDATE()",[scholarshipId]);if(!s)return fail(res,400,'This scholarship is not open for applications.');try{const [[p]]=await pool.query('SELECT institution_id FROM student_profiles_v2 WHERE user_id=?',[req.user.id]);const publicId=`APP-${new Date().getFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`;const [result]=await pool.query('INSERT INTO applications (public_id,scholarship_id,student_id,institution_id,form_data) VALUES (?,?,?,?,?)',[publicId,scholarshipId,req.user.id,p?.institution_id||null,JSON.stringify(req.body.formData||{})]);await pool.query('INSERT INTO application_status_history (application_id,status,changed_by,remarks) VALUES (?,?,?,?)',[result.insertId,'DRAFT',req.user.id,'Application draft created.']);res.status(201).json({success:true,data:{id:result.insertId,publicId,status:'DRAFT'}});}catch(e){if(e.code==='ER_DUP_ENTRY')return fail(res,409,'You already have an application for this scholarship.');fail(res,500,'Application could not be created.');}});
app.get('/api/applications/:id', requireAuth, async(req,res)=>{const applicationId=id(req.params.id),a=await application(applicationId);if(!a)return fail(res,404,'Application not found.');if(!canRead(req.user,a))return fail(res,403,'You are not authorized to view this application.');const [documents]=await pool.query('SELECT id,document_type,original_name,mime_type,file_size,status,created_at FROM documents WHERE application_id=?',[applicationId]);const [history]=await pool.query('SELECT h.*,u.full_name changed_by_name FROM application_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.application_id=? ORDER BY h.created_at',[applicationId]);res.json({success:true,data:{...a,documents,history}});});
app.post('/api/applications/:id/documents', requireAuth, role('STUDENT'), (req,res)=>upload.array('files')(req,res,async err=>{if(err)return fail(res,400,err.code==='LIMIT_FILE_SIZE'?'File exceeds size limit.':'Invalid upload.');const applicationId=id(req.params.id),a=await application(applicationId);if(!a||a.student_id!==req.user.id)return fail(res,404,'Application not found.');const documentType=text(req.body.documentType,100);if(!documentType||!req.files?.length)return fail(res,400,'Document type and at least one file are required.');try{const documentIds=[];for(const file of req.files){if(!magic(file))return fail(res,400,'The uploaded file content does not match its type.');const storageName=`${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;fs.writeFileSync(path.join(uploadDir,storageName),file.buffer,{flag:'wx'});const [r]=await pool.query('INSERT INTO documents (student_id,application_id,document_type,original_name,storage_name,mime_type,file_size,status) VALUES (?,?,?,?,?,?,?,?)',[req.user.id,applicationId,documentType,path.basename(file.originalname),storageName,file.mimetype,file.size,'PENDING']);documentIds.push(r.insertId);}res.status(201).json({success:true,data:{documentIds}});}catch(_){fail(res,500,'Document upload failed.');}}));
app.post('/api/applications/:id/submit', requireAuth, role('STUDENT'), async (req, res) => {
  const applicationId = id(req.params.id);
  const a = await application(applicationId);
  if (!a || a.student_id !== req.user.id) return fail(res, 404, 'Application not found.');
  if (a.status !== 'DRAFT') return res.json({ success: true, data: { alreadySubmitted: true } });
  const [[profile]] = await pool.query('SELECT profile_completion FROM student_profiles_v2 WHERE user_id=?', [req.user.id]);
  const [[docs]] = await pool.query("SELECT COUNT(*) total FROM documents WHERE application_id=? AND status IN ('PENDING','VERIFIED')", [applicationId]);
  if ((profile?.profile_completion || 0) < 80 || !docs.total) return fail(res, 400, 'Complete your profile and upload at least one document before submission.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [update] = await conn.query("UPDATE applications SET status='INSTITUTION_VERIFICATION',submitted_at=NOW() WHERE id=? AND student_id=? AND status='DRAFT'", [applicationId, req.user.id]);
    if (!update.affectedRows) {
      await conn.rollback();
      return res.json({ success: true, data: { alreadySubmitted: true } });
    }
    await conn.query('INSERT INTO application_status_history (application_id,status,changed_by,remarks) VALUES (?,?,?,?)', [applicationId, 'INSTITUTION_VERIFICATION', req.user.id, 'Application submitted.']);
    await notify(req.user.id, 'APPLICATION_SUBMITTED', 'Application submitted', `Your ${a.scholarship_name} application (${a.public_id}) was submitted.`, applicationId, conn);
    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.json({ success: true, data: { alreadySubmitted: true } });
    fail(res, 500, 'Application submission could not be completed.');
  } finally {
    conn.release();
  }
});
app.get('/api/documents/:id/download', requireAuth, async(req,res)=>{const documentId=id(req.params.id);const [[doc]]=await pool.query('SELECT d.*,a.institution_id FROM documents d LEFT JOIN applications a ON a.id=d.application_id WHERE d.id=?',[documentId]);if(!doc)return fail(res,404,'Document not found.');if(req.user.role!=='ADMIN'&&doc.student_id!==req.user.id&&!(req.user.role==='INSTITUTION'&&doc.institution_id===req.user.institutionId))return fail(res,403,'You are not authorized to access this document.');res.download(path.join(uploadDir,doc.storage_name),doc.original_name);});

app.get('/api/institution/applications', requireAuth, role('INSTITUTION'), async(req,res)=>{const [items]=await pool.query("SELECT a.*,u.full_name student_name,u.email,s.name scholarship_name FROM applications a JOIN users u ON u.id=a.student_id JOIN scholarships s ON s.id=a.scholarship_id WHERE a.institution_id=? AND a.status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','CORRECTION_REQUIRED') ORDER BY a.updated_at",[req.user.institutionId]);res.json({success:true,data:items});});
app.post('/api/institution/applications/:id/verify', requireAuth, role('INSTITUTION'), async(req,res)=>{const applicationId=id(req.params.id),a=await application(applicationId);if(!a||a.institution_id!==req.user.institutionId)return fail(res,404,'Application not found.');const decision=text(req.body.decision).toUpperCase(),remarks=text(req.body.remarks,1000);if(!['VERIFIED','REJECTED','CORRECTION_REQUIRED'].includes(decision))return fail(res,400,'Invalid verification decision.');const status=decision==='VERIFIED'?'DOCUMENT_VERIFICATION':decision;await pool.query('INSERT INTO institution_verifications (application_id,institution_id,verifier_id,decision,remarks) VALUES (?,?,?,?,?)',[applicationId,req.user.institutionId,req.user.id,decision,remarks||null]);await pool.query('UPDATE applications SET status=? WHERE id=?',[status,applicationId]);await pool.query('INSERT INTO application_status_history (application_id,status,changed_by,remarks) VALUES (?,?,?,?)',[applicationId,status,req.user.id,remarks||null]);await notify(a.student_id,'VERIFICATION',`Institution verification: ${decision}`,remarks||'Your application status was updated.');res.json({success:true});});
app.post('/api/institution/documents/:id/verify', requireAuth, role('INSTITUTION'), async(req,res)=>{const documentId=id(req.params.id);const [[doc]]=await pool.query('SELECT d.*,a.institution_id FROM documents d JOIN applications a ON a.id=d.application_id WHERE d.id=?',[documentId]);if(!doc||doc.institution_id!==req.user.institutionId)return fail(res,404,'Document not found.');const decision=text(req.body.decision).toUpperCase();if(!['VERIFIED','REJECTED','REUPLOAD_REQUIRED'].includes(decision))return fail(res,400,'Invalid document decision.');await pool.query('UPDATE documents SET status=? WHERE id=?',[decision,documentId]);await pool.query('INSERT INTO document_verifications (document_id,verifier_id,decision,remarks) VALUES (?,?,?,?)',[documentId,req.user.id,decision,text(req.body.remarks,1000)||null]);res.json({success:true});});

app.get('/api/admin/analytics', requireAuth, role('ADMIN'), async(_req,res)=>{const [[stats]]=await pool.query("SELECT (SELECT COUNT(*) FROM users WHERE role='STUDENT') students,(SELECT COUNT(*) FROM institutions) institutions,(SELECT COUNT(*) FROM scholarships WHERE status='active') scholarships,(SELECT COUNT(*) FROM applications) applications,(SELECT COUNT(*) FROM applications WHERE status IN ('INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','UNDER_REVIEW')) pending,(SELECT COUNT(*) FROM applications WHERE status='APPROVED') approved,(SELECT COUNT(*) FROM applications WHERE status='REJECTED') rejected");const [byScholarship]=await pool.query('SELECT s.name,COUNT(a.id) applications FROM scholarships s LEFT JOIN applications a ON a.scholarship_id=s.id GROUP BY s.id,s.name ORDER BY applications DESC LIMIT 8');res.json({success:true,data:{stats,byScholarship}});});
app.get('/api/admin/users', requireAuth, role('ADMIN'), async(req,res)=>{const wanted=text(req.query.role).toUpperCase(), allowed=['STUDENT','INSTITUTION','ADMIN'].includes(wanted);const [items]=await pool.query(`SELECT id,email,full_name,role,is_active,created_at FROM users ${allowed?'WHERE role=?':''} ORDER BY created_at DESC LIMIT 100`,allowed?[wanted]:[]);res.json({success:true,data:items});});
app.patch('/api/admin/users/:id/status', requireAuth, role('ADMIN'), async(req,res)=>{await pool.query('UPDATE users SET is_active=? WHERE id=?',[Boolean(req.body.isActive),req.params.id]);await audit(req.user.id,'UPDATE_STATUS','user',req.params.id,{active:Boolean(req.body.isActive)});res.json({success:true});});
app.post('/api/admin/scholarships', requireAuth, role('ADMIN'), async(req,res)=>{const b=req.body, amount=numeric(b.amount,0,100000000);if(!text(b.name)||!text(b.description)||!text(b.provider)||!text(b.type)||!text(b.startDate,10)||!text(b.endDate,10)||amount===null||new Date(b.startDate)>new Date(b.endDate))return fail(res,400,'Complete valid scholarship details.');const [r]=await pool.query('INSERT INTO scholarships (name,description,provider,scholarship_type,amount,category,eligible_course,district_name,start_date,end_date,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[text(b.name,200),text(b.description,10000),text(b.provider,200),text(b.type,100),amount,text(b.category,100)||null,text(b.course,200)||null,text(b.state,100)||null,b.startDate,b.endDate,b.status==='inactive'?'inactive':'active']);await audit(req.user.id,'CREATE','scholarship',r.insertId);res.status(201).json({success:true,data:{id:r.insertId}});});
app.get('/api/notifications', requireAuth, async(req,res)=>{const [items]=await pool.query('SELECT n.*,a.public_id application_public_id,s.name scholarship_name FROM notifications n LEFT JOIN applications a ON a.id=n.application_id LEFT JOIN scholarships s ON s.id=a.scholarship_id WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 50',[req.user.id]);res.json({success:true,data:items});});
app.patch('/api/notifications/:id/read', requireAuth, async(req,res)=>{await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?',[id(req.params.id),req.user.id]);res.json({success:true});});
app.use((err,_req,res,_next)=>{if(err.message==='CORS')return fail(res,403,'Origin is not allowed.');console.error('Unexpected API error:',err.message);return fail(res,500,'Unexpected server error.');});
app.use((_req,res)=>fail(res,404,'Route not found.'));
initialize().finally(()=>app.listen(PORT,()=>console.log(`Scholarship API listening on ${PORT}`)));
