// Generates (and keeps in sync) a student's fee ledgers for one academic year.
// Ported from backend-mongo StudentService._generateLedgersForAcademicYear (same fee rules).
import supabase from '../config/supabase.js';
import { AppError, unwrap } from '../utils/http.js';
import { ensureCategory } from './master.js';

const MONTHS = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];

const remainingAndStatus = (total, paid, concession) => {
  const remaining = Math.max(0, total - paid - concession);
  return { remaining, status: remaining === 0 && paid > 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING' };
};

export async function generateForYear(studentId, yearName, { forceCreate = false } = {}) {
  const { data: student } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
  if (!student) throw new AppError('Student not found', 404);
  const isRTE = !!student.is_rte;

  const [edu, tra, term, adm, bag] = await Promise.all([
    ensureCategory('EDUCATION', 'Education Fees', 'Standard monthly education fee'),
    ensureCategory('TRANSPORT', 'Transport Fees', 'Monthly transport fee'),
    ensureCategory('TERM', 'Term Fees', 'Bi-annual term fee'),
    ensureCategory('ADMISSION', 'Admission Fees', 'One-time admission fee'),
    ensureCategory('BAG_KIT', 'Bag & Kit', 'Bag & Kit fee category'),
  ]);

  const existing = unwrap(await supabase.from('student_fee_ledgers').select('*').eq('student_id', studentId).eq('academic_year', yearName));
  if (existing.length === 0 && !forceCreate) return { created: 0, updated: 0 };

  // Past years keep the standard the student was in at the time (from the ledger snapshot).
  const { data: active } = await supabase.from('academic_years').select('name').eq('is_active', true).maybeSingle();
  const snap = existing.find((l) => l.snapshot?.standard)?.snapshot;
  const standard = snap && active && active.name !== yearName ? snap.standard : student.standard;

  const { data: fs } = await supabase.from('fee_structures').select('*')
    .eq('medium', student.medium).eq('standard', standard).eq('academic_year', yearName).eq('is_active', true).maybeSingle();
  if (!fs) throw new AppError(`No active fee structure found for standard ${standard} (${student.medium} medium) in academic year ${yearName}`, 400);

  const educationAmount = Math.round(fs.annual_fee / ((fs.education_part_count || 12) + (fs.term_part_count || 2)));
  const termAmount = fs.term_fee > 0 ? fs.term_fee : educationAmount;

  const hasTransport = student.transport_type && student.transport_type !== 'None';
  let transportAmount = 0;
  if (hasTransport) {
    const prior = existing.find((l) => l.fee_type === 'TRANSPORT');
    if (prior) transportAmount = prior.total_amount;
    else {
      const { data: tfs } = await supabase.from('transport_fee_structures').select('*')
        .eq('transport_type', student.transport_type).eq('academic_year', yearName).eq('is_active', true).maybeSingle();
      if (!tfs) throw new AppError(`Transport fee structure not found for '${student.transport_type}' in year ${yearName}. Please create it first.`, 404);
      transportAmount = tfs.amount;
    }
  }

  const startYear = parseInt(yearName.slice(0, 4), 10);
  const due = (i) => `${i < 7 ? startYear : startYear + 1}-${String([6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5][i]).padStart(2, '0')}-15`;
  const allMonths = MONTHS.map((name, i) => ({ name, dueDate: due(i) }));
  const startIdx = Math.max(0, MONTHS.indexOf(student.admission_month || 'June'));
  const months = allMonths.slice(startIdx);
  const allTerms = [{ name: 'Term 1', dueDate: `${startYear}-06-15` }, { name: 'Term 2', dueDate: `${startYear}-12-15` }];
  const terms = startIdx > 5 ? [allTerms[1]] : allTerms;

  const snapshot = {
    studentName: student.student_name, medium: student.medium, standard,
    division: student.division, transportType: student.transport_type || 'None', isRTE,
  };
  const code = student.student_code || student.id;
  const tag = yearName.replace('-', '_');
  const has = (type, period) => existing.find((l) => l.fee_type === type && l.fee_period === period);

  const toCreate = [];
  let updated = 0;

  const add = (cat, type, period, amount, dueDate, prefix, generatedFrom, rte = false) => toCreate.push({
    student_id: student.id, academic_year: yearName, fee_category_id: cat.id, fee_period: period, fee_type: type,
    ledger_number: ['LEDGER', prefix, tag, period === 'One-time' ? null : period.replace(/\s+/g, '').toUpperCase(), code].filter(Boolean).join('_'),
    total_amount: amount, paid_amount: 0, concession_amount: rte ? amount : 0, remaining_amount: rte ? 0 : amount,
    status: rte ? 'PAID' : 'PENDING', due_date: dueDate, source: 'MANUAL', generated_from: generatedFrom, snapshot,
  });

  /** Keep an existing, not-yet-paid ledger aligned with the current fee structure. */
  const sync = async (ledger, amount) => {
    if ((ledger.fee_type === 'EDUCATION' || ledger.fee_type === 'TERM') && isRTE) {
      if (ledger.concession_amount !== amount || ledger.status !== 'PAID') {
        unwrap(await supabase.from('student_fee_ledgers').update({ total_amount: amount, concession_amount: amount, remaining_amount: 0, status: 'PAID' }).eq('id', ledger.id));
        updated++;
      }
      return;
    }
    if (ledger.status !== 'PAID' && ledger.total_amount !== amount) {
      const { remaining, status } = remainingAndStatus(amount, ledger.paid_amount || 0, ledger.concession_amount || 0);
      unwrap(await supabase.from('student_fee_ledgers').update({ total_amount: amount, remaining_amount: remaining, status }).eq('id', ledger.id));
      updated++;
    }
  };

  for (const m of months) {
    const l = has('EDUCATION', m.name);
    l ? await sync(l, educationAmount) : add(edu, 'EDUCATION', m.name, educationAmount, m.dueDate, 'EDU', 'FEE_STRUCTURE', isRTE);
  }

  if (hasTransport) {
    const existingTr = existing.filter((l) => l.fee_type === 'TRANSPORT');
    let startMonth = student.transport_start_month || student.admission_month || 'June';
    const earliest = existingTr.map((l) => MONTHS.indexOf(l.fee_period)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (earliest !== undefined) startMonth = MONTHS[earliest];
    const trIdx = Math.max(0, MONTHS.indexOf(startMonth));

    // unpaid transport ledgers before the start month no longer apply
    const stale = existingTr.filter((l) => MONTHS.indexOf(l.fee_period) < trIdx && l.status !== 'PAID');
    if (stale.length) unwrap(await supabase.from('student_fee_ledgers').delete().in('id', stale.map((l) => l.id)));

    for (const m of months) {
      if (MONTHS.indexOf(m.name) < trIdx) continue;
      const l = has('TRANSPORT', m.name);
      l ? await sync(l, transportAmount) : add(tra, 'TRANSPORT', m.name, transportAmount, m.dueDate, 'TRA', 'TRANSPORT_STRUCTURE');
    }
  }

  for (const t of terms) {
    const l = has('TERM', t.name);
    l ? await sync(l, termAmount) : add(term, 'TERM', t.name, termAmount, t.dueDate, 'TRM', 'FEE_STRUCTURE', isRTE);
  }

  // one-time fees are only created once per student (across all years)
  const oneTime = async (cat, type, wanted, amount, prefix) => {
    const l = has(type, 'One-time');
    if (l) return sync(l, amount);
    if (!wanted) return;
    const { count } = await supabase.from('student_fee_ledgers').select('id', { count: 'exact', head: true }).eq('student_id', student.id).eq('fee_type', type);
    if (!count) add(cat, type, 'One-time', amount, `${startYear}-06-15`, prefix, 'FEE_STRUCTURE');
  };
  await oneTime(adm, 'ADMISSION', student.is_new_admission, fs.admission_fee ?? 0, 'ADM');
  await oneTime(bag, 'BAG_KIT', student.buy_bag_kit, fs.bag_kit_fee ?? 0, 'BAG');

  if (toCreate.length) unwrap(await supabase.from('student_fee_ledgers').insert(toCreate));

  // keep snapshots of existing ledgers in sync with the student record
  const stalePatch = active?.name !== yearName ? [] : existing.filter((l) => JSON.stringify(l.snapshot) !== JSON.stringify(snapshot));
  if (stalePatch.length) unwrap(await supabase.from('student_fee_ledgers').update({ snapshot }).in('id', stalePatch.map((l) => l.id)));

  return { created: toCreate.length, updated };
}
