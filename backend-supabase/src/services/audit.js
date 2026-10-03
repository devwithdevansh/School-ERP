import supabase from '../config/supabase.js';

/** Best-effort audit entry. Never throws - an audit failure must not fail the business action. */
export async function audit({ performedBy = null, action, targetStudentId = null, targetLedgerId = null, targetParentId = null, details = {} }) {
  const { error } = await supabase.from('audit_logs').insert({
    performed_by: performedBy,
    action,
    target_student_id: targetStudentId,
    target_ledger_id: targetLedgerId,
    target_parent_id: targetParentId,
    details,
  });
  if (error) console.error('[audit] failed:', error.message);
}
