// Academic years, fee categories, fee structures and transport structures.
import supabase from '../config/supabase.js';
import { AppError, unwrap } from '../utils/http.js';
import { toApi, toDb } from '../utils/case.js';

const SYSTEM_CATEGORIES = [
  { type: 'EDUCATION', name: 'Education Fees', description: 'Standard monthly education fee' },
  { type: 'TERM', name: 'Term Fees', description: 'Bi-annual term fee' },
  { type: 'TRANSPORT', name: 'Transport Fees', description: 'Monthly transport fee' },
  { type: 'ADMISSION', name: 'Admission Fees', description: 'One-time admission fee' },
  { type: 'BAG_KIT', name: 'Bag & Kit', description: 'Bag & Kit fee category' },
];

const YEAR_COLS = ['name', 'start_date', 'end_date', 'is_active'];
const CATEGORY_COLS = ['name', 'type', 'description', 'is_active'];
const FEE_COLS = ['medium', 'standard', 'annual_fee', 'education_part_count', 'term_part_count', 'admission_fee', 'bag_kit_fee', 'term_fee', 'applicable_fee_categories', 'academic_year', 'is_active'];
const TRANSPORT_COLS = ['academic_year', 'transport_type', 'amount', 'frequency', 'is_active'];

/** Returns the category of a given type, creating the system default if missing. */
export async function ensureCategory(type, name, description) {
  const q = supabase.from('fee_categories').select('*').eq('type', type);
  const { data } = await (type === 'OTHER' ? q.eq('name', name) : q).order('created_at').limit(1).maybeSingle();
  if (data) return data;
  return unwrap(await supabase.from('fee_categories').insert({ name, type, description, is_active: true }).select('*').single());
}

// ─── academic years ─────────────────────────────────────────────────────────
export const listYears = async () => toApi(unwrap(await supabase.from('academic_years').select('*').order('start_date', { ascending: false })));

async function makeOnlyActive(id) {
  unwrap(await supabase.from('academic_years').update({ is_active: false }).neq('id', id).eq('is_active', true));
}

export async function createYear(body) {
  const { count } = await supabase.from('academic_years').select('id', { count: 'exact', head: true });
  const row = toDb(body, YEAR_COLS);
  if (count === 0) row.is_active = true;
  if (row.is_active) await supabase.from('academic_years').update({ is_active: false }).eq('is_active', true);
  const year = unwrap(await supabase.from('academic_years').insert(row).select('*').single());
  for (const c of SYSTEM_CATEGORIES) await ensureCategory(c.type, c.name, c.description);
  return toApi(year);
}

export async function updateYear(id, body) {
  if (body.isActive === true) await makeOnlyActive(id);
  const year = unwrap(await supabase.from('academic_years').update(toDb(body, YEAR_COLS)).eq('id', id).select('*').maybeSingle());
  if (!year) throw new AppError('No academic year found with that ID', 404);
  return toApi(year);
}

export async function deleteYear(id) {
  const { data: year } = await supabase.from('academic_years').select('*').eq('id', id).maybeSingle();
  if (!year) throw new AppError('No academic year found with that ID', 404);
  if (year.is_active) throw new AppError('Cannot delete the active academic year', 400);
  const count = async (t) => (await supabase.from(t).select('id', { count: 'exact', head: true }).eq('academic_year', year.name)).count || 0;
  const [fs, led] = await Promise.all([count('fee_structures'), count('student_fee_ledgers')]);
  if (fs || led) throw new AppError(`Cannot delete academic year because it has associated data: ${fs} fee structures, ${led} ledgers`, 400);
  unwrap(await supabase.from('academic_years').delete().eq('id', id));
}

export async function activeYear() {
  const { data } = await supabase.from('academic_years').select('*').eq('is_active', true).maybeSingle();
  if (!data) throw new AppError('No active academic year found. Please configure one in Setup.', 400);
  return data;
}

// ─── fee categories ─────────────────────────────────────────────────────────
export const listCategories = async () => toApi(unwrap(await supabase.from('fee_categories').select('*').order('created_at', { ascending: false })));
export const createCategory = async (body) => toApi(unwrap(await supabase.from('fee_categories').insert(toDb(body, CATEGORY_COLS)).select('*').single()));

export async function updateCategory(id, body) {
  const row = unwrap(await supabase.from('fee_categories').update(toDb(body, CATEGORY_COLS)).eq('id', id).select('*').maybeSingle());
  if (!row) throw new AppError('No fee category found with that ID', 404);
  return toApi(row);
}

