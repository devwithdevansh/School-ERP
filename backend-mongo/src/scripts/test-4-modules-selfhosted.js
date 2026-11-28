/**
 * test-4-modules-selfhosted.js
 * Starts the express app in-process, runs all tests, then shuts down.
 * Usage:  cd backend-mongo && node src/scripts/test-4-modules-selfhosted.js
 */
import '../config/tenancy.js';
import 'dotenv/config';
import mongoose from 'mongoose';
import env from '../config/env.js';
import app from '../app.js';

const pass = (msg) => console.log(`  ✅ PASS: ${msg}`);
const fail = (msg, detail) => console.error(`  ❌ FAIL: ${msg}`, JSON.stringify(detail ?? ''));
let FAILS = 0;
function checkPass(msg) { pass(msg); }
function checkFail(msg, d) { fail(msg, d); FAILS++; }

// ── start server ─────────────────────────────────────────────────────────────
await mongoose.connect(env.MONGODB_URI);
console.log('✅ MongoDB connected');

const server = app.listen(3099, '127.0.0.1');
await new Promise(r => server.once('listening', r));
console.log('✅ Test server on 127.0.0.1:3099\n');

const BASE = 'http://127.0.0.1:3099/api/v1';
const ADMIN_EMAIL = env.SEED_ADMIN_EMAIL || (process.env.SEED_ADMIN_EMAIL || 'admin@school.local');
const ADMIN_PASS  = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@123';

let TOKEN = '';
let STUDENT_ID = '';
let ACADEMIC_YEAR_ID = '';

