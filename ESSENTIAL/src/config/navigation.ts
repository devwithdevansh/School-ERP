import type { ComponentType } from 'react';
import {
  LayoutDashboard, CreditCard, AlertTriangle, Layers, Users, FileSpreadsheet, MessageSquare, Bell,
  Smartphone, Receipt, Activity, BarChart3, Settings, Wallet, BookOpen, UserCheck, CalendarDays,
  ClipboardList, Award, ShieldCheck, MessageCircle, GraduationCap, IndianRupee, Building2, ToggleRight,
  IdCard,
} from '../components/icons';
import type { ScreenType } from '../store';
import { type PermissionId, hasPermission } from './permissionsRegistry';

/**
 * Navigation registry.
 *
 * Each product area is a MODULE (ERP, Fees, and later Transport, Library, HR ...).
 * A module owns groups of items; every item points at a screen id handled in App.tsx.
 *
 * Visibility is decided in ONE place (`isVisible`) from a NavContext. Today it is driven by
 * role / super-admin; later swap it for per-school enabled modules + role permissions
 * without touching any layout component.
 */
export type ModuleId = 'ERP' | 'FEES' | 'ORG' | 'TEACHER' | 'STUDENT';

export interface LicensableModule {
  id: string;
  label: string;
  category: 'FEES' | 'ACADEMICS' | 'STAFF' | 'COMMUNICATION' | 'SETTINGS' | 'INTEGRATIONS';
  tier: 'BASIC' | 'STANDARD' | 'CUSTOM';
  description: string;
}

