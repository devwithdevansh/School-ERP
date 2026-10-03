import bcrypt from 'bcrypt';
import supabase from '../config/supabase.js';
import { AppError, unwrap } from '../utils/http.js';
import { toApi } from '../utils/case.js';
import { audit } from './audit.js';

const PUBLIC_COLS = 'id, name, email, contact_no1, role, is_active, last_login, created_at, permissions, teacher_profile';

export async function createStaff({ name, email, phone, password, role = 'STAFF' }, performedBy) {
  if (role !== 'STAFF' && role !== 'TEACHER') throw new AppError('Only STAFF and TEACHER accounts can be created through this endpoint', 400);
  if (email && (await supabase.from('users').select('id').eq('email', email.toLowerCase()).maybeSingle()).data) throw new AppError('A user with this email already exists', 409);
  if (phone && (await supabase.from('users').select('id').eq('contact_no1', phone).maybeSingle()).data) throw new AppError('A user with this phone number already exists', 409);

  const row = unwrap(await supabase.from('users').insert({
    name, email: email ? email.toLowerCase() : null, contact_no1: phone || null,
    password_hash: await bcrypt.hash(password, 12), role,
  }).select('id, name, email, role, is_active').single());
  await audit({ performedBy, action: 'STAFF_CREATED', details: { userId: row.id, name, email, role } });
  return toApi(row);
}

export async function listStaff() {
  return toApi(unwrap(await supabase.from('users').select(PUBLIC_COLS).in('role', ['STAFF', 'TEACHER']).order('created_at', { ascending: false })));
}

export async function updateTeacherProfile(id, { role, permissions, teacherProfile }, performedBy) {
  if (role !== undefined && role !== 'STAFF' && role !== 'TEACHER') throw new AppError('Role must be STAFF or TEACHER', 400);
  const patch = {};
  if (role !== undefined) patch.role = role;
  if (permissions !== undefined) patch.permissions = permissions;
  if (teacherProfile !== undefined) patch.teacher_profile = teacherProfile;
  const row = unwrap(await supabase.from('users').update(patch).eq('id', id).select(PUBLIC_COLS).maybeSingle());
  if (!row) throw new AppError('User not found', 404);
  await audit({ performedBy, action: 'TEACHER_PROFILE_UPDATED', details: { userId: id } });
  return toApi(row);
}

export async function toggleStatus(id, performedBy) {
  const { data: user } = await supabase.from('users').select('id, role, is_active').eq('id', id).maybeSingle();
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'ADMIN') throw new AppError('Admin accounts cannot be deactivated here', 403);
  const isActive = !user.is_active;
  unwrap(await supabase.from('users').update({ is_active: isActive }).eq('id', id));
  await audit({ performedBy, action: isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED', details: { userId: id } });
  return { _id: id, isActive };
}

export async function resetPassword(id, newPassword, performedBy) {
  const { data: user } = await supabase.from('users').select('id, role').eq('id', id).maybeSingle();
  if (!user) throw new AppError('User not found', 404);
  unwrap(await supabase.from('users').update({ password_hash: await bcrypt.hash(newPassword, 12) }).eq('id', id));
  await supabase.from('refresh_tokens').delete().eq('domain', 'user').eq('owner_id', id); // force re-login everywhere
  await audit({ performedBy, action: 'STAFF_PASSWORD_RESET', details: { userId: id } });
  return { message: 'Password reset successfully' };
}

export async function deleteStaff(id, performedBy) {
  const { data: user } = await supabase.from('users').select('id, role, name').eq('id', id).maybeSingle();
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'ADMIN') throw new AppError('Admin accounts cannot be deleted', 403);
  unwrap(await supabase.from('users').delete().eq('id', id));
  await supabase.from('refresh_tokens').delete().eq('domain', 'user').eq('owner_id', id);
  await audit({ performedBy, action: 'STAFF_DELETED', details: { userId: id, name: user.name } });
  return { message: 'Staff account deleted' };
}
