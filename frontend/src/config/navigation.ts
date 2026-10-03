import type { ComponentType } from 'react';
import {
  LayoutDashboard, CreditCard, AlertTriangle, Layers, Users, FileSpreadsheet, MessageSquare, Bell,
  Smartphone, Receipt, Activity, BarChart3, Settings, Wallet, BookOpen, UserCheck, CalendarDays,
  ClipboardList, Award, ShieldCheck, MessageCircle, GraduationCap, IndianRupee, Building2, ToggleRight,
} from 'lucide-react';
import type { ScreenType } from '../store';

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
export type ModuleId = 'ERP' | 'FEES' | 'ORG';

/** Modules an organization can license to a client. Keep in sync with the backends' constants/modules.js. */
export const LICENSABLE_MODULES: { id: Exclude<ModuleId, 'ORG'>; label: string; description: string }[] = [
  { id: 'FEES', label: 'Fees', description: 'Fee collection, receipts, expenses, dues, WhatsApp reminders' },
  { id: 'ERP', label: 'Academics (ERP)', description: 'Admission, attendance, timetable, results, staff & leave' },
];

export interface NavContext {
  role?: 'ORG_ADMIN' | 'ADMIN' | 'STAFF' | 'TEACHER';
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  /** Modules the organization enabled for this user's school (ignored for ORG_ADMIN). */
  enabledModules: string[];
  unpaidCount: number;
}

export interface NavItem {
  id: ScreenType;
  label: string;
  icon: ComponentType<{ className?: string }>;
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
    isVisible: (c) => !c.isOrgAdmin && c.enabledModules.includes('ERP') && c.isSuperAdmin,
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
        { id: 'results', label: 'Results', icon: ClipboardList },
        { id: 'certificates', label: 'Certificates', icon: Award },
      ] },
      { title: 'Staff', items: [
        { id: 'staff-management', label: 'Staff Directory', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
        { id: 'staff-leave', label: 'Staff Leave', icon: BookOpen },
      ] },
      { title: 'Communication', items: [{ id: 'messages', label: 'Messages', icon: MessageCircle }] },
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
    isVisible: (c) => !c.isOrgAdmin && c.enabledModules.includes('FEES'),
    groups: [
      { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
      { title: 'Fees', items: [
        { id: 'collect-fee', label: 'Collect Fee', icon: CreditCard },
        { id: 'today-expenses', label: "Today's Expenses", icon: Wallet },
        { id: 'unpaid-fees', label: 'Unpaid Fees', icon: AlertTriangle, badge: (c) => c.unpaidCount || undefined },
        { id: 'fee-structure', label: 'Fee Structure', icon: Layers, adminOnly: true },
      ] },
      // Group titles match the ERP module so both sidebars read the same.
      // Items flagged `inErp` are the ERP module's screens; they only show here for users without ERP access.
      { title: 'Students', items: [
        { id: 'students', label: 'All Students', icon: Users, inErp: true },
        { id: 'promote-students', label: 'Promote', icon: Layers, adminOnly: true },
        { id: 'import-excel', label: 'Import Excel', icon: FileSpreadsheet, adminOnly: true },
      ] },
      { title: 'Communication', items: [
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, adminOnly: true },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'messages', label: 'Messages', icon: MessageCircle, inErp: true },
      ] },
      { title: 'Reports', items: [
        { id: 'receipts', label: 'Receipts', icon: Receipt },
        { id: 'reports', label: 'Reports', icon: BarChart3, adminOnly: true },
      ] },
      { title: 'Settings', items: [
        { id: 'setup', label: 'Setup', icon: Settings, adminOnly: true, inErp: true },
        { id: 'staff-management', label: 'Staff Directory', icon: Users, adminOnly: true, inErp: true },
        { id: 'audit-log', label: 'Audit Log', icon: Activity, adminOnly: true, inErp: true },
        { id: 'parent-app', label: 'Parent App Preview', icon: Smartphone, disabled: true },
      ] },
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
        items: g.items.filter((i) =>
          (!i.adminOnly || ctx.role === 'ADMIN' || ctx.role === 'ORG_ADMIN') &&
          // shared screens live in ERP when the user can see it; otherwise they stay reachable under Fees
          !(m.id === 'FEES' && i.inErp && erpVisible)),
      }))
      .filter((g) => g.items.length > 0),
  }));
}

export function findNavItem(moduleId: ModuleId, screen: ScreenType, ctx: NavContext) {
  const mod = getVisibleModules(ctx).find((m) => m.id === moduleId);
  return mod?.groups.flatMap((g) => g.items).find((i) => i.id === screen);
}
