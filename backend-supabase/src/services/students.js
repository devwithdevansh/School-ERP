import supabase from '../config/supabase.js';
import { AppError, unwrap } from '../utils/http.js';
import { toApi, toDb } from '../utils/case.js';
import { chunk } from '../utils/db.js';
import { audit } from './audit.js';
import { activeYear, ensureCategory } from './master.js';
import { generateForYear } from './ledgerGenerator.js';

export const STUDENT_SELECT = '*, parent:parents(id, parent_name, primary_mobile_number, secondary_mobile_number, allow_otp_reset, email)';

const STUDENT_COLS = [
  'student_name', 'surname', 'father_name', 'mother_name', 'gr_no', 'roll_no', 'gender', 'dob', 'aadhar_no', 'pen_no',
  'photo_url', 'profile', 'medium', 'standard', 'division', 'transport_type', 'is_migrated', 'is_rte', 'is_new_admission',
  'buy_bag_kit', 'admission_month', 'transport_start_month', 'is_active',
];
/** Fields whose change means the fee ledgers may need to be recalculated. */
const LEDGER_AFFECTING = ['medium', 'standard', 'division', 'transport_type', 'is_rte', 'is_new_admission', 'buy_bag_kit', 'admission_month', 'transport_start_month', 'student_name'];

/** DB student row (+ joined parent) -> API shape (`parentId` is the populated parent, like backend-mongo). */
export function shapeStudent(row) {
  if (!row) return row;
  const { parent, ...rest } = row;
  return toApi({ ...rest, parent_id: parent || row.parent_id });
}

const normalizeMobile = (raw) => {
  let m = String(raw || '').replace(/\D/g, '');
  if (m.length > 10) m = m.slice(-10);
  if (!/^[6-9]\d{9}$/.test(m)) m = '9' + m.padEnd(9, '0').slice(0, 9);
  return m;
};

export async function getStudent(id) {
  const { data, error } = await supabase.from('students').select(STUDENT_SELECT).eq('id', id).maybeSingle();
  if (error) throw new AppError('Invalid student id', 400);
  if (!data) throw new AppError('Student not found', 404);
  return shapeStudent(data);
}

export async function listStudents({ limit = 20, skip = 0, includeInactive, isActive, parentId, medium, standard, division } = {}) {
  let q = supabase.from('students').select(STUDENT_SELECT).order('created_at', { ascending: false }).range(skip, skip + limit - 1);
  if (isActive !== undefined) q = q.eq('is_active', isActive);
  else if (includeInactive !== 'true' && includeInactive !== true) q = q.eq('is_active', true);
  if (parentId) q = q.eq('parent_id', parentId);
  if (medium) q = q.eq('medium', medium);
  if (standard) q = q.eq('standard', standard);
  if (division) q = q.eq('division', division);
  return unwrap(await q).map(shapeStudent);
}

async function findOrCreateParent(data) {
  const mobile = normalizeMobile(data.parentMobile);
  const { data: existing } = await supabase.from('parents').select('*').eq('primary_mobile_number', mobile).maybeSingle();
  if (existing) {
    if (!existing.is_active) await supabase.from('parents').update({ is_active: true }).eq('id', existing.id);
    return { id: existing.id, created: false };
  }
  const row = {
    parent_name: data.parentName || `Parent of ${data.studentName}`,
    primary_mobile_number: mobile,
    // random unusable hash - the parent sets a real password through the onboarding flow
    password_hash: (await import('crypto')).randomBytes(32).toString('hex'),
    is_password_set: false,
    secondary_mobile_number: data.parentSecondaryMobile ? normalizeMobile(data.parentSecondaryMobile) : null,
  };
  const created = unwrap(await supabase.from('parents').insert(row).select('id').single());
  return { id: created.id, created: true };
}

export async function createStudent(data, performedBy) {
  const year = await activeYear();
  let parentId = data.parentId;
  let parentCreated = false;
  if (!parentId && data.parentMobile) ({ id: parentId, created: parentCreated } = await findOrCreateParent(data));

  let studentCode = data.studentCode;
  if (!studentCode) {
    if (parentId) {
      const { data: dup } = await supabase.from('students').select('id').eq('student_name', data.studentName)
        .eq('standard', data.standard).eq('division', data.division).eq('parent_id', parentId).maybeSingle();
      if (dup) throw new AppError(`Student ${data.studentName} (${data.standard} ${data.division}) already exists with this parent number.`, 400);
    }
    const { count } = await supabase.from('students').select('id', { count: 'exact', head: true });
    studentCode = `STU${String((count || 0) + 1).padStart(3, '0')}-${Math.floor(10 + Math.random() * 90)}`;
  }

  const row = { ...toDb(data, STUDENT_COLS), division: String(data.division).toUpperCase(), parent_id: parentId || null, student_code: studentCode };
  const student = unwrap(await supabase.from('students').insert(row).select('id').single());

  // supabase-js has no cross-call transactions, so undo the inserts if ledger generation fails.
  try {
    await generateForYear(student.id, year.name, { forceCreate: true });
  } catch (err) {
    await supabase.from('students').delete().eq('id', student.id);
    if (parentCreated) await supabase.from('parents').delete().eq('id', parentId);
    throw err;
  }

  await audit({ performedBy, targetStudentId: student.id, action: 'STUDENT_CREATED', details: { name: data.studentName } });
  return getStudent(student.id);
}

