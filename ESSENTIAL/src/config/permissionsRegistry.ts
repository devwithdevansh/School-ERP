/**
 * permissionsRegistry.ts
 * Central definition of granular screen-level and action-level permissions
 * for ESSENTIAL and PROFESSIONAL tiers.
 */

export type ScreenPermissionId =
  | 'SCREEN_DASHBOARD'
  | 'SCREEN_COLLECT_FEE'
  | 'SCREEN_TODAY_EXPENSES'
  | 'SCREEN_UNPAID_FEES'
  | 'SCREEN_RECEIPTS'
  | 'SCREEN_STUDENTS'
  | 'SCREEN_WHATSAPP'
  | 'SCREEN_NOTIFICATIONS'
  | 'SCREEN_REPORTS'
  | 'SCREEN_FEE_STRUCTURE'
  | 'SCREEN_SETUP'
  | 'SCREEN_STAFF'
  | 'SCREEN_ROLES'
  | 'SCREEN_AUDIT'
  | 'SCREEN_PROMOTE'
  | 'SCREEN_IMPORT_EXCEL';

export type ActionPermissionId =
  | 'STUDENTS:VIEW'
  | 'STUDENTS:ADD'
  | 'STUDENTS:EDIT'
  | 'STUDENTS:DELETE'
  | 'FEES:COLLECT'
  | 'FEES:DISCOUNT_OVERRIDE'
  | 'EXPENSES:VIEW'
  | 'EXPENSES:ADD'
  | 'EXPENSES:DELETE'
  | 'RECEIPTS:VIEW'
  | 'RECEIPTS:PRINT'
  | 'RECEIPTS:VOID'
  | 'COMMUNICATION:SEND'
  | 'ACTION_PROMOTE'
  | 'ACTION_IMPORT_EXCEL'
  | 'FEE_STRUCTURE:MANAGE'
  | 'SETUP:MANAGE';

export type PermissionId = ScreenPermissionId | ActionPermissionId;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PermissionDefinition {
  id: PermissionId;
  label: string;
  description: string;
  category: 'FEES' | 'STUDENTS' | 'EXPENSES' | 'RECEIPTS' | 'COMMUNICATION' | 'ADMIN' | 'HIGH_RISK';
  riskLevel: RiskLevel;
  screenId?: string;
}

export interface ModulePermissionGroup {
  moduleId: string;
  moduleName: string;
  screenId: string;
  screenPermission: ScreenPermissionId;
  description: string;
  riskLevel: RiskLevel;
  actions: {
    id: ActionPermissionId;
    actionType: 'VIEW' | 'ADD' | 'EDIT' | 'DELETE' | 'SPECIAL';
    label: string;
    description: string;
    riskLevel: RiskLevel;
  }[];
}

/**
 * Hierarchical module & screen permission matrix used by Roles & Permissions UI.
 */