export async function deleteCategory(id) {
  const { data } = await supabase.from('fee_categories').select('*').eq('id', id).maybeSingle();
  if (!data) throw new AppError('No fee category found with that ID', 404);
  if (data.type !== 'OTHER') throw new AppError(`Cannot delete system-required category of type ${data.type}`, 400);
  unwrap(await supabase.from('fee_categories').delete().eq('id', id));
}

// ─── fee structures ─────────────────────────────────────────────────────────
export async function listStructures() {
  const [fs, ts] = await Promise.all([
    supabase.from('fee_structures').select('*').eq('is_active', true),
    supabase.from('transport_fee_structures').select('*').eq('is_active', true),
  ]);
  return { feeStructures: toApi(unwrap(fs)), transportStructures: toApi(unwrap(ts)) };
}

async function createOrRevive(table, uniqueKeys, cols, body) {
  const row = toDb(body, cols);
  let q = supabase.from(table).select('*');
  for (const k of uniqueKeys) q = q.eq(k, row[k]);
  const { data: existing } = await q.maybeSingle();
  if (existing) {
    if (existing.is_active) throw new AppError(`${table === 'fee_structures' ? 'Fee' : 'Transport fee'} structure already exists for this combination`, 400);
    return { status: 200, row: toApi(unwrap(await supabase.from(table).update({ ...row, is_active: true }).eq('id', existing.id).select('*').single())) };
  }
  return { status: 201, row: toApi(unwrap(await supabase.from(table).insert(row).select('*').single())) };
}

export const createStructure = (body) => createOrRevive('fee_structures', ['academic_year', 'medium', 'standard'], FEE_COLS, body);
export const createTransportStructure = (body) => createOrRevive('transport_fee_structures', ['academic_year', 'transport_type'], TRANSPORT_COLS, body);

async function updateRow(table, cols, id, body, label) {
  const row = unwrap(await supabase.from(table).update(toDb(body, cols)).eq('id', id).select('*').maybeSingle());
  if (!row) throw new AppError(`${label} not found`, 404);
  return toApi(row);
}
export const updateStructure = (id, body) => updateRow('fee_structures', FEE_COLS, id, body, 'Fee structure');
export const updateTransportStructure = (id, body) => updateRow('transport_fee_structures', TRANSPORT_COLS, id, body, 'Transport fee structure');

async function deleteRow(table, id, label) {
  const { data } = await supabase.from(table).delete().eq('id', id).select('id');
  if (!data?.length) throw new AppError(`${label} not found`, 404);
}
export const deleteStructure = (id) => deleteRow('fee_structures', id, 'Fee structure');
export const deleteTransportStructure = (id) => deleteRow('transport_fee_structures', id, 'Transport fee structure');

export async function copyStructures(fromYear, toYear) {
  if (!fromYear || !toYear) throw new AppError('fromYear and toYear are required', 400);
  if (fromYear === toYear) throw new AppError('Cannot copy to the same academic year', 400);
  const strip = ({ id, created_at, updated_at, ...rest }, year) => ({ ...rest, academic_year: year });

  const [srcFees, dstFees, srcTr, dstTr] = await Promise.all([
    supabase.from('fee_structures').select('*').eq('academic_year', fromYear),
    supabase.from('fee_structures').select('medium, standard').eq('academic_year', toYear),
    supabase.from('transport_fee_structures').select('*').eq('academic_year', fromYear),
    supabase.from('transport_fee_structures').select('transport_type').eq('academic_year', toYear),
  ]);
  const haveFee = new Set(unwrap(dstFees).map((r) => `${r.medium}|${r.standard}`));
  const haveTr = new Set(unwrap(dstTr).map((r) => r.transport_type));
  const newFees = unwrap(srcFees).filter((r) => !haveFee.has(`${r.medium}|${r.standard}`)).map((r) => strip(r, toYear));
  const newTr = unwrap(srcTr).filter((r) => !haveTr.has(r.transport_type)).map((r) => strip(r, toYear));
  if (newFees.length) unwrap(await supabase.from('fee_structures').insert(newFees));
  if (newTr.length) unwrap(await supabase.from('transport_fee_structures').insert(newTr));
  return { copiedCount: newFees.length, copiedTransportCount: newTr.length };
}