export async function updateStudent(id, updates, performedBy) {
  const current = await getStudent(id);
  const patch = toDb(updates, STUDENT_COLS);
  if (patch.division) patch.division = String(patch.division).toUpperCase();
  if (Object.keys(patch).length) unwrap(await supabase.from('students').update(patch).eq('id', id));

  // parent fields live on the parents row
  const parentPatch = {};
  if (updates.parentName !== undefined) parentPatch.parent_name = updates.parentName;
  if (updates.parentMobile !== undefined) parentPatch.primary_mobile_number = normalizeMobile(updates.parentMobile);
  if (updates.parentSecondaryMobile !== undefined) parentPatch.secondary_mobile_number = updates.parentSecondaryMobile ? normalizeMobile(updates.parentSecondaryMobile) : null;
  if (updates.parentAllowOtpReset !== undefined) parentPatch.allow_otp_reset = updates.parentAllowOtpReset;
  const parentId = current.parentId?._id || current.parentId;
  if (Object.keys(parentPatch).length && parentId) unwrap(await supabase.from('parents').update(parentPatch).eq('id', parentId));

  if (Object.keys(patch).some((k) => LEDGER_AFFECTING.includes(k))) {
    await generateForYear(id, (await activeYear()).name, { forceCreate: true });
  }
  await audit({ performedBy, targetStudentId: id, action: 'STUDENT_UPDATED', details: { fields: Object.keys(updates) } });
  return getStudent(id);
}

/** Soft-delete when payments exist (keeps history), hard-delete otherwise. */
export async function deleteStudent(id, performedBy) {
  const student = await getStudent(id);
  const { data: ledgers } = await supabase.from('student_fee_ledgers').select('id').eq('student_id', id);
  let hasPayments = false;
  for (const ids of chunk((ledgers || []).map((l) => l.id))) {
    const { count } = await supabase.from('payments').select('id', { count: 'exact', head: true }).in('ledger_id', ids);
    if (count) { hasPayments = true; break; }
  }
  if (hasPayments) {
    unwrap(await supabase.from('students').update({ is_active: false }).eq('id', id));
    await audit({ performedBy, targetStudentId: id, action: 'STUDENT_SOFT_DELETED', details: { name: student.studentName } });
    return { softDeleted: true };
  }
  unwrap(await supabase.from('students').delete().eq('id', id)); // ledgers cascade
  await audit({ performedBy, action: 'STUDENT_DELETED', details: { name: student.studentName } });
  return { softDeleted: false };
}

export async function restoreStudent(id, performedBy) {
  await getStudent(id);
  unwrap(await supabase.from('students').update({ is_active: true }).eq('id', id));
  await audit({ performedBy, targetStudentId: id, action: 'STUDENT_RESTORED' });
  return getStudent(id);
}

export async function regenerateLedgers(id) {
  await getStudent(id);
  return generateForYear(id, (await activeYear()).name, { forceCreate: true });
}

export async function addCustomFee(id, feeName, amount, performedBy) {
  const student = await getStudent(id);
  const year = await activeYear();
  const category = await ensureCategory('OTHER', 'Custom Fee', 'Custom one-off fee');
  const ledger = unwrap(await supabase.from('student_fee_ledgers').insert({
    student_id: id, academic_year: year.name, fee_category_id: category.id, fee_period: feeName, fee_type: 'OTHER',
    ledger_number: `LEDGER_CUST_${Date.now()}_${student.studentCode || id}`,
    total_amount: amount, remaining_amount: amount, due_date: new Date().toISOString().slice(0, 10),
    source: 'MANUAL', generated_from: 'FEE_STRUCTURE',
    snapshot: { studentName: student.studentName, medium: student.medium, standard: student.standard, division: student.division, transportType: student.transportType, isRTE: student.isRTE },
  }).select('*').single());
  await audit({ performedBy, targetStudentId: id, action: 'LEDGER_CREATED', details: { type: 'CUSTOM_FEE', name: feeName, amount } });
  return toApi(ledger);
}

export async function checkMobile({ primaryMobile, secondaryMobile }) {
  const numbers = [primaryMobile, secondaryMobile].filter(Boolean).map(normalizeMobile);
  if (!numbers.length) return { exists: false, parent: null };
  const list = numbers.join(',');
  const { data } = await supabase.from('parents').select('*')
    .or(`primary_mobile_number.in.(${list}),secondary_mobile_number.in.(${list})`).limit(1).maybeSingle();
  return { exists: !!data, parent: toApi(data) };
}