export const GRANULAR_PERMISSION_MATRIX: ModulePermissionGroup[] = [
  {
    moduleId: 'FEES',
    moduleName: 'Fees Dashboard',
    screenId: 'dashboard',
    screenPermission: 'SCREEN_DASHBOARD',
    description: 'High-level collection metrics, revenue summary, and charts.',
    riskLevel: 'LOW',
    actions: [],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Collect Fee',
    screenId: 'collect-fee',
    screenPermission: 'SCREEN_COLLECT_FEE',
    description: 'Student search, collecting fee installments, generating receipts.',
    riskLevel: 'LOW',
    actions: [
      {
        id: 'FEES:COLLECT',
        actionType: 'ADD',
        label: 'Collect & Record Payment',
        description: 'Accept student fees and print instantaneous receipts.',
        riskLevel: 'LOW',
      },
      {
        id: 'FEES:DISCOUNT_OVERRIDE',
        actionType: 'SPECIAL',
        label: 'Apply Concession / Discount Override',
        description: 'Authorize one-off discretionary discounts on invoice balances.',
        riskLevel: 'MEDIUM',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: "Today's Expenses",
    screenId: 'today-expenses',
    screenPermission: 'SCREEN_TODAY_EXPENSES',
    description: 'Track daily petty cash and operational expenses.',
    riskLevel: 'LOW',
    actions: [
      {
        id: 'EXPENSES:VIEW',
        actionType: 'VIEW',
        label: 'View Expenses',
        description: 'View daily expense log and vouchers.',
        riskLevel: 'LOW',
      },
      {
        id: 'EXPENSES:ADD',
        actionType: 'ADD',
        label: 'Record New Expense',
        description: 'Add new expenditure voucher with receipts.',
        riskLevel: 'LOW',
      },
      {
        id: 'EXPENSES:DELETE',
        actionType: 'DELETE',
        label: 'Delete Expense Record',
        description: 'Void or remove an existing expenditure voucher.',
        riskLevel: 'MEDIUM',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Unpaid Fees & Dues',
    screenId: 'unpaid-fees',
    screenPermission: 'SCREEN_UNPAID_FEES',
    description: 'Track overdue fee ledgers across grades and send payment notices.',
    riskLevel: 'LOW',
    actions: [
      {
        id: 'COMMUNICATION:SEND',
        actionType: 'SPECIAL',
        label: 'Broadcast Payment Reminders',
        description: 'Send automated WhatsApp and SMS dues alerts to parents.',
        riskLevel: 'LOW',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Receipts Repository',
    screenId: 'receipts',
    screenPermission: 'SCREEN_RECEIPTS',
    description: 'Search past payment vouchers, reprint receipts, and audit transactions.',
    riskLevel: 'LOW',
    actions: [
      {
        id: 'RECEIPTS:VIEW',
        actionType: 'VIEW',
        label: 'View Past Receipts',
        description: 'Search and inspect history of issued fee receipts.',
        riskLevel: 'LOW',
      },
      {
        id: 'RECEIPTS:PRINT',
        actionType: 'SPECIAL',
        label: 'Reprint Receipts',
        description: 'Generate and print thermal or A4 duplicate receipts.',
        riskLevel: 'LOW',
      },
      {
        id: 'RECEIPTS:VOID',
        actionType: 'DELETE',
        label: 'Void / Cancel Receipt',
        description: 'Cancel a recorded fee transaction and restore student balance.',
        riskLevel: 'HIGH',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'All Students',
    screenId: 'students',
    screenPermission: 'SCREEN_STUDENTS',
    description: 'Search enrolled students, view demographic details and fee profiles.',
    riskLevel: 'MEDIUM',
    actions: [
      {
        id: 'STUDENTS:VIEW',
        actionType: 'VIEW',
        label: 'View Student Directory',
        description: 'Search students and view demographic details.',
        riskLevel: 'LOW',
      },
      {
        id: 'STUDENTS:ADD',
        actionType: 'ADD',
        label: 'Add / Enroll New Student',
        description: 'Register a new student and generate starting fee ledger.',
        riskLevel: 'MEDIUM',
      },
      {
        id: 'STUDENTS:EDIT',
        actionType: 'EDIT',
        label: 'Edit Student Profile',
        description: 'Modify contact numbers, address, and student photos.',
        riskLevel: 'MEDIUM',
      },
      {
        id: 'STUDENTS:DELETE',
        actionType: 'DELETE',
        label: 'Deactivate / Delete Student',
        description: 'Remove or deactivate student enrollment.',
        riskLevel: 'HIGH',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'WhatsApp & Communication',
    screenId: 'whatsapp',
    screenPermission: 'SCREEN_WHATSAPP',
    description: 'Send direct messaging, parent announcements, and alerts.',
    riskLevel: 'LOW',
    actions: [],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Notifications',
    screenId: 'notifications',
    screenPermission: 'SCREEN_NOTIFICATIONS',
    description: 'System alert notifications and payment activity.',
    riskLevel: 'LOW',
    actions: [],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Reports & Analytics',
    screenId: 'reports',
    screenPermission: 'SCREEN_REPORTS',
    description: 'Generate financial reports, collection summaries, and class-wise dues.',
    riskLevel: 'LOW',
    actions: [],
  },

  // ── HIGH-RISK / CRITICAL MODULES (STRICTLY LOCKED BY DEFAULT) ──
  {
    moduleId: 'FEES',
    moduleName: 'Promote Students',
    screenId: 'promote-students',
    screenPermission: 'SCREEN_PROMOTE',
    description: 'CRITICAL: Advances cohorts to next academic year and generates new annual fee ledgers.',
    riskLevel: 'HIGH',
    actions: [
      {
        id: 'ACTION_PROMOTE',
        actionType: 'SPECIAL',
        label: 'Execute Grade Promotion',
        description: 'Advance students to the next grade and create new academic year ledgers.',
        riskLevel: 'HIGH',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Import Excel',
    screenId: 'import-excel',
    screenPermission: 'SCREEN_IMPORT_EXCEL',
    description: 'CRITICAL: Bulk imports student records and registers parent accounts from spreadsheets.',
    riskLevel: 'HIGH',
    actions: [
      {
        id: 'ACTION_IMPORT_EXCEL',
        actionType: 'SPECIAL',
        label: 'Execute Bulk Spreadsheet Ingestion',
        description: 'Upload and process bulk student/parent Excel sheets into MongoDB.',
        riskLevel: 'HIGH',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Fee Structure Master',
    screenId: 'fee-structure',
    screenPermission: 'SCREEN_FEE_STRUCTURE',
    description: 'Master configuration of fee heads, amounts, installments, and academic year fees.',
    riskLevel: 'HIGH',
    actions: [
      {
        id: 'FEE_STRUCTURE:MANAGE',
        actionType: 'SPECIAL',
        label: 'Modify Fee Structure Master',
        description: 'Create and edit annual fee categories and class amount matrices.',
        riskLevel: 'HIGH',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'System Setup',
    screenId: 'setup',
    screenPermission: 'SCREEN_SETUP',
    description: 'Configure Academic Years, switch active school year, and master fee categories.',
    riskLevel: 'HIGH',
    actions: [
      {
        id: 'SETUP:MANAGE',
        actionType: 'SPECIAL',
        label: 'Manage Academic Years & Setup',
        description: 'Add new academic years, change active session, and manage terms.',
        riskLevel: 'HIGH',
      },
    ],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Staff Directory',
    screenId: 'staff-management',
    screenPermission: 'SCREEN_STAFF',
    description: 'School staff roster, teacher assignments, and salary records.',
    riskLevel: 'MEDIUM',
    actions: [],
  },
  {
    moduleId: 'FEES',
    moduleName: 'Audit Logs',
    screenId: 'audit-log',
    screenPermission: 'SCREEN_AUDIT',
    description: 'System-wide immutable trail of transaction history.',
    riskLevel: 'MEDIUM',
    actions: [],
  },
];

/**
 * DEFAULT SAFE PROFILE FOR CLIENT OPERATORS / STAFF
 * Strictly excludes:
 *  - SCREEN_PROMOTE / ACTION_PROMOTE
 *  - SCREEN_IMPORT_EXCEL / ACTION_IMPORT_EXCEL
 *  - SCREEN_FEE_STRUCTURE / FEE_STRUCTURE:MANAGE
 *  - SCREEN_SETUP / SETUP:MANAGE
 *  - SCREEN_STAFF / SCREEN_ROLES / SCREEN_AUDIT
 */
export const DEFAULT_CLIENT_STAFF_PERMISSIONS: PermissionId[] = [
  'SCREEN_DASHBOARD',
  'SCREEN_COLLECT_FEE',
  'FEES:COLLECT',
  'SCREEN_TODAY_EXPENSES',
  'EXPENSES:VIEW',
  'EXPENSES:ADD',
  'SCREEN_UNPAID_FEES',
  'COMMUNICATION:SEND',
  'SCREEN_RECEIPTS',
  'RECEIPTS:VIEW',
  'RECEIPTS:PRINT',
  'SCREEN_STUDENTS',
  'STUDENTS:VIEW', // Note: Only view by default! No add/edit/delete/promote/import.
  'SCREEN_WHATSAPP',
  'SCREEN_NOTIFICATIONS',
  'SCREEN_REPORTS',
];

/**
 * Preset profiles for quick assignment in Roles & Permissions.
 */
export const PRESET_PROFILES: { id: string; name: string; description: string; permissions: PermissionId[] }[] = [
  {
    id: 'DEFAULT_STAFF',
    name: 'Recommended Staff (Safe Defaults)',
    description: 'Daily collection, receipts, expenses & student view. Strictly no Promote or Excel Import.',
    permissions: DEFAULT_CLIENT_STAFF_PERMISSIONS,
  },
  {
    id: 'CASHIER',
    name: 'Front-Desk Cashier',
    description: 'Fee collection, receipt printing, and dues reminder broadcast only.',
    permissions: [
      'SCREEN_DASHBOARD',
      'SCREEN_COLLECT_FEE',
      'FEES:COLLECT',
      'SCREEN_UNPAID_FEES',
      'COMMUNICATION:SEND',
      'SCREEN_RECEIPTS',
      'RECEIPTS:VIEW',
      'RECEIPTS:PRINT',
      'SCREEN_STUDENTS',
      'STUDENTS:VIEW',
    ],
  },
  {
    id: 'OFFICE_MANAGER',
    name: 'Office Senior Manager',
    description: 'Daily fees, student enrolling & editing, expense voucher approvals, and reports.',
    permissions: [
      ...DEFAULT_CLIENT_STAFF_PERMISSIONS,
      'STUDENTS:ADD',
      'STUDENTS:EDIT',
      'EXPENSES:DELETE',
    ],
  },
  {
    id: 'FULL_ADMIN',
    name: 'Administrator (All Access)',
    description: 'Unrestricted access to all modules, including Promote, Import Excel, and Setup.',
    permissions: GRANULAR_PERMISSION_MATRIX.flatMap((m) => [m.screenPermission, ...m.actions.map((a) => a.id)]),
  },
];

/**
 * Checks whether a user with given permissions and role can access a screen or action.
 */
export function hasPermission(
  perm: PermissionId,
  userPerms: string[] | undefined,
  role?: string,
  isSuperAdmin?: boolean
): boolean {
  // Super Admin always has full access
  if (isSuperAdmin || role === 'ORG_ADMIN') return true;

  // If user has specific explicit permissions array in database
  if (Array.isArray(userPerms) && userPerms.length > 0) {
    return userPerms.includes(perm);
  }

  // If user is ADMIN role without custom restrictions, grant full
  if (role === 'ADMIN') return true;

  // Default fallback for STAFF / CLIENT users
  return DEFAULT_CLIENT_STAFF_PERMISSIONS.includes(perm);
}
