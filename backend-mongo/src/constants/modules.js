// Product modules an organization can license to a client (school).
// Keep ids in sync with frontend navigation and mobile module gating.
export const MODULE_CATALOG = [
  { id: 'FEES', label: 'Fees & Payments', description: 'Fee collection, receipts, expenses, dues, WhatsApp reminders, online payments' },
  { id: 'ATTENDANCE', label: 'Attendance', description: 'Student & teacher daily attendance, monthly register, leave tracking' },
  { id: 'HOMEWORK', label: 'Homework', description: 'Class assignments, file submissions, teacher homework assignment portal' },
  { id: 'RESULTS', label: 'Exams & Results', description: 'Exam creation, marks entry, report cards, result analytics' },
  { id: 'TIMETABLE', label: 'Timetable', description: 'Class schedule, periods, teacher allocations, weekly timetable' },
  { id: 'CALENDAR', label: 'Calendar & Events', description: 'School academic calendar, circulars, holidays, event announcements' },
  { id: 'TRANSPORT', label: 'Transport', description: 'Bus tracking, routes, driver details, transport fees' },
  { id: 'LEAVE', label: 'Leave Management', description: 'Student and staff leave requests, approvals, leave history' },
  { id: 'COMMUNICATION', label: 'Chat & Messages', description: 'Parent-teacher messaging, group broadcasts, push alerts' },
  { id: 'ERP', label: 'Academics Suite (All-In-One)', description: 'Full access to all academic modules' },
];

export const MODULE_IDS = MODULE_CATALOG.map((m) => m.id);

export const ORG_ADMIN_ROLE = 'ORG_ADMIN';
export const CLIENT_STATUSES = ['ACTIVE', 'SUSPENDED'];

