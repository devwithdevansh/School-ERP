// Ledgers, payments, expenses, unpaid report and dashboard aggregates.
import supabase from '../config/supabase.js';
import { AppError, unwrap } from '../utils/http.js';
import { toApi } from '../utils/case.js';
import { chunk, selectAll } from '../utils/db.js';

// ─── ledgers ────────────────────────────────────────────────────────────────
export async function listLedgers({ studentId, status, academicYear, limit = 20, skip = 0 }) {
  let q = supabase.from('student_fee_ledgers').select('*').order('created_at', { ascending: false }).range(skip, skip + limit - 1);
  if (studentId) q = q.eq('student_id', studentId);
  if (status) q = q.eq('status', status);
  if (academicYear) q = q.eq('academic_year', academicYear);
  return toApi(unwrap(await q));
}

export async function getLedger(id) {
  const { data } = await supabase.from('student_fee_ledgers').select('*').eq('id', id).maybeSingle();
  if (!data) throw new AppError('Ledger not found', 404);
  return toApi(data);
}

/** A concession is a zero-amount payment row, applied atomically by the same SQL function. */
export async function applyConcession(ledgerId, amount, reason, performedBy) {
  const rows = unwrap(await supabase.rpc('create_batch_payments', {
    p_payments: [{ ledgerId, amount: 0, concessionAmount: amount, method: 'CASH', details: { reason } }],
    p_performed_by: performedBy,
  }));
  if (!rows?.length) throw new AppError('Concession amount must be positive', 400);
  return getLedger(ledgerId);
}

// ─── payments ───────────────────────────────────────────────────────────────
const PAYMENT_SELECT = '*, ledger:student_fee_ledgers(*)';

/** Payment row (+ joined ledger) -> the shape the fee screens expect. */
export function shapePayment(row, reversedIds = new Set()) {
  const { ledger, ...p } = row;
  return toApi({
    ...p,
    ledger,
    fee_period: ledger?.fee_period,
    fee_type: ledger?.fee_type,
    student_name: ledger?.snapshot?.studentName,
    academic_year: ledger?.academic_year,
    total_amount: ledger?.total_amount,
    reversal_of: p.details?.reversalOf,
    is_reversed: Boolean(p.is_reversal || reversedIds.has(p.id)),
  });
}

async function reversedIdsFor(payments) {
  const ids = new Set();
  for (const part of chunk(payments.map((p) => p.id))) {
    const { data } = await supabase.from('payments').select('reversed_payment_id').in('reversed_payment_id', part);
    (data || []).forEach((r) => ids.add(r.reversed_payment_id));
  }
  return ids;
}

export async function listPayments({ studentId, ledgerId, ledgerIds, isReversal, limit = 20, skip = 0, date }) {
  let ids = ledgerIds ? String(ledgerIds).split(',').map((s) => s.trim()).filter(Boolean) : null;
  if (ledgerId) ids = [ledgerId];
  if (studentId) {
    const { data } = await supabase.from('student_fee_ledgers').select('id').eq('student_id', studentId);
    ids = (data || []).map((l) => l.id);
    if (!ids.length) return [];
  }
  let q = supabase.from('payments').select(PAYMENT_SELECT).order('created_at', { ascending: false }).range(skip, skip + limit - 1);
  if (ids) q = q.in('ledger_id', ids.slice(0, 500));
  if (isReversal !== undefined) q = q.eq('is_reversal', isReversal);
  if (date) q = q.gte('created_at', `${date}T00:00:00.000Z`).lte('created_at', `${date}T23:59:59.999Z`);
  const rows = unwrap(await q);
  const reversed = await reversedIdsFor(rows);
  return rows.map((r) => shapePayment(r, reversed));
}

export async function getPayment(id) {
  const { data } = await supabase.from('payments').select(PAYMENT_SELECT).eq('id', id).maybeSingle();
  if (!data) throw new AppError('Payment not found', 404);
  return shapePayment(data, await reversedIdsFor([data]));
}

export async function createBatchPayments(payments, performedBy) {
  const rows = unwrap(await supabase.rpc('create_batch_payments', { p_payments: payments, p_performed_by: performedBy }));
  return toApi(rows);
}

