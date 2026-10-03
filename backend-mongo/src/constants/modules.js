// Product modules an organization can license to a client (school).
// Keep ids in sync with frontend/src/config/navigation.ts (ModuleId).
export const MODULE_CATALOG = [
  { id: 'FEES', label: 'Fees', description: 'Fee collection, receipts, expenses, dues, WhatsApp reminders' },
  { id: 'ERP', label: 'Academics (ERP)', description: 'Admission, attendance, timetable, results, staff & leave' },
];

export const MODULE_IDS = MODULE_CATALOG.map((m) => m.id);

export const ORG_ADMIN_ROLE = 'ORG_ADMIN';
export const CLIENT_STATUSES = ['ACTIVE', 'SUSPENDED'];
