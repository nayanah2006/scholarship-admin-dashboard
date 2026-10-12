'use strict';

/**
 * Scholarship FAQ chatbot — rule-based, grounded in the portal database,
 * and personalized with persisted conversation memory for the signed-in user.
 */

const MAX_ANSWER_LENGTH = 800;
const HISTORY_LIMIT = 12;

function truncate(s) {
  return s.length > MAX_ANSWER_LENGTH ? s.slice(0, MAX_ANSWER_LENGTH) + '…' : s;
}

async function loadScholarships(pool) {
  try {
    const [items] = await pool.query(
      'SELECT id, name, provider, amount, description, category, eligible_course, district_name, start_date, end_date, status FROM scholarships WHERE status="active" AND end_date >= CURDATE() ORDER BY end_date'
    );
    return items;
  } catch (_) {
    return [];
  }
}

async function loadStudentContext(pool, user) {
  if (!user?.id || user.role !== 'STUDENT') {
    return { profile: null, applications: [], education: null };
  }
  const [[profile]] = await pool.query(
    `SELECT u.full_name, u.email, p.community, p.state, p.gender, p.annual_income, p.citizenship,
            e.qualification, e.course, e.percentage, e.institution_name
     FROM users u
     LEFT JOIN student_profiles_v2 p ON p.user_id=u.id
     LEFT JOIN education e ON e.student_id=u.id AND e.is_current=1
     WHERE u.id=?`,
    [user.id]
  );
  const [applications] = await pool.query(
    `SELECT a.id, a.public_id, a.status, s.name scholarship_name, s.end_date
     FROM applications a JOIN scholarships s ON s.id=a.scholarship_id
     WHERE a.student_id=? ORDER BY a.updated_at DESC LIMIT 8`,
    [user.id]
  );
  return { profile: profile || null, applications, education: profile };
}

async function getOrCreateSession(pool, user) {
  const [[existing]] = await pool.query(
    'SELECT id FROM chat_sessions WHERE user_id=? ORDER BY updated_at DESC LIMIT 1',
    [user.id]
  );
  if (existing) {
    await pool.query('UPDATE chat_sessions SET updated_at=NOW() WHERE id=?', [existing.id]);
    return existing.id;
  }
  const [result] = await pool.query(
    'INSERT INTO chat_sessions (user_id, role) VALUES (?, ?)',
    [user.id, user.role]
  );
  return result.insertId;
}

async function loadHistory(pool, sessionId, limit = HISTORY_LIMIT) {
  const [rows] = await pool.query(
    'SELECT role, content, sources, created_at FROM chat_messages WHERE session_id=? ORDER BY id DESC LIMIT ?',
    [sessionId, limit]
  );
  return rows.reverse();
}

async function saveMessage(pool, sessionId, role, content, sources = null) {
  await pool.query(
    'INSERT INTO chat_messages (session_id, role, content, sources) VALUES (?,?,?,?)',
    [sessionId, role, content, sources ? JSON.stringify(sources) : null]
  );
}