export async function reversePayment(paymentId, reason, performedBy) {
  return toApi(unwrap(await supabase.rpc('reverse_payment', { p_payment_id: paymentId, p_reason: reason, p_performed_by: performedBy })));
}

// ─── reports ────────────────────────────────────────────────────────────────
export async function unpaidReport({ standard, studentIds } = {}) {
  const ids = studentIds ? String(studentIds).split(',').map((s) => s.trim()).filter(Boolean) : null;
  const ledgers = await selectAll(
    'student_fee_ledgers',
    'id, status, fee_period, fee_type, academic_year, remaining_amount, total_amount, student:students!inner(id, student_name, standard, division, roll_no)',
    (q) => {
      q = q.neq('status', 'PAID').gt('remaining_amount', 0);
      if (standard) q = q.eq('student.standard', standard);
      if (ids) q = q.in('student_id', ids);
      return q;
    },
  );

  const lastPaid = new Map(); // ledger id -> latest non-reversal payment date
  for (const part of chunk(ledgers.map((l) => l.id))) {
    const { data } = await supabase.from('payments').select('ledger_id, created_at').eq('is_reversal', false).in('ledger_id', part);
    for (const p of data || []) if (!lastPaid.has(p.ledger_id) || p.created_at > lastPaid.get(p.ledger_id)) lastPaid.set(p.ledger_id, p.created_at);
  }

  const byStudent = new Map();
  for (const l of ledgers) {
    const s = l.student;
    if (!byStudent.has(s.id)) {
      byStudent.set(s.id, { _id: s.id, studentName: s.student_name, standard: s.standard, division: s.division, rollNumber: s.roll_no, totalPendingAmount: 0, pendingLedgers: [], lastPaidDate: null });
    }
    const g = byStudent.get(s.id);
    g.totalPendingAmount += l.remaining_amount;
    g.pendingLedgers.push({ _id: l.id, status: l.status, feePeriod: l.fee_period, feeType: l.fee_type, academicYear: l.academic_year, remainingAmount: l.remaining_amount, totalAmount: l.total_amount });
    const lp = lastPaid.get(l.id);
    if (lp && (!g.lastPaidDate || lp > g.lastPaidDate)) g.lastPaidDate = lp;
  }
  const num = (v) => (v == null ? Number.MAX_SAFE_INTEGER : v);
  return [...byStudent.values()].sort((a, b) =>
    String(a.standard).localeCompare(String(b.standard), undefined, { numeric: true }) ||
    String(a.division).localeCompare(String(b.division)) || num(a.rollNumber) - num(b.rollNumber));
}