/** Modules an organization can license to a client. Keep in sync with the backends' constants/modules.js. */
export const LICENSABLE_MODULES: LicensableModule[] = [
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

export interface NavContext {
  role?: 'ORG_ADMIN' | 'ADMIN' | 'STAFF' | 'TEACHER' | 'parent';
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  /** Modules the organization enabled for this user's school (ignored for ORG_ADMIN). */
  enabledModules: string[];
  unpaidCount: number;
  permissions?: string[];
}

export interface NavItem {
  id: ScreenType;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission?: PermissionId;
  adminOnly?: boolean;
  disabled?: boolean;
  moduleRequired?: string;
  /** Same screen also lives in the ERP module; hidden here whenever ERP is visible to the user. */
  inErp?: boolean;
  badge?: (ctx: NavContext) => number | undefined;
}

export interface NavGroup { title: string; items: NavItem[] }

export interface NavModule {
  id: ModuleId;
  label: string;
  short: string;
  icon: ComponentType<{ className?: string }>;
  groups: NavGroup[];
  isVisible: (ctx: NavContext) => boolean;
}

export const NAV_MODULES: NavModule[] = [
  {
    // Platform-owner console. Only ORG_ADMIN sees it (and sees nothing else).
    id: 'ORG',
    label: 'Platform & Apps',
    short: 'Org',
    icon: Building2,
    isVisible: (c) => c.isOrgAdmin,
    groups: [
      { title: 'Clients & Apps', items: [
        { id: 'org-clients', label: 'School Clients', icon: Building2 },
        { id: 'org-licences', label: 'Module Licences', icon: ToggleRight },
        { id: 'org-apps', label: 'App Deployment Hub', icon: Smartphone },
      ] },
    ],
  },
  {
    id: 'ERP',
    label: 'Academics',
    short: 'ERP',
    icon: GraduationCap,
    // licensed for the school AND (optionally, via SUPER_ADMIN_EMAILS) restricted to super admins
    isVisible: (c) => !c.isOrgAdmin && (
      c.isSuperAdmin ||
      c.enabledModules.includes('ERP') ||
      c.enabledModules.some((m) => ['ATTENDANCE', 'HOMEWORK', 'RESULTS', 'TIMETABLE', 'CALENDAR', 'TRANSPORT', 'LEAVE', 'COMMUNICATION'].includes(m))
    ),
    groups: [
      { title: 'Overview', items: [{ id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard }] },
      { title: 'Students', items: [
        { id: 'students', label: 'All Students', icon: Users },
        { id: 'admission', label: 'Admission', icon: Users },
      ] },
      { title: 'Curriculum', items: [
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'teacher-allocation', label: 'Teacher Allocation', icon: Users },
        { id: 'timetable', label: 'Timetable', icon: CalendarDays, moduleRequired: 'TIMETABLE' },
      ] },
      { title: 'Academic Operations', items: [
        { id: 'attendance', label: 'Attendance', icon: UserCheck, moduleRequired: 'ATTENDANCE' },
        { id: 'academic-calendar', label: 'Calendar & Roadmap', icon: CalendarDays, moduleRequired: 'CALENDAR' },
        { id: 'student-leave', label: 'Student Leave', icon: CalendarDays, moduleRequired: 'LEAVE' },
        { id: 'exams', label: 'Exams', icon: ClipboardList, moduleRequired: 'RESULTS' },
        { id: 'results', label: 'Results', icon: Award, moduleRequired: 'RESULTS' },
        { id: 'documents', label: 'Documents & ID Cards', icon: IdCard },
      ] },
      { title: 'Staff', items: [
        { id: 'staff-management', label: 'Staff Directory', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
        { id: 'staff-leave', label: 'Staff Leave', icon: BookOpen, moduleRequired: 'LEAVE' },
      ] },
      { title: 'Communication', items: [{ id: 'messages', label: 'Messages', icon: MessageCircle, permission: 'SCREEN_WHATSAPP', moduleRequired: 'COMMUNICATION' }] },
      { title: 'Settings', items: [
        { id: 'setup', label: 'Setup', icon: Settings },
        { id: 'audit-log', label: 'Audit Log', icon: Activity },
      ] },
    ],
  },
  {
    id: 'FEES',
    label: 'Fees',
    short: 'Fees',
    icon: IndianRupee,
    // Visible strictly to school staff/admin (NOT teachers, NOT parents)
    isVisible: (c) => !c.isOrgAdmin && c.role !== 'TEACHER' && c.role !== 'parent' && (
      c.isSuperAdmin || c.enabledModules.includes('FEES')
    ),
    groups: [
      { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'SCREEN_DASHBOARD' }] },
      { title: 'Fees', items: [
        { id: 'collect-fee', label: 'Collect Fee', icon: CreditCard, permission: 'SCREEN_COLLECT_FEE', moduleRequired: 'FEES' },
        { id: 'today-expenses', label: "Today's Expenses", icon: Wallet, permission: 'SCREEN_TODAY_EXPENSES', moduleRequired: 'FEES' },
        { id: 'unpaid-fees', label: 'Unpaid Fees', icon: AlertTriangle, permission: 'SCREEN_UNPAID_FEES', badge: (c) => c.unpaidCount || undefined, moduleRequired: 'FEES' },
        { id: 'fee-structure', label: 'Fee Structure', icon: Layers, permission: 'SCREEN_FEE_STRUCTURE', adminOnly: true, moduleRequired: 'FEES' },
      ] },
      // Group titles match the ERP module so both sidebars read the same.
      // Items flagged `inErp` are the ERP module's screens; they only show here for users without ERP access.
      { title: 'Students', items: [
        { id: 'students', label: 'All Students', icon: Users, permission: 'SCREEN_STUDENTS', inErp: true },
        { id: 'promote-students', label: 'Promote', icon: Layers, permission: 'SCREEN_PROMOTE', adminOnly: true },
        { id: 'import-excel', label: 'Import Excel', icon: FileSpreadsheet, permission: 'SCREEN_IMPORT_EXCEL', adminOnly: true },
      ] },
      { title: 'Communication', items: [
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, permission: 'SCREEN_WHATSAPP' },
        { id: 'notifications', label: 'Notifications', icon: Bell, permission: 'SCREEN_NOTIFICATIONS' },
        { id: 'messages', label: 'Messages', icon: MessageCircle, permission: 'SCREEN_WHATSAPP', inErp: true },
      ] },
      { title: 'Reports', items: [
        { id: 'receipts', label: 'Receipts', icon: Receipt, permission: 'SCREEN_RECEIPTS' },
        { id: 'reports', label: 'Reports', icon: BarChart3, permission: 'SCREEN_REPORTS' },
      ] },
      { title: 'Settings', items: [
        { id: 'setup', label: 'Setup', icon: Settings, permission: 'SCREEN_SETUP', adminOnly: true, inErp: true },
        { id: 'staff-management', label: 'Staff Directory', icon: Users, permission: 'SCREEN_STAFF', adminOnly: true, inErp: true },
        { id: 'audit-log', label: 'Audit Log', icon: Activity, permission: 'SCREEN_AUDIT', adminOnly: true, inErp: true },
        { id: 'parent-app', label: 'Parent App Preview', icon: Smartphone, disabled: true },
      ] },
    ],
  },
  {
    id: 'TEACHER',
    label: 'Teacher Portal',
    short: 'Teacher',
    icon: UserCheck,
    // Strictly role-based: visible ONLY to users with the TEACHER role
    isVisible: (c) => !c.isOrgAdmin && c.role === 'TEACHER',
    groups: [
      {
        title: 'Classroom',
        items: [
          { id: 'teacher-attendance', label: 'Take Attendance', icon: UserCheck },
          { id: 'teacher-timetable', label: 'My Timetable', icon: CalendarDays },
        ],
      },
    ],
  },
  {
    id: 'STUDENT',
    label: 'Student Portal',
    short: 'Student',
    icon: GraduationCap,
    // Strictly role-based: visible ONLY to parents/students
    isVisible: (c) => !c.isOrgAdmin && c.role === 'parent',
    groups: [
      {
        title: 'Fee Services',
        items: [
          { id: 'student-fees', label: 'Pay Pending Fees', icon: CreditCard },
          { id: 'student-receipts', label: 'Payment Receipts', icon: Receipt },
        ],
      },
    ],
  },
];

/** Modules + groups + items the current user may see. Empty groups are dropped. */
export function getVisibleModules(ctx: NavContext): NavModule[] {
  const erpVisible = NAV_MODULES.find((m) => m.id === 'ERP')!.isVisible(ctx);
  return NAV_MODULES.filter((m) => m.isVisible(ctx)).map((m) => ({
    ...m,
    groups: m.groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => {
          // If ERP is visible, hide shared items under FEES
          if (m.id === 'FEES' && i.inErp && erpVisible) return false;

          // Super Admin or ORG_ADMIN sees all allowed items
          if (ctx.isSuperAdmin || ctx.isOrgAdmin) return true;

          // If the item requires a specific permission, evaluate hasPermission
          if (i.permission) {
            return hasPermission(i.permission, ctx.permissions, ctx.role, ctx.isSuperAdmin);
          }

          // Fallback adminOnly check
          if (i.adminOnly && ctx.role !== 'ADMIN') {
            return false;
          }

          return true;
        }),
      }))
      .filter((g) => g.items.length > 0),
  }));
}

export function findNavItem(moduleId: ModuleId, screen: ScreenType, ctx: NavContext) {
  const mod = getVisibleModules(ctx).find((m) => m.id === moduleId);
  return mod?.groups.flatMap((g) => g.items).find((i) => i.id === screen);
}
