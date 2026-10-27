// Product modules an organization can license to a client (school).
// Keep ids in sync with frontend navigation and mobile module gating.
export const MODULE_CATALOG = [
  // Fees & Payments
  { id: 'FEES', label: 'Fee Dashboard', category: 'FEES', tier: 'BASIC', description: 'Fee collection analytics, overview gauges and financial metrics' },
  { id: 'FEES_COLLECT', label: 'Collect Fee', category: 'FEES', tier: 'BASIC', description: 'Student fee collection, installment payments and receipt generation' },
  { id: 'FEES_UNPAID', label: 'Unpaid Fees', category: 'FEES', tier: 'BASIC', description: 'Defaulter tracking, pending fee ledgers and aging reports' },
  { id: 'FEES_EXPENSES', label: 'Expenses / Incomes', category: 'FEES', tier: 'STANDARD', description: 'School daybook expense tracking, category logs and vouchers' },
  { id: 'FEES_RECEIPTS', label: 'Receipts', category: 'FEES', tier: 'BASIC', description: 'Payment receipts search, reprint and PDF export' },
  { id: 'FEES_ONLINE', label: 'Online Payment', category: 'FEES', tier: 'STANDARD', description: 'Parent web portal online fee payment via UPI / Payment Gateway' },
  { id: 'FEES_STRUCTURE', label: 'Fee Structure', category: 'FEES', tier: 'BASIC', description: 'Academic year fee structures and installment rules' },

  // Student Management & Academics
  { id: 'ERP', label: 'ERP Dashboard', category: 'ACADEMICS', tier: 'BASIC', description: 'Academic performance overview, attendance counters and schedules' },
  { id: 'STUDENTS', label: 'All Students', category: 'ACADEMICS', tier: 'BASIC', description: 'Student directory, profiles, cohort management and document vault' },
  { id: 'ADMISSION', label: 'Admission', category: 'ACADEMICS', tier: 'BASIC', description: 'New student enrollment, registration forms and GR allocation' },
  { id: 'SUBJECTS', label: 'Subjects', category: 'ACADEMICS', tier: 'BASIC', description: 'Curriculum subjects, grading schemes and syllabus setup' },
  { id: 'TEACHER_ALLOCATION', label: 'Teacher Subject Allocation', category: 'ACADEMICS', tier: 'STANDARD', description: 'Assign class teachers and subject teachers to classes' },
  { id: 'ATTENDANCE', label: 'Attendance', category: 'ACADEMICS', tier: 'BASIC', description: 'Daily student classroom roll calls and monthly registers' },
  { id: 'TIMETABLE', label: 'Timetable', category: 'ACADEMICS', tier: 'BASIC', description: 'Weekly class timetables, periods and teacher schedules' },
  { id: 'STUDENT_LEAVE', label: 'Student Leave', category: 'ACADEMICS', tier: 'STANDARD', description: 'Student leave applications, parent requests and approvals' },
  { id: 'HOMEWORK', label: 'Homework', category: 'ACADEMICS', tier: 'STANDARD', description: 'Class assignments, file submissions, teacher homework assignment portal' },
  { id: 'EXAMS', label: 'Exams & Schedules', category: 'ACADEMICS', tier: 'STANDARD', description: 'Unit tests, term exams, timetables and seating plans' },
  { id: 'RESULTS', label: 'Results & Report Cards', category: 'ACADEMICS', tier: 'STANDARD', description: 'Marks entry, grade computation and automated report cards' },
  { id: 'CERTIFICATES', label: 'Certificates & Documents', category: 'ACADEMICS', tier: 'STANDARD', description: 'Bonafide certificates, transfer certificates (TC) and ID cards' },
  { id: 'STAFF_DIRECTORY', label: 'Staff Directory', category: 'STAFF', tier: 'BASIC', description: 'Staff records, designations, emergency contacts and profiles' },
  { id: 'ROLES_PERMISSIONS', label: 'Roles & Permissions', category: 'STAFF', tier: 'STANDARD', description: 'Granular role-based access control (RBAC) and permissions' },
  { id: 'STAFF_LEAVE', label: 'Staff Leave', category: 'STAFF', tier: 'STANDARD', description: 'Teacher and staff leave requests, quotas and approval workflows' },
  { id: 'SETUP_SECTIONS', label: 'Sections & Standards', category: 'SETTINGS', tier: 'BASIC', description: 'Mediums, standards, divisions and academic configuration' },
  { id: 'AUDIT_LOGS', label: 'Audit Logs', category: 'SETTINGS', tier: 'STANDARD', description: 'System audit trail, security history and data modification logs' },

  // Communication & Integrations
  { id: 'COMMUNICATION', label: 'Messages & Circulars', category: 'COMMUNICATION', tier: 'STANDARD', description: 'Parent-teacher messaging, school circulars and announcements' },
  { id: 'WHATSAPP', label: 'WhatsApp', category: 'COMMUNICATION', tier: 'STANDARD', description: 'Automated WhatsApp fee reminders, absence alerts and notices' },
  { id: 'NOTIFICATIONS', label: 'Notifications', category: 'COMMUNICATION', tier: 'BASIC', description: 'Push notifications and instant web bell notifications' },
  { id: 'SMS', label: 'SMS Gateway', category: 'INTEGRATIONS', tier: 'CUSTOM', description: 'Transactional SMS gateway for attendance and fee alerts' },
  { id: 'BIOMETRIC', label: 'Biometric Integration', category: 'INTEGRATIONS', tier: 'CUSTOM', description: 'Biometric machine punch log integration for staff attendance' },
  { id: 'CALENDAR', label: 'Calendar & Roadmap', category: 'ACADEMICS', tier: 'BASIC', description: 'School academic calendar, holiday list and roadmap events' },
  { id: 'LEAVE', label: 'Leave Suite (All-In-One)', category: 'ACADEMICS', tier: 'STANDARD', description: 'Comprehensive student and staff leave management' },
  { id: 'TRANSPORT', label: 'Transport', category: 'INTEGRATIONS', tier: 'CUSTOM', description: 'Bus tracking, routes, driver details, transport fees' },
];

export const MODULE_IDS = MODULE_CATALOG.map((m) => m.id);

export const ORG_ADMIN_ROLE = 'ORG_ADMIN';
export const CLIENT_STATUSES = ['ACTIVE', 'SUSPENDED'];

