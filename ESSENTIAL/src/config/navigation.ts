import type { ComponentType } from 'react';
import {
  LayoutDashboard, CreditCard, AlertTriangle, Layers, Users, FileSpreadsheet, MessageSquare, Bell,
  Smartphone, Receipt, Activity, BarChart3, Settings, Wallet, BookOpen, UserCheck, CalendarDays,
  ClipboardList, Award, ShieldCheck, GraduationCap, IndianRupee, Building2, ToggleRight, HelpCircle
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

/** Modules an organization can license to a client. Keep in sync with the backends' constants/modules.js. */
export const LICENSABLE_MODULES: { id: Exclude<ModuleId, 'ORG' | 'TEACHER' | 'STUDENT'>; label: string; description: string }[] = [
  { id: 'FEES', label: 'Fees', description: 'Fee collection, receipts, expenses, dues, WhatsApp reminders' },
  { id: 'ERP', label: 'Academics (ERP)', description: 'Admission, attendance, timetable, results, staff & leave' },
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
    label: 'Organization',
    short: 'Org',
    icon: Building2,
    isVisible: (c) => c.isOrgAdmin,
    groups: [
      { title: 'Clients', items: [
        { id: 'org-clients', label: 'Clients', icon: Building2 },
        { id: 'org-licences', label: 'Module Licences', icon: ToggleRight },
      ] },
    ],
  },
  {
    id: 'ERP',
    label: 'Academics',
    short: 'ERP',
    icon: GraduationCap,
    // licensed for the school AND (optionally, via SUPER_ADMIN_EMAILS) restricted to super admins
    isVisible: (c) => !c.isOrgAdmin && c.role !== 'parent' && c.enabledModules.includes('ERP') && c.isSuperAdmin,
    groups: [
      { title: 'Overview', items: [{ id: 'dashboard', label: 'ERP Dashboard', icon: LayoutDashboard }] },
      { title: 'Students', items: [
        { id: 'students', label: 'All Students', icon: Users },
        { id: 'admission', label: 'Admission', icon: Users },
      ] },
      { title: 'Curriculum', items: [
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'teacher-allocation', label: 'Teacher Allocation', icon: Users },
        { id: 'timetable', label: 'Timetable', icon: CalendarDays },
      ] },
      { title: 'Academic Operations', items: [
        { id: 'attendance', label: 'Attendance', icon: UserCheck },
        { id: 'student-leave', label: 'Student Leave', icon: CalendarDays },
        { id: 'exams', label: 'Exams', icon: ClipboardList },
        { id: 'results', label: 'Results', icon: Award },
        { id: 'certificates', label: 'Certificates', icon: Award },
      ] },
      { title: 'Staff', items: [
        { id: 'staff-management', label: 'Staff Directory', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
        { id: 'staff-leave', label: 'Staff Leave', icon: BookOpen },
      ] },
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
    isVisible: (c) => !c.isOrgAdmin && c.role !== 'TEACHER' && c.role !== 'parent' && c.enabledModules.includes('FEES'),
    groups: [
      { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'SCREEN_DASHBOARD' }] },
      { title: 'Fees', items: [
        { id: 'collect-fee', label: 'Collect Fee', icon: CreditCard, permission: 'SCREEN_COLLECT_FEE' },
        { id: 'today-expenses', label: "Today's Expenses", icon: Wallet, permission: 'SCREEN_TODAY_EXPENSES' },
        { id: 'unpaid-fees', label: 'Unpaid Fees', icon: AlertTriangle, permission: 'SCREEN_UNPAID_FEES', badge: (c) => c.unpaidCount || undefined },
        { id: 'fee-structure', label: 'Fee Structure', icon: Layers, permission: 'SCREEN_FEE_STRUCTURE', adminOnly: true },
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
      ] },
      { title: 'Reports', items: [
        { id: 'receipts', label: 'Receipts', icon: Receipt, permission: 'SCREEN_RECEIPTS' },
        { id: 'reports', label: 'Reports', icon: BarChart3, permission: 'SCREEN_REPORTS' },
      ] },
      { title: 'Settings', items: [
        { id: 'setup', label: 'Setup', icon: Settings, permission: 'SCREEN_SETUP', adminOnly: true, inErp: true },
        { id: 'staff-management', label: 'Staff Directory', icon: Users, permission: 'SCREEN_STAFF', adminOnly: true, inErp: true },
        { id: 'audit-log', label: 'Audit Log', icon: Activity, permission: 'SCREEN_AUDIT', adminOnly: true, inErp: true },
      ] },
    ],
  },
  {
    id: 'TEACHER',
    label: 'Teacher Portal',
    short: 'Teacher',
    icon: UserCheck,
    // Strictly role-based: visible ONLY to users with the TEACHER role (like Clerk/Reception)
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
    // Strictly role-based: visible ONLY to parents/students in Essential edition
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