async function req(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${BASE}${path}`, opts);
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, json };
  } catch (err) {
    return { status: 0, json: { error: err.message } };
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
console.log('── LOGIN ──────────────────────────────');
const { status: ls, json: lj } = await req('POST', '/auth/portal/login', {
  email: ADMIN_EMAIL, password: ADMIN_PASS,
});
const loginData = lj?.data || lj;
if (ls === 200 && loginData?.accessToken) {
  TOKEN = loginData.accessToken;
  checkPass(`Logged in as ${ADMIN_EMAIL} (role: ${loginData.user?.role})`);
} else {
  checkFail('Login failed', lj);
  server.close(); await mongoose.disconnect(); process.exit(1);
}

// ── BOOTSTRAP DATA ────────────────────────────────────────────────────────────
console.log('\n── BOOTSTRAP DATA ─────────────────────');
const { status: ss, json: sj } = await req('GET', '/students?limit=1');
if (ss === 200 && sj?.data?.length > 0) {
  STUDENT_ID = sj.data[0]._id;
  checkPass(`Student: "${sj.data[0].studentName}" (${STUDENT_ID})`);
} else {
  checkFail('No students found — run seed first', sj);
}

const { status: as, json: aj } = await req('GET', '/academic-years?limit=1');
if (as === 200 && aj?.data?.length > 0) {
  ACADEMIC_YEAR_ID = aj.data[0]._id;
  checkPass(`Academic year: ${aj.data[0].year || aj.data[0].label || ACADEMIC_YEAR_ID}`);
} else {
  checkFail('No academic year found', aj);
}

const { status: subS, json: subJ } = await req('GET', '/academic-master/subjects?limit=1');
let SUBJECT_ID = subJ?.data?.[0]?._id || '';
if (SUBJECT_ID) checkPass(`Subject: ${subJ.data[0].name || SUBJECT_ID}`);
else checkPass('No subjects yet — skipping concept-tag sub-tests');

// Test student search
const { status: srchS, json: srchJ } = await req('GET', '/students?search=DEMO&limit=5');
if (srchS === 200 && (srchJ?.data?.length > 0 || Array.isArray(srchJ))) {
  checkPass(`Student search: found ${(srchJ.data || srchJ).length} matching student(s)`);
} else {
  checkFail('Student search query failed', srchJ);
}

// ── 1. COUNSELING ─────────────────────────────────────────────────────────────
console.log('\n── 1. COUNSELING ──────────────────────');
let COUNSELING_ID = '';

if (!STUDENT_ID) {
  checkFail('Counseling skipped — no student');
} else {
  const { status: ms, json: mj } = await req('GET', '/counseling/mine');
  if (ms === 200) checkPass(`GET /counseling/mine → ${mj?.results ?? mj?.data?.length ?? 0} records`);
  else checkFail('GET /counseling/mine', mj);

  const { status: gs, json: gj } = await req('GET', `/counseling/student/${STUDENT_ID}`);
  if (gs === 200) checkPass(`GET /counseling/student/:id → ${gj?.results ?? 0} records`);
  else checkFail(`GET /counseling/student/${STUDENT_ID}`, gj);

  const { status: cs, json: cj } = await req('POST', '/counseling', {
    studentId: STUDENT_ID, type: 'academic',
    summary: '[AutoTest] counseling record',
    visibility: 'admin_teacher_only',
    supportPlan: [{ milestone: 'Review notes', targetDate: new Date(Date.now() + 7 * 86400000).toISOString() }],
  });
  const recData = cj?.data || cj;
  if (cs === 201 && recData?._id) {
    COUNSELING_ID = recData._id;
    checkPass(`POST /counseling created ${COUNSELING_ID}`);

    const { status: ams } = await req('POST', `/counseling/${COUNSELING_ID}/milestone`, {
      milestone: 'Practice problems daily', targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
    if (ams === 201) checkPass('POST /counseling/:id/milestone');
    else checkFail('POST /counseling/:id/milestone');

    const { status: ums } = await req('PATCH', `/counseling/${COUNSELING_ID}/milestone/0`, { status: 'in_progress' });
    if (ums === 200) checkPass('PATCH /counseling/:id/milestone/0');
    else checkFail('PATCH /counseling/:id/milestone/0');

    const { status: us } = await req('PATCH', `/counseling/${COUNSELING_ID}`, { summary: '[AutoTest] updated summary' });
    if (us === 200) checkPass('PATCH /counseling/:id update');
    else checkFail('PATCH /counseling/:id update');

    const { status: pcs } = await req('PATCH', `/counseling/${COUNSELING_ID}/consent`);
    if (pcs === 200) checkPass('PATCH /counseling/:id/consent');
    else checkFail('PATCH /counseling/:id/consent');

    const { status: cls, json: clj } = await req('PATCH', `/counseling/${COUNSELING_ID}/close`);
    if (cls === 200) checkPass(`PATCH /counseling/:id/close → ${clj?.data?.status}`);
    else checkFail('PATCH /counseling/:id/close', clj);
  } else {
    checkFail('POST /counseling', cj);
  }
}

// ── 2. STUDENT VOICE ──────────────────────────────────────────────────────────
console.log('\n── 2. STUDENT VOICE ───────────────────');
let VOICE_ID = '';

const { status: vms, json: vmj } = await req('GET', '/student-voice/my');
if (vms === 200) checkPass(`GET /student-voice/my → ${Array.isArray(vmj) ? vmj.length : (vmj?.length ?? 0)} items`);
else checkFail('GET /student-voice/my', vmj);

const { status: vqs, json: vqj } = await req('GET', '/student-voice/queue');
if (vqs === 200) checkPass(`GET /student-voice/queue → ${Array.isArray(vqj) ? vqj.length : (vqj?.length ?? 0)} items`);
else checkFail('GET /student-voice/queue', vqj);

const { status: vcs, json: vcj } = await req('POST', '/student-voice', {
  category: 'academic', title: '[AutoTest] Voice Submission',
  description: 'Automated test submission for student voice module. This is a test.',
  isAnonymous: false, studentId: STUDENT_ID || null,
});
if (vcs === 201 && (vcj?._id || vcj?.data?._id)) {
  VOICE_ID = vcj._id || vcj.data?._id;
  checkPass(`POST /student-voice created ${VOICE_ID}`);

  const { status: vgs, json: vgj } = await req('GET', `/student-voice/${VOICE_ID}`);
  if (vgs === 200) checkPass(`GET /student-voice/:id → title: "${vgj?.title || vgj?.data?.title}"`);
  else checkFail(`GET /student-voice/${VOICE_ID}`, vgj);

  const { status: vts } = await req('POST', `/student-voice/${VOICE_ID}/thread`, {
    message: '[AutoTest] Staff reply: noted, will follow up',
  });
  if (vts === 201) checkPass('POST /student-voice/:id/thread');
  else checkFail('POST /student-voice/:id/thread');

  const { status: vus } = await req('PATCH', `/student-voice/${VOICE_ID}/status`, { status: 'under_review' });
  if (vus === 200) checkPass('PATCH /student-voice/:id/status → under_review');
  else checkFail('PATCH /student-voice/:id/status');

  const { status: vrs } = await req('PATCH', `/student-voice/${VOICE_ID}/status`, { status: 'resolved' });
  if (vrs === 200) checkPass('PATCH /student-voice/:id/status → resolved');
  else checkFail('PATCH /student-voice/:id/status resolved');
} else {
  checkFail('POST /student-voice', vcj);
}

// ── 3. SAFEREACH ──────────────────────────────────────────────────────────────
console.log('\n── 3. SAFEREACH ───────────────────────');
if (!STUDENT_ID || !ACADEMIC_YEAR_ID) {
  checkFail('SafeReach skipped — missing student or academic year');
} else {
  const { status: gcs } = await req('GET', `/safereach/consent/${STUDENT_ID}?academicYearId=${ACADEMIC_YEAR_ID}`);
  if (gcs === 200) checkPass('GET /safereach/consent/:studentId → found');
  else if (gcs === 404) checkPass('GET /safereach/consent/:studentId → 404 (expected, no consent yet)');
  else checkFail('GET /safereach/consent/:studentId', {status: gcs});

  const { status: ts, json: tj } = await req('GET', `/safereach/trip/today?academicYearId=${ACADEMIC_YEAR_ID}`);
  if (ts === 200) checkPass(`GET /safereach/trip/today → ${tj?.data?.length ?? tj?.count ?? 0} trips`);
  else checkFail('GET /safereach/trip/today', tj);

  const { status: hs, json: hj } = await req('GET', `/safereach/trip/history?studentId=${STUDENT_ID}`);
  if (hs === 200) checkPass(`GET /safereach/trip/history → ${hj?.data?.length ?? hj?.count ?? 0} records`);
  else checkFail('GET /safereach/trip/history', hj);

  // PUT consent (admin sets it on behalf of parent)
  const { status: pcs, json: pcj } = await req('PUT', '/safereach/consent', {
    studentId: STUDENT_ID, academicYearId: ACADEMIC_YEAR_ID,
    consentGiven: true, homeRadiusMeters: 300, notifyDelayAfterMinutes: 15,
    homeAddress: { lat: 23.0225, lng: 72.5714, label: 'Test Home' },
  });
  if (pcs === 200) checkPass('PUT /safereach/consent updated');
  else checkFail('PUT /safereach/consent', pcj);
}

// ── 4. ACADEMIC INTELLIGENCE ──────────────────────────────────────────────────
console.log('\n── 4. ACADEMIC INTELLIGENCE ───────────');
if (!STUDENT_ID) {
  checkFail('Academic Intelligence skipped — no student');
} else {
  const { status: ms, json: mj } = await req('GET', `/academic-intelligence/mastery/student/${STUDENT_ID}`);
  if (ms === 200) checkPass(`GET /mastery/student/:id → ${mj?.results ?? 0} records`);
  else checkFail('GET /mastery/student/:id', mj);

  const { status: gs, json: gj } = await req('GET', `/academic-intelligence/gaps/student/${STUDENT_ID}?threshold=70`);
  if (gs === 200) checkPass(`GET /gaps/student/:id → ${gj?.results ?? 0} gaps`);
  else checkFail('GET /gaps/student/:id', gj);

  const { status: ps, json: pj } = await req('GET', `/academic-intelligence/plans/student/${STUDENT_ID}`);
  if (ps === 200) checkPass(`GET /plans/student/:id → ${pj?.results ?? 0} plans`);
  else checkFail('GET /plans/student/:id', pj);

  if (SUBJECT_ID) {
    // Create concept tag with unique name per test run
    const conceptName = `[AutoTest] Concept ${Date.now()}`;
    const { status: tcs, json: tcj } = await req('POST', '/academic-intelligence/concept-tags', {
      subjectId: SUBJECT_ID, chapterNumber: 99, chapterName: '[AutoTest] Chapter',
      conceptName, sequence: 99,
    });
    const tagData = tcj?.data || tcj;
    const TAG_ID = tagData?._id || '';
    if ((tcs === 201 || tcs === 200) && TAG_ID) {
      checkPass(`POST /academic-intelligence/concept-tags → ${TAG_ID}`);

      // Create improvement plan
      const { status: ips, json: ipj } = await req('POST', '/academic-intelligence/plans', {
        studentId: STUDENT_ID, conceptTagId: TAG_ID,
        description: '[AutoTest] improvement plan',
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        resources: [{ title: 'Khan Academy', url: 'https://khanacademy.org', type: 'link' }],
      });
      const planData = ipj?.data || ipj;
      const PLAN_ID = planData?._id || '';
      if (ips === 201 && PLAN_ID) {
        checkPass(`POST /academic-intelligence/plans → ${PLAN_ID}`);
        const { status: ups } = await req('PATCH', `/academic-intelligence/plans/${PLAN_ID}`, { status: 'completed' });
        if (ups === 200) checkPass('PATCH /academic-intelligence/plans/:id → completed');
        else checkFail('PATCH /academic-intelligence/plans/:id');
      } else {
        checkFail('POST /academic-intelligence/plans', ipj);
      }
    } else {
      checkFail('POST /academic-intelligence/concept-tags', tcj);
    }

    // GET concept tags
    const { status: ctgs, json: ctgj } = await req('GET', `/academic-intelligence/concept-tags?subjectId=${SUBJECT_ID}`);
    if (ctgs === 200) checkPass(`GET /academic-intelligence/concept-tags → ${ctgj?.results ?? 0} tags`);
    else checkFail('GET /academic-intelligence/concept-tags', ctgj);
  }
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════');
if (FAILS === 0) {
  console.log('✅  ALL TESTS PASSED — zero failures');
} else {
  console.log(`❌  ${FAILS} test(s) FAILED — see above`);
}
console.log('════════════════════════════════════════\n');

server.close();
await mongoose.disconnect();
process.exit(FAILS > 0 ? 1 : 0);