function findMentionedScholarship(text, scholarships) {
  const haystack = String(text || '').toLowerCase();
  let best = null;
  let bestLen = 0;
  for (const s of scholarships) {
    const name = String(s.name || '').toLowerCase();
    const mentioned = name.length >= 4
      ? haystack.includes(name)
      : new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9])`, 'i').test(haystack);
    if (name.length > 0 && mentioned && name.length > bestLen) {
      best = s;
      bestLen = name.length;
    }
  }
  return best;
}

async function hasCatalogWideDocumentTemplate(pool, scholarshipId, documentCount, activeScholarshipCount) {
  if (!activeScholarshipCount || !documentCount) return false;
  const [[result]] = await pool.query(
    `SELECT COUNT(*) AS shared_count
     FROM scholarships s
     WHERE s.status='active' AND s.end_date>=CURDATE()
       AND (SELECT COUNT(*) FROM scholarship_required_documents candidate
            WHERE candidate.scholarship_id=s.id)=?
       AND NOT EXISTS (
         SELECT 1
         FROM scholarship_required_documents requested
         WHERE requested.scholarship_id=?
           AND NOT EXISTS (
             SELECT 1
             FROM scholarship_required_documents candidate
             WHERE candidate.scholarship_id=s.id
               AND candidate.document_name=requested.document_name
               AND candidate.required=requested.required
           )
       )`,
    [documentCount, scholarshipId]
  );
  return Number(result.shared_count) / activeScholarshipCount >= 0.8;
}

function personalizedPrefix(user, profile) {
  const name = profile?.full_name || user?.fullName;
  if (!name) return '';
  return `${name.split(' ')[0]}, `;
}

async function getAnswer(pool, message, user, options = {}) {
  const msg = String(message || '').trim();
  const msgLower = msg.toLowerCase();
  if (!msg) return { answer: 'Please enter a question about scholarships.', sources: [] };

  const scholarships = await loadScholarships(pool);
  const { profile, applications } = options.studentContext || await loadStudentContext(pool, user);
  const mentioned = findMentionedScholarship(msg, scholarships);
  const greet = personalizedPrefix(user, profile);

  if (msgLower.includes('available') || msgLower.includes('what scholarships') || msgLower.includes('open scholarship') || msgLower.includes('can i apply')) {
    if (!scholarships.length) return { answer: 'No active scholarships are currently listed in the portal.', sources: [] };
    let listSource = scholarships;
    if (profile && (profile.qualification || profile.community || profile.state)) {
      const matched = matchByProfile(scholarships, profile);
      if (matched.length) listSource = matched;
    }
    const list = listSource.slice(0, 10).map((s) => `${s.name} (${s.provider}) — ₹${Number(s.amount).toLocaleString('en-IN')} — deadline ${String(s.end_date).slice(0, 10)}`).join('\n');
    const personal = profile?.qualification
      ? ` Using your saved profile (${profile.qualification}${profile.community ? `, ${profile.community}` : ''}${profile.state ? `, ${profile.state}` : ''}), `
      : ' ';
    return {
      answer: truncate(`${greet}based on the scholarship catalog currently available in the portal,${personal}the following scholarships are open:\n\n${list}\n\nTo see details, deadlines, or required documents for a specific scholarship, tell me the scholarship name.`),
      sources: listSource.slice(0, 10).map((s) => ({ name: s.name, provider: s.provider, deadline: String(s.end_date).slice(0, 10) }))
    };
  }

  if (msgLower.includes('eligible') || msgLower.includes('am i eligible') || msgLower.includes('eligibility')) {
    if (user?.role !== 'STUDENT') {
      return { answer: 'Eligibility matching uses a student profile. Sign in as a student to get personalized eligibility guidance from the catalog.', sources: [] };
    }
    if (!profile || !(profile.qualification || profile.community || profile.state)) {
      return { answer: `${greet}your profile is needed to check eligibility. Please complete your profile first, then ask about eligibility.`, sources: [] };
    }
    const matched = matchByProfile(scholarships, profile);
    if (!matched.length) {
      return { answer: `${greet}based on your profile in the portal, no active scholarships match your current qualification, community, or state. Consider updating your profile or checking individual scholarship requirements.`, sources: [] };
    }
    const list = matched.slice(0, 8).map((s) => s.name).join(', ');
    return {
      answer: truncate(`${greet}based on your profile (qualification: ${profile.qualification || 'not specified'}, community: ${profile.community || 'not specified'}, state: ${profile.state || 'not specified'}), the following active scholarships in the portal may match your profile:\n\n${list}\n\nThese are informational matches from the portal catalog. Official eligibility rules from the provider determine the final decision.`),
      sources: matched.slice(0, 8).map((s) => ({ name: s.name, eligible_course: s.eligible_course }))
    };
  }

  if (msgLower.includes('document') || msgLower.includes('what do i need') || msgLower.includes('required paper')) {
    if (!mentioned) {
      const options = scholarships.slice(0, 8).map(({ id, name }) => ({ id, name }));
      if (!options.length) {
        return { answer: 'I could not find any open scholarships in the portal. Please check back later or contact your scholarship office.', sources: [] };
      }
      return {
        answer: `${greet}which scholarship are you asking about? Choose one below and I will show its required documents.`,
        sources: [],
        options
      };
    }
    const [docs] = await pool.query(
      'SELECT document_name, required FROM scholarship_required_documents WHERE scholarship_id=? ORDER BY required DESC, document_name',
      [mentioned.id]
    );
    if (!docs.length) {
      return {
        answer: truncate(`${greet}the portal does not have a required-document list for ${mentioned.name}. Please check with the scholarship provider for its official requirements.`),
        sources: [{ name: mentioned.name }]
      };
    }
    if (await hasCatalogWideDocumentTemplate(pool, mentioned.id, docs.length, scholarships.length)) {
      return {
        answer: truncate(`${greet}the portal does not have a verified document checklist specific to ${mentioned.name}. The document records currently use the same checklist for most active scholarships, so I cannot confirm that it applies to this scheme. Please check ${mentioned.provider}'s official guidelines for the mandatory documents.`),
        sources: []
      };
    }
    const list = docs.map((d) => `${d.document_name}${d.required ? ' (required)' : ' (optional)'}`).join(', ');
    return {
      answer: truncate(`${greet}for ${mentioned.name}, the portal lists these documents: ${list}.`),
      sources: docs.map((d) => ({ document_name: d.document_name, scholarship: mentioned.name }))
    };
  }

  if (msgLower.includes('deadline') || msgLower.includes('when is it due') || msgLower.includes('end date')) {
    if (mentioned) {
      return {
        answer: truncate(`${greet}${mentioned.name} closes on ${String(mentioned.end_date).slice(0, 10)} according to the portal catalog.`),
        sources: [{ name: mentioned.name, deadline: String(mentioned.end_date).slice(0, 10) }]
      };
    }
    const upcoming = scholarships.filter((s) => new Date(s.end_date) > new Date()).sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    if (!upcoming.length) return { answer: 'No upcoming deadlines found in the current catalog.', sources: [] };
    const list = upcoming.slice(0, 5).map((s) => `${s.name} — ${String(s.end_date).slice(0, 10)}`).join('\n');
    return { answer: truncate(`Upcoming deadlines from the portal:\n\n${list}`), sources: upcoming.slice(0, 5).map((s) => ({ name: s.name, deadline: String(s.end_date).slice(0, 10) })) };
  }

  if (msgLower.includes('my application') || msgLower.includes('application status') || msgLower.includes('status of my') || ((msgLower.includes('status') || msgLower.includes('why does my application') || msgLower.includes('why is my application')) && applications.length)) {
    if (user?.role !== 'STUDENT') {
      return { answer: 'Sign in as a student to check your own application status.', sources: [] };
    }
    if (!applications.length) {
      return { answer: `${greet}you do not currently have applications stored in this portal. Complete your profile, choose a scholarship, upload documents, then submit.`, sources: [] };
    }
    const list = applications.map((a) => `${a.scholarship_name} (${a.public_id}): ${a.status}`).join('\n');
    return {
      answer: truncate(`${greet}here are your current applications from the portal:\n\n${list}\n\nStatuses: DRAFT, INSTITUTION_VERIFICATION, DOCUMENT_VERIFICATION, CORRECTION_REQUIRED, UNDER_REVIEW, APPROVED, or REJECTED.`),
      sources: applications.map((a) => ({ name: a.scholarship_name, status: a.status, public_id: a.public_id }))
    };
  }

  if (msgLower.includes('status') || msgLower.includes('why does my application') || msgLower.includes('why is my application')) {
    return { answer: truncate('Application statuses you may see: DRAFT (incomplete), INSTITUTION_VERIFICATION (college reviewing), DOCUMENT_VERIFICATION (documents under review), CORRECTION_REQUIRED (action needed), UNDER_REVIEW (final review), APPROVED, or REJECTED. Check your applications page for the current status.'), sources: [] };
  }

  if (msgLower.includes('how do i apply') || msgLower.includes('how to apply') || msgLower.includes('application process')) {
    return { answer: truncate('To apply through this portal: (1) Complete your student profile. (2) Browse and select a scholarship. (3) Upload the required documents. (4) Submit your application. Your institution may then verify the application before it reaches final review.'), sources: [] };
  }

  if (msgLower.includes('institution verification') || msgLower.includes('what is institution verification')) {
    return { answer: truncate('Institution verification is the stage where your college or institution confirms your eligibility (e.g., enrollment status). After they verify, your application moves to the document verification stage.'), sources: [] };
  }

  if (msgLower.includes('submitted meaning') || msgLower.includes('verified meaning') || msgLower.includes('rejected meaning') || msgLower.includes('what does submitted') || msgLower.includes('what does verified')) {
    return { answer: truncate('"Submitted" means your application was sent to your institution. "Verified" means your institution or document reviewer confirmed the application/documents. "Rejected" means the application did not meet requirements at that stage.'), sources: [] };
  }

  if (msgLower.includes('upload') || msgLower.includes('document upload') || msgLower.includes('how do i upload')) {
    return { answer: truncate('Create an application draft, select the document type, then upload your PDF, JPEG, or PNG file. The portal validates the file signature before accepting it.'), sources: [] };
  }

  if (mentioned && (msgLower.includes('amount') || msgLower.includes('provide') || msgLower.includes('what does') || msgLower.includes('tell me about') || msgLower.includes('details'))) {
    return {
      answer: truncate(`${greet}${mentioned.name} is provided by ${mentioned.provider}. Amount: ₹${Number(mentioned.amount).toLocaleString('en-IN')}. Category: ${mentioned.category || 'not specified'}. Course: ${mentioned.eligible_course || 'see catalog'}. Deadline: ${String(mentioned.end_date).slice(0, 10)}.`),
      sources: [{ name: mentioned.name, provider: mentioned.provider, deadline: String(mentioned.end_date).slice(0, 10) }]
    };
  }

  if (msgLower.includes('provide') || msgLower.includes('what does') || msgLower.includes('give')) {
    return { answer: truncate('Scholarship details in the portal include the provider, amount, category, eligibility criteria, required documents, and deadline. Select a specific scholarship to see its full details.'), sources: [] };
  }

  return {
    answer: truncate("I'm here to help with scholarship-related questions such as eligibility, deadlines, documents, applications, and status. I answer using the scholarship catalog stored in this portal. I couldn't find that information in the portal — please check the scholarship's official details or contact the relevant institution."),
    sources: []
  };
}

function matchByProfile(scholarships, profile) {
  if (!profile) return [];
  const q = (profile.qualification || '').toLowerCase();
  const comm = (profile.community || '').toLowerCase();
  const state = (profile.state || '').toLowerCase();
  return scholarships.filter((s) => {
    const course = (s.eligible_course || '').toLowerCase();
    const cat = (s.category || '').toLowerCase();
    const district = (s.district_name || '').toLowerCase();
    let matched = true;
    if (q && course && !course.includes(q) && !q.includes(course.slice(0, 4))) matched = false;
    if (matched && comm && cat && !cat.includes(comm)) matched = false;
    if (matched && state && district && !district.includes(state)) matched = false;
    return matched;
  });
}

module.exports = {
  getAnswer,
  loadScholarships,
  loadStudentContext,
  getOrCreateSession,
  loadHistory,
  saveMessage
};