export async function collectionReport({ startDate, endDate } = {}) {
  const rows = await selectAll('payments', 'amount, method, created_at', (q) => {
    if (startDate) q = q.gte('created_at', `${startDate}T00:00:00.000Z`);
    if (endDate) q = q.lte('created_at', `${endDate}T23:59:59.999Z`);
    return q;
  });
  const byDay = new Map();
  for (const p of rows) {
    const date = p.created_at.slice(0, 10);
    const d = byDay.get(date) || { date, totalAmount: 0, cashAmount: 0, bankAmount: 0 };
    d.totalAmount += p.amount;
    if (String(p.method).toUpperCase() === 'CASH') d.cashAmount += p.amount; else d.bankAmount += p.amount;
    byDay.set(date, d);
  }
  return [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// ─── dashboard ──────────────────────────────────────────────────────────────
export async function dailyMetrics(date) {
  const day = date || new Date().toISOString().slice(0, 10);
  const { data: pays } = await supabase.from('payments').select('amount, method, concession_amount')
    .gte('created_at', `${day}T00:00:00.000Z`).lte('created_at', `${day}T23:59:59.999Z`);
  const stats = { totalAmount: 0, cashAmount: 0, bankAmount: 0, totalConcessions: 0 };
  for (const p of pays || []) {
    stats.totalAmount += p.amount;
    stats.totalConcessions += p.concession_amount || 0;
    if (String(p.method).toUpperCase() === 'CASH') stats.cashAmount += p.amount; else stats.bankAmount += p.amount;
  }
  const { count } = await supabase.from('student_fee_ledgers').select('id', { count: 'exact', head: true }).neq('status', 'PAID').gt('remaining_amount', 0);
  return { ...stats, unpaidCount: count || 0 };
}

export async function syncState() {
  const { data } = await supabase.from('audit_logs').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return { timestamp: data ? new Date(data.created_at).getTime() : 0 };
}

/** Everything the admin UI loads on login, in one round trip (mirrors backend-mongo GET /dashboard/init). */
export async function dashboardInit() {
  const [students, ledgers, payments, audits, users, feeStructures, transportStructures, academicYears, feeCategories] = await Promise.all([
    selectAll('students', '*, parent:parents(id, parent_name, primary_mobile_number, secondary_mobile_number, allow_otp_reset)', (q) => q.order('created_at', { ascending: false })),
    selectAll('student_fee_ledgers', '*', (q) => q.order('created_at', { ascending: false }), 50000),
    selectAll('payments', PAYMENT_SELECT, (q) => q.order('created_at', { ascending: false }), 10000),
    supabase.from('audit_logs').select('*, performer:users(id, name, role, email)').order('created_at', { ascending: false }).limit(100),
    supabase.from('users').select('id, name, email, contact_no1, role, is_active, last_login, created_at, permissions, teacher_profile'),
    supabase.from('fee_structures').select('*').eq('is_active', true),
    supabase.from('transport_fee_structures').select('*').eq('is_active', true),
    supabase.from('academic_years').select('*').order('start_date', { ascending: false }),
    supabase.from('fee_categories').select('*').order('created_at'),
  ]);
  const { shapeStudent } = await import('./students.js');
  const reversed = await reversedIdsFor(payments);
  return {
    students: students.map(shapeStudent),
    ledgers: toApi(ledgers),
    transactions: payments.map((p) => shapePayment(p, reversed)),
    feeStructures: toApi(unwrap(feeStructures)),
    transportStructures: toApi(unwrap(transportStructures)),
    auditLogs: unwrap(audits).map(({ performer, ...a }) => toApi({ ...a, performed_by: performer || a.performed_by })),
    academicYears: toApi(unwrap(academicYears)),
    feeCategories: toApi(unwrap(feeCategories)),
    users: toApi(unwrap(users)),
  };
}

// ─── expenses ───────────────────────────────────────────────────────────────
const shapeExpense = ({ creator, ...e }) => toApi({ ...e, created_by: creator || e.created_by });

export async function listExpenses({ startDate, endDate } = {}) {
  let q = supabase.from('expenses').select('*, creator:users(id, name, email, role)').order('date', { ascending: false }).order('created_at', { ascending: false });
  if (startDate && endDate) q = q.gte('date', `${startDate}T00:00:00`).lte('date', `${endDate}T23:59:59.999`);
  return unwrap(await q).map(shapeExpense);
}

export async function createExpense({ title, category, amount, paymentMethod, description, date }, userId) {
  if (!title || amount === undefined || amount === null) throw new AppError('Title and amount are required', 400);
  const row = unwrap(await supabase.from('expenses').insert({
    title, category: category || 'Miscellaneous', amount: Number(amount), payment_method: paymentMethod || 'CASH',
    description: description || '', date: date ? new Date(date).toISOString() : new Date().toISOString(), created_by: userId,
  }).select('*').single());
  return toApi(row);
}

export async function reverseExpense(id, reason) {
  const { data } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();
  if (!data) throw new AppError('No expense found with that ID', 404);
  if (data.is_reversed) throw new AppError('Expense is already reversed', 400);
  return toApi(unwrap(await supabase.from('expenses').update({ is_reversed: true, reversed_at: new Date().toISOString(), reversed_reason: reason || 'Reversed by user' }).eq('id', id).select('*').single()));
}

export async function deleteExpense(id) {
  const { data } = await supabase.from('expenses').delete().eq('id', id).select('id');
  if (!data?.length) throw new AppError('No expense found with that ID', 404);
}
