import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { isLedgerPending, isPeriodOverdue } from './utils';

import type {
  Student,
  LedgerEntry,
  PaymentTransaction
} from './mockData';

import { brand } from './config/brand';

// Empty = same origin (Vite dev proxy forwards /api to the chosen backend).
const API_BASE = import.meta.env.VITE_API_URL || '';

export type ScreenType =
  | 'dashboard'
  | 'setup'
  | 'students'
  | 'collect-fee'
  | 'unpaid-fees'
  | 'fee-structure'
  | 'promote-students'
  | 'staff-management'
  | 'whatsapp'
  | 'login'
  | 'parent-app'
  | 'notifications'
  | 'reports'
  | 'receipts'
  | 'import-excel'
  | 'audit-log'
  | 'today-expenses'
  | 'admission'
  | 'attendance'
  | 'subjects'
  | 'timetable'
  | 'results'
  | 'certificates'
  | 'roles'
  | 'teacher-allocation'
  | 'student-leave'
  | 'staff-leave'
  | 'messages'
  | 'org-clients'
  | 'org-licences';

/** Roles: ORG_ADMIN = platform owner (manages clients/modules, sees no school data); the rest belong to one school. */
export type UserRole = 'ORG_ADMIN' | 'ADMIN' | 'STAFF' | 'TEACHER';

// Dev-only: set VITE_SKIP_LOGIN=true in .env.local to bypass the login screen (API calls will still need a real token).
if (import.meta.env.DEV && import.meta.env.VITE_SKIP_LOGIN === 'true' && !localStorage.getItem('currentUser')) {
  localStorage.setItem('currentUser', JSON.stringify({ name: 'Dev Admin', email: 'dev@local', role: 'ADMIN' }));
}
export type PortalId = 'FEES' | 'ERP' | 'ORG';

/** The school (client) the signed-in user belongs to, and the modules the organization enabled for it. */
export interface ClientInfo {
  id: string;
  name: string;
  code: string;
  enabledModules: string[];
}

export interface AcademicYearData {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SubjectData {
  _id: string;
  subjectName: string;
  subjectCode: string;
  type: string;
  gradingSystem?: string;
}

export interface CurriculumData {
  _id: string;
  academicYearId: string;
  standard: string;
  medium: string;
  subjects: SubjectData[];
}

export interface TeacherAllocationData {
  _id: string;
  academicYearId: string;
  teacherId: any;
  standard: string;
  division: string;
  medium: string;
  subjectId: SubjectData;
}

export interface ClassTeacherAllocationData {
  _id: string;
  academicYearId: string;
  teacherId: any;
  standard: string;
  division: string;
  medium: string;
}

export interface FeeCategoryData {
  _id: string;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
}

export interface FeeStructureData {
  _id: string;
  academicYear?: string;
  medium: string;
  standard: string;
  annualFee: number;
  educationPartCount: number;
  termPartCount: number;
  admissionFee?: number;
  bagKitFee?: number;
  termFee?: number;
  isActive: boolean;
}

export interface TransportFeeStructureData {
  _id: string;
  academicYear?: string;
  transportType: string;
  amount: number;
  frequency: string;
  isActive: boolean;
}

export interface LeaveRequestData {
  _id: string;
  academicYearId: string;
  studentId: {
    _id: string;
    studentName: string;
    admissionNo: string;
    rollNo?: string;
  };
  standard: string;
  division: string;
  medium: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachments: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: {
    _id: string;
    name: string;
  };
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffLeaveRequestData {
  _id: string;
  academicYearId: string;
  userId: {
    _id: string;
    name: string;
    role: string;
  };
  startDate: string;
  endDate: string;
  reason: string;
  type: 'SICK' | 'CASUAL' | 'UNPAID' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: {
    _id: string;
    name: string;
  };
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface RoleData {
  _id: string;
  name: string;
  permissions: string[];
}

export interface TimetableData {
  _id: string;
  academicYearId: string;
  standard: string;
  division: string;
  medium: string;
  dayOfWeek: string;
  periods: {
    periodNumber: number;
    subjectId: any;
    teacherId: any;
    startTime: string;
    endTime: string;
  }[];
}

export interface ExamData {
  _id: string;
  academicYearId: string;
  standard: string;
  divisions: string[];
  medium: string;
  examName: string;
  subjects: {
    subjectId: {
      _id: string;
      subjectName: string;
      subjectCode: string;
    };
    examDate: string;
    gradingSystem: string;
    maxMarks?: number;
    passingMarks?: number;
    _id: string;
  }[];
  isPublished: boolean;
  createdAt: string;
}

export interface ExamResultData {
  _id: string;
  examId: string | any;
  studentId: string | any;
  subjectId: string | any;
  marksObtained?: number;
  gradeObtained?: string;
  gradingSystem: string;
  maxMarks?: number;
  passingMarks?: number;
  remarks?: string;
  createdAt: string;
}

export interface HomeworkData {
  _id: string;
  academicYearId: string;
  standard: string;
  division: string;
  medium: string;
  subjectId: any;
  title: string;
  description: string;
  dueDate: string;
  createdBy: any;
}

export interface ConversationData {
  _id: string;
  participants: any[];
  lastMessage?: any;
  updatedAt: string;
}

export interface MessageData {
  _id: string;
  conversationId: string;
  sender: any;
  text: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: string;
  details: string;
  createdAt: string;
}

export interface ExpenseData {
  _id: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK' | 'ONLINE';
  description?: string;
  date: string;
  createdBy?: {
    _id: string;
    name: string;
  };
  isReversed?: boolean;
  reversedAt?: string;
  reversedReason?: string;
}

interface AppContextType {
  currentScreen: ScreenType;
  setScreen: (screen: ScreenType) => void;
  students: Student[];
  activeStudents: Student[];
  unpaidData: any[];
  ledgerEntries: LedgerEntry[];
  transactions: PaymentTransaction[];
  feeStructures: FeeStructureData[];
  transportFeeStructures: TransportFeeStructureData[];
  academicYears: AcademicYearData[];
  feeCategories: FeeCategoryData[];
  auditLogs: AuditLog[];
  expenses: ExpenseData[];
  users: UserData[];
  subjects: SubjectData[];
  curriculums: CurriculumData[];
  teacherAllocations: TeacherAllocationData[];
  classTeacherAllocations: ClassTeacherAllocationData[];
  leaveRequests: LeaveRequestData[];
  staffLeaveRequests: StaffLeaveRequestData[];
  timetables: TimetableData[];
  exams: ExamData[];
  results: ExamResultData[];
  homework: HomeworkData[];
  conversations: ConversationData[];
  lastSyncTimestamp: number;
  fetchDashboardData: () => Promise<void>;
  fetchUnpaidData: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  fetchExpenses: () => Promise<void>;
  addExpense: (expense: Partial<ExpenseData>) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  reverseExpense: (id: string, reason?: string) => Promise<boolean>;
  
  // Attendance API
  fetchAttendance: (date: string, standard: string, division: string, medium: string) => Promise<any>;
  saveAttendance: (date: string, standard: string, division: string, medium: string, records: any[]) => Promise<{ success: boolean; error?: string }>;
  fetchPendingAbsences: () => Promise<any[]>;
  verifyAbsence: (attendanceId: string, studentId: string) => Promise<{ success: boolean; error?: string }>;
  fetchAttendanceOverview: (date: string) => Promise<any[]>;
  confirmAttendance: (attendanceId: string) => Promise<{ success: boolean; notified?: number; error?: string }>;
  remindAttendanceTeacher: (cls: { standard: string; division: string; medium: string; date: string }) => Promise<{ success: boolean; error?: string }>;

  addStudent: (student: Omit<Student, 'id' | 'status'>) => Promise<boolean>;
  recordPayment: (
    studentId: string,
    lineItems: {
      category: string;
      period: string;
      ledgerId?: string;
      totalAmount: number;
      paymentAmount: number;
      concessionAmount: number;
      paymentMethod: string;
      remark: string;
    }[]
  ) => void;
  applyConcession: (ledgerId: string, amount: number) => void;
  reversePayment: (paymentId: string) => Promise<boolean>;
  updateFeeStructure: (id: string, data: Partial<FeeStructureData>) => Promise<boolean>;
  updateTransportFeeStructure: (id: string, data: Partial<TransportFeeStructureData>) => Promise<boolean>;
  deleteFeeStructure: (id: string) => Promise<boolean>;
  deleteTransportFeeStructure: (id: string) => Promise<boolean>;
  createFeeStructure: (data: Partial<FeeStructureData>) => Promise<boolean>;
  createTransportFeeStructure: (data: Partial<TransportFeeStructureData>) => Promise<boolean>;
  createAcademicYear: (data: Partial<AcademicYearData>) => Promise<boolean>;
  updateAcademicYear: (id: string, data: Partial<AcademicYearData>) => Promise<boolean>;
  deleteAcademicYear: (id: string) => Promise<boolean>;
  activateAcademicYear: (id: string) => Promise<boolean>;
  createFeeCategory: (data: Partial<FeeCategoryData>) => Promise<boolean>;
  updateFeeCategory: (id: string, data: Partial<FeeCategoryData>) => Promise<boolean>;
  deleteFeeCategory: (id: string) => Promise<boolean>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkMobile: (primary: string, secondary: string) => Promise<any>;
  deleteStudent: (id: string) => Promise<boolean>;
  restoreStudent: (id: string) => Promise<boolean>;
  updateStudent: (id: string, updates: Partial<Student> & { transportMonths?: number }) => Promise<{ success: boolean; error?: string }>;
  regenerateLedgers: (id: string) => Promise<boolean>;
  addCustomFee: (id: string, feeName: string, amount: number) => Promise<boolean>;
  importStudents: (students: any[]) => Promise<any>;
  autoPromoteBatch: (studentIds: string[]) => Promise<any>;
  fixTransportLedgers: (studentIds: string[], transportStartMonth: string) => Promise<any>;
  copyFeeStructures: (fromYear: string, toYear: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  selectedStudentIdForFee: string | null;
  setSelectedStudentIdForFee: (id: string | null) => void;
  currentUser: { name: string; email: string; role: UserRole } | null;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  client: ClientInfo | null;
  activePortal: PortalId;
  setActivePortal: (portal: PortalId) => void;
  isLoadingDetails: boolean;
  isScreenLoading: boolean;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: UserRole } | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [client, setClient] = useState<ClientInfo | null>(() => {
    try {
      const saved = localStorage.getItem('clientInfo');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const clientRef = useRef(client);
  clientRef.current = client;
  const isOrgAdmin = currentUser?.role === 'ORG_ADMIN';
  const isSuperAdmin = currentUser?.role === 'ADMIN' && (brand.superAdminEmails.length === 0 || brand.superAdminEmails.includes(String(currentUser.email).toLowerCase()));
  const [activePortal, setActivePortal] = useState<PortalId>('FEES');
  const [currentScreen, setScreenState] = useState<ScreenType>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? 'dashboard' : 'login';
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [unpaidData, setGlobalUnpaidData] = useState<any[]>([]);
  const activeStudents = useMemo(() => students.filter(s => s.isActive !== false), [students]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructureData[]>([]);
  const [transportFeeStructures, setTransportFeeStructures] = useState<TransportFeeStructureData[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearData[]>([]);
  const [feeCategories, setFeeCategories] = useState<FeeCategoryData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumData[]>([]);
  const [teacherAllocations, setTeacherAllocations] = useState<TeacherAllocationData[]>([]);
  const [classTeacherAllocations, setClassTeacherAllocations] = useState<ClassTeacherAllocationData[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestData[]>([]);
  const [staffLeaveRequests, setStaffLeaveRequests] = useState<StaffLeaveRequestData[]>([]);
  const [timetables, setTimetables] = useState<TimetableData[]>([]);
  const [exams, setExams] = useState<ExamData[]>([]);
  const [results, setResults] = useState<ExamResultData[]>([]);
  const [homework, setHomework] = useState<HomeworkData[]>([]);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(0);
  const [selectedStudentIdForFee, setSelectedStudentIdForFee] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(() => {
    return localStorage.getItem('currentUser') !== null;
  });
  const [isScreenLoading, setIsScreenLoading] = useState<boolean>(false);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    let token = localStorage.getItem('accessToken');
    const headers = {
      ...(options.headers || {}),
    } as Record<string, string>;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    let res = await fetch(fullUrl, { ...options, headers });
    if (res.status === 401) {
      const savedRefreshToken = localStorage.getItem('refreshToken');
      const userId = localStorage.getItem('userId');
      if (savedRefreshToken && userId) {
        try {
          const lockKey = 'auth_refresh_lock';
          const dataKey = 'auth_refresh_data';
          const now = Date.now();
          let tokens: { accessToken: string; refreshToken: string } | null = null;

          const lockVal = localStorage.getItem(lockKey);
          if (lockVal && (now - parseInt(lockVal, 10) < 10000)) {
            tokens = await new Promise<{ accessToken: string; refreshToken: string } | null>((resolve) => {
              let attempts = 0;
              const interval = setInterval(() => {
                attempts++;
                const savedData = localStorage.getItem(dataKey);
                if (savedData) {
                  clearInterval(interval);
                  try {
                    resolve(JSON.parse(savedData));
                  } catch {
                    resolve(null);
                  }
                  return;
                }
                const currentLock = localStorage.getItem(lockKey);
                if (!currentLock || attempts > 50) {
                  clearInterval(interval);
                  resolve(null);
                }
              }, 100);
            });
          }

          if (!tokens) {
            localStorage.setItem(lockKey, Date.now().toString());
            localStorage.removeItem(dataKey);

            try {
              const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  domain: 'user',
                  userId,
                  refreshToken: savedRefreshToken
                })
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const newTokens = refreshData.data;
                localStorage.setItem('accessToken', newTokens.accessToken);
                localStorage.setItem('refreshToken', newTokens.refreshToken);
                localStorage.setItem(dataKey, JSON.stringify(newTokens));
                tokens = newTokens;
              }
            } catch (refreshErr) {
              console.error('Failed to auto-refresh token inside lock:', refreshErr);
            } finally {
              localStorage.removeItem(lockKey);
            }
          }

          if (tokens) {
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
            res = await fetch(fullUrl, { ...options, headers });
            return res;
          }
        } catch (refreshErr) {
          console.error('Failed to auto-refresh token:', refreshErr);
        }
      }
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }, []);

  const fetchTimeoutRef = useRef<number | null>(null);
  const activeFetchRef = useRef<Promise<void> | null>(null);
  const lastSyncCheckTimeRef = useRef<number>(0);

  const fetchAll = useCallback(async () => {
    // Organization admins manage clients only; there is no school data to load (the API would answer 403).
    if (isOrgAdmin) {
      setIsLoadingDetails(false);
      return;
    }
    if (activeFetchRef.current) {
      return activeFetchRef.current;
    }

    const promise = (async () => {
      setIsLoadingDetails(true);
      // Only call modules the organization licensed to this school (others would answer 403).
      // No client info (a backend without multi-tenancy) = everything.
      const mods = clientRef.current?.enabledModules ?? ['FEES', 'ERP'];
      const hasFees = mods.includes('FEES');
      const hasErp = mods.includes('ERP');
      const skipped = () => Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      try {
        const [initRes, unpaidRes, subjectsRes, curriculumsRes] = await Promise.all([
          authFetch('/api/v1/dashboard/init'),
          hasFees ? authFetch(`/api/v1/reports/unpaid?_t=${Date.now()}`) : skipped(),
          authFetch('/api/v1/academic-master/subjects'),
          authFetch('/api/v1/academic-master/curriculum')
        ]);
        
        if (!initRes.ok) {
          throw new Error(`Failed request: ${initRes.status} ${initRes.statusText}`);
        }

        const initData = await initRes.json();
        const data = initData.data || {};

        const unpaidDataRaw = unpaidRes.ok ? await unpaidRes.json() : { data: [] };
        const unpaidData = unpaidDataRaw.data || [];

        const rawStudents = data.students || [];
        const mappedStudents = rawStudents.map((s: any) => {
          let status = 'PAID';
          if (s.isRTE) {
            status = 'RTE';
          } else {
            const unpaid = unpaidData.find((u: any) => u._id === s._id || u._id === s.id);
            if (unpaid && unpaid.pendingLedgers) {
              const activeYear = data.academicYears?.find((y: any) => y.isActive)?.name || data.academicYears?.[0]?.name || '';
              const overdue = unpaid.pendingLedgers.filter((l: any) => 
                isLedgerPending(l) && isPeriodOverdue(l.feePeriod, l.academicYear, activeYear)
              );
              
              const uniquePeriods = new Set(
                overdue
                  .filter((l: any) => l.feePeriod !== 'One-time')
                  .map((l: any) => `${l.academicYear || activeYear}_${l.feePeriod}`)
              );
              const dueCount = uniquePeriods.size;
              
              if (dueCount === 0 && overdue.length > 0) status = '1 DUE'; // only One-time fees
              else if (dueCount === 1) status = '1 DUE';
              else if (dueCount === 2) status = '2 DUE';
              else if (dueCount >= 3) status = '3+ DUE';
            }
          }

          return {
            ...s,
            id: s._id,
            parentName: s.parentId?.parentName || '',
            parentMobile: s.parentId?.primaryMobileNumber || '',
            parentSecondaryMobile: s.parentId?.secondaryMobileNumber || '',
            parentAllowOtpReset: s.parentId?.allowOtpReset || false,
            transportStartMonth: s.transportStartMonth || 'June',
            status,
            ledgers: [],
            transactions: []
          };
        });
        setStudents(mappedStudents);
        setGlobalUnpaidData(unpaidData);

        setFeeStructures(data.feeStructures || []);
        setTransportFeeStructures(data.transportStructures || []);

        const rawAuditLogs = data.auditLogs || [];
        setAuditLogs(rawAuditLogs);
        if (rawAuditLogs.length > 0) {
          const latestTime = new Date(rawAuditLogs[0].createdAt).getTime();
          setLastSyncTimestamp(latestTime);
        }

        setAcademicYears(data.academicYears || []);
        setFeeCategories(data.feeCategories || []);
        setUsers(data.users || []);
        
        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json();
          setSubjects(subjectsData.data || []);
        }
        
        if (curriculumsRes.ok) {
          const curriculumsData = await curriculumsRes.json();
          setCurriculums(curriculumsData.data || []);
        }

        const activeYearId = data.academicYears?.find((y: any) => y.isActive)?._id;
        if (activeYearId && hasErp) {
          const [tAllocRes, cAllocRes] = await Promise.all([
            authFetch(`/api/v1/erp/allocations/subject-teacher?academicYearId=${activeYearId}`),
            authFetch(`/api/v1/erp/allocations/class-teacher?academicYearId=${activeYearId}`)
          ]);
          
          if (tAllocRes.ok) {
            const tData = await tAllocRes.json();
            setTeacherAllocations(tData.data || []);
          }
          if (cAllocRes.ok) {
            const cData = await cAllocRes.json();
            setClassTeacherAllocations(cData.data || []);
          }
        }

        // Fetch initial expenses and ERP data
        try {
          const expRes = hasFees ? await authFetch('/api/v1/expenses') : null;
          if (expRes?.ok) {
            const expJson = await expRes.json();
            setExpenses(expJson.data?.expenses || []);
          }

          const leavesRes = hasErp ? await authFetch('/api/v1/erp/leave') : null;
          if (leavesRes?.ok) {
            const lvs = await leavesRes.json();
            setLeaveRequests(lvs.data || []);
          }

          const staffLeavesRes = hasErp ? await authFetch('/api/v1/erp/leave/staff') : null;
          if (staffLeavesRes?.ok) {
            const slvs = await staffLeavesRes.json();
            setStaffLeaveRequests(slvs.data || []);
          }

          const timetablesRes = hasErp ? await authFetch('/api/v1/erp/timetable') : null;
          if (timetablesRes?.ok) {
            const tt = await timetablesRes.json();
            setTimetables(tt.data || []);
          }

          const examsRes = hasErp ? await authFetch('/api/v1/erp/exams') : null;
          if (examsRes?.ok) {
            const ex = await examsRes.json();
            setExams(ex.data || []);
          }

          const resultsRes = hasErp ? await authFetch('/api/v1/erp/exams/results') : null;
          if (resultsRes?.ok) {
            const resData = await resultsRes.json();
            setResults(resData.data || []);
          }

          const hwRes = hasErp ? await authFetch('/api/v1/erp/homework') : null;
          if (hwRes?.ok) {
            const hw = await hwRes.json();
            setHomework(hw.data || []);
          }

          const convRes = hasErp ? await authFetch('/api/v1/erp/chat/conversations') : null;
          if (convRes?.ok) {
            const cv = await convRes.json();
            setConversations(cv.data || []);
          }
        } catch (e) {
          console.error('Failed to load expenses or ERP data', e);
        }

        setLedgerEntries([]);
        setTransactions(data.transactions || []);
      } catch (err) {
        console.error('Failed to fetch data from backend', err);
      } finally {
        setIsLoadingDetails(false);
        activeFetchRef.current = null;
      }
    })();

    activeFetchRef.current = promise;
    return promise;
  }, [authFetch, isOrgAdmin]);

  const fetchDashboardData = fetchAll;
  const fetchUnpaidData = useCallback(async () => {
    try {
      const unpaidRes = await authFetch(`/api/v1/reports/unpaid?_t=${Date.now()}`);
      if (unpaidRes.ok) {
        const unpaidDataRaw = await unpaidRes.json();
        setGlobalUnpaidData(unpaidDataRaw.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch unpaid data:', err);
    }
  }, [authFetch]);

  const debouncedFetchAll = useCallback(() => {
    if (fetchTimeoutRef.current) {
      window.clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = window.setTimeout(() => {
      fetchAll();
    }, 400);
  }, [fetchAll]);

  const setScreen = useCallback(async (screen: ScreenType) => {
    setScreenState(screen);
    if (!currentUser || currentUser.role === 'ORG_ADMIN' || screen === 'login') return;

    const now = Date.now();
    if (now - lastSyncCheckTimeRef.current < 15000) {
      return;
    }
    lastSyncCheckTimeRef.current = now;

    try {
      const res = await authFetch('/api/v1/dashboard/sync-state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.data?.timestamp && data.data.timestamp > lastSyncTimestamp) {
        setIsScreenLoading(true);
        await fetchAll();
        setIsScreenLoading(false);
      }
    } catch (err) {
      console.error('[Sync] Screen check failed:', err);
    }
  }, [currentUser, lastSyncTimestamp, authFetch, fetchAll]);

  useEffect(() => {
    if (currentUser) {
      fetchAll();
    }
  }, [currentUser, fetchAll]);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'ORG_ADMIN') return;

    let isSubscribed = true;

    const checkSync = async () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastSyncCheckTimeRef.current < 15000) {
        return;
      }
      lastSyncCheckTimeRef.current = now;

      try {
        const res = await authFetch('/api/v1/dashboard/sync-state');
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed) return;

        if (data.data?.timestamp && data.data.timestamp > lastSyncTimestamp) {
          await fetchAll();
        }
      } catch (err) {
        console.error('[Sync] Failed to verify sync state:', err);
      }
    };

    const jitter = Math.random() * 20000 - 10000;
    const interval = setInterval(checkSync, 90000 + jitter);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [currentUser, lastSyncTimestamp, authFetch, fetchAll]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser' && !e.newValue) {
        setCurrentUser(null);
        setScreenState('login');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      if (res.status === 429) {
        return { success: false, error: 'Too many login attempts. Please wait a moment and try again.' };
      }

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        return { success: false, error: data?.message || 'Invalid email or password.' };
      }
      if (!data || !data.data || !data.data.accessToken) {
        return { success: false, error: 'Invalid response from server' };
      }
      const { accessToken, refreshToken, user: userInfo, client: clientInfo } = data.data;

      let userId = '';
      let role = '';
      try {
        const payloadBase64 = accessToken.split('.')[1];
        let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        const payload = JSON.parse(atob(base64));
        userId = payload.id;
        role = payload.role;
      } catch (decodeErr) {
        console.error('Failed to decode token:', decodeErr);
        return { success: false, error: 'Invalid token format returned by server' };
      }

      const name = userInfo?.name || email.split('@')[0];
      const actualRole = userInfo?.role || role;

      const userObj = { name, email: email.toLowerCase().trim(), role: actualRole };
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userId', userId);
      localStorage.setItem('currentUser', JSON.stringify(userObj));
      if (clientInfo) localStorage.setItem('clientInfo', JSON.stringify(clientInfo));
      else localStorage.removeItem('clientInfo');

      setClient(clientInfo || null);
      setCurrentUser(userObj);
      setScreen(userObj.role === 'ORG_ADMIN' ? 'org-clients' : 'dashboard');
      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Failed to connect to server. Please check your network connection.' };
    }
  };

  const logout = () => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('clientInfo');
    setCurrentUser(null);
    setClient(null);
    setScreen('login');

    if (token && refreshToken) {
      fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ refreshToken })
      }).catch(err => {
        console.error('Logout request failed:', err);
      });
    }
  };

  // Keep the school's module licences fresh: the organization admin can enable/disable modules or suspend a
  // school while people are signed in. A suspended / removed school signs its users out.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    if (!currentUser || currentUser.role === 'ORG_ADMIN') return;
    let cancelled = false;

    const refreshContext = async () => {
      if (document.hidden) return;
      try {
        const res = await authFetch('/api/v1/auth/context');
        if (cancelled) return;
        if (res.status === 403) { logoutRef.current(); return; }
        if (!res.ok) return; // older backend without tenancy: keep whatever we have
        const next: ClientInfo | null = (await res.json()).data?.client ?? null;
        if (!next) return;
        setClient((prev) => {
          const same = prev && prev.id === next.id && prev.name === next.name
            && [...prev.enabledModules].sort().join() === [...next.enabledModules].sort().join();
          if (same) return prev;
          localStorage.setItem('clientInfo', JSON.stringify(next));
          return next;
        });
      } catch { /* offline: try again next tick */ }
    };

    refreshContext();
    const interval = setInterval(refreshContext, 60000);
    document.addEventListener('visibilitychange', refreshContext);
    return () => { cancelled = true; clearInterval(interval); document.removeEventListener('visibilitychange', refreshContext); };
  }, [currentUser, authFetch]);

  const addStudent = async (newS: Omit<Student, 'id' | 'status'>): Promise<boolean> => {
    try {
      const res = await authFetch('/api/v1/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newS)
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('Failed to add student:', errBody);
        return false;
      }
      // Refresh data
      await fetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const recordPayment = async (
    _studentId: string,
    lineItems: {
      category: string;
      period: string;
      ledgerId?: string;
      totalAmount: number;
      paymentAmount: number;
      concessionAmount: number;
      paymentMethod: string;
      remark: string;
    }[]
  ) => {
    try {
      // Filter out fees without a valid ledgerId
      const validFees = lineItems.filter(f => f.ledgerId);

      const paymentsPayload = validFees.map(fee => {
        let methodMapped = fee.paymentMethod;
        if (methodMapped === 'CARD' || methodMapped === 'NET BANKING') {
          methodMapped = 'ONLINE';
        } else if (methodMapped === 'GOVT') {
          methodMapped = 'CASH';
        }

        return {
          ledgerId: fee.ledgerId!,
          amount: fee.paymentAmount,
          concessionAmount: fee.concessionAmount,
          method: methodMapped as 'CASH' | 'CHEQUE' | 'ONLINE' | 'UPI' | 'REVERSAL',
          remark: fee.remark
        };
      }).filter(p => p.amount > 0 || p.concessionAmount > 0);

      if (paymentsPayload.length === 0) return;

      const idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `batch-pay-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const res = await authFetch('/api/v1/payments/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ payments: paymentsPayload })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = errBody.message || 'Failed to record payments. Please try again.';
        console.error('Failed to record batch payment:', errBody);
        alert(errMsg);
      } else {
        setLedgerEntries(prev => prev.map(ledger => {
          const payment = paymentsPayload.find(p => p.ledgerId === ledger._id);
          if (!payment) return ledger;
          const newPaid = (ledger.paidAmount || 0) + payment.amount;
          const newConcession = (ledger.concessionAmount || 0) + payment.concessionAmount;
          const newRemaining = (ledger.totalAmount || 0) - newPaid - newConcession;
          return {
            ...ledger,
            paidAmount: newPaid,
            concessionAmount: newConcession,
            remainingAmount: newRemaining,
            status: newRemaining <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'PENDING')
          };
        }));
        
        setGlobalUnpaidData(prev => prev.map(studentData => {
          if (studentData._id !== _studentId && studentData.id !== _studentId) return studentData;
          const newPending = (studentData.pendingLedgers || []).map((ledger: any) => {
            const payment = paymentsPayload.find(p => p.ledgerId === ledger._id || p.ledgerId === ledger.id);
            if (!payment) return ledger;
            const newRemaining = (ledger.remainingAmount ?? ledger.totalAmount ?? 0) - payment.amount - payment.concessionAmount;
            return {
              ...ledger,
              remainingAmount: newRemaining,
              status: newRemaining <= 0 ? 'PAID' : (newRemaining < (ledger.totalAmount || 0) ? 'PARTIAL' : 'PENDING')
            };
          }).filter((l: any) => l.remainingAmount > 0);
          
          return {
            ...studentData,
            pendingLedgers: newPending,
            totalPendingAmount: newPending.reduce((sum: number, l: any) => sum + (l.remainingAmount || 0), 0)
          };
        }));

        // The optimistic update above instantly and correctly updates the global unpaid data (badge).
        // The local grid in CollectFee.tsx also performs its own optimistic update.
        // We DO NOT fetch from the server immediately because MongoDB replication lag often returns 
        // stale data, which overwrites our optimistic update and causes the badge to incorrectly jump up.
        // The background sync-state poll will fetch the fully committed data in 0-15 seconds silently.
      }
    } catch (err) {
      console.error(err);
    }
  };

  const applyConcession = async (ledgerId: string, amount: number) => {
    try {
      // Optimistic update for ledger entries
      setLedgerEntries(prev => prev.map(ledger => {
        if (ledger._id !== ledgerId && ledger.id !== ledgerId) return ledger;
        const newConcession = (ledger.concessionAmount || 0) + amount;
        const newRemaining = (ledger.totalAmount || 0) - (ledger.paidAmount || 0) - newConcession;
        return {
          ...ledger,
          concessionAmount: newConcession,
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? 'PAID' : (ledger.paidAmount && ledger.paidAmount > 0 ? 'PARTIAL' : 'PENDING')
        };
      }));

      // Optimistic update for unpaidData
      setGlobalUnpaidData(prev => prev.map(studentData => {
        if (!studentData.pendingLedgers) return studentData;
        const ledgerExists = studentData.pendingLedgers.some((l: any) => l._id === ledgerId || l.id === ledgerId);
        if (!ledgerExists) return studentData;

        const newPending = studentData.pendingLedgers.map((ledger: any) => {
          if (ledger._id !== ledgerId && ledger.id !== ledgerId) return ledger;
          const newRemaining = (ledger.remainingAmount ?? ledger.totalAmount ?? 0) - amount;
          return {
            ...ledger,
            remainingAmount: newRemaining,
            status: newRemaining <= 0 ? 'PAID' : (newRemaining < (ledger.totalAmount || 0) ? 'PARTIAL' : 'PENDING')
          };
        }).filter((l: any) => l.remainingAmount > 0);
        
        return {
          ...studentData,
          pendingLedgers: newPending,
          totalPendingAmount: newPending.reduce((sum: number, l: any) => sum + (l.remainingAmount || 0), 0)
        };
      }));

      const res = await authFetch(`/api/v1/ledgers/${ledgerId}/concession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: 'Applied concession manually' })
      });
      if (!res.ok) throw new Error('Failed to apply concession');
      
      debouncedFetchAll();
    } catch (err) {
      console.error(err);
      fetchAll(); // Revert on failure
    }
  };

  // Reverse a payment by calling the backend API
  const reversePayment = async (paymentId: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/payments/${paymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual reversal by admin' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || `Failed to reverse payment ${paymentId}`);
        return false;
      }
      
      // Delay the fetch slightly to bypass MongoDB replication lag, ensuring the DB is updated
      setTimeout(() => {
        fetchAll();
      }, 1000);
      
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Network error occurred during reversal');
      return false;
    }
  };

  const fetchAttendance = async (date: string, standard: string, division: string, medium: string) => {
    try {
      const res = await authFetch(`/api/v1/attendance?date=${date}&standard=${standard}&division=${division}&medium=${medium}`);
      if (res.ok) {
        const json = await res.json();
        return json.data; // returns null if not found
      }
      return null;
    } catch (err) {
      console.error('Error fetching attendance:', err);
      return null;
    }
  };

  const saveAttendance = async (date: string, standard: string, division: string, medium: string, records: any[]): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authFetch(`/api/v1/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, standard, division, medium, records })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message || 'Failed to save attendance' };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      return { success: false, error: err.message };
    }
  };

  const fetchPendingAbsences = async (): Promise<any[]> => {
    try {
      const res = await authFetch('/api/v1/attendance/pending-absences');
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching pending absences:', err);
      return [];
    }
  };

  const verifyAbsence = async (attendanceId: string, studentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authFetch(`/api/v1/attendance/${attendanceId}/verify-absence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.message || 'Failed to verify absence' };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Error verifying absence:', err);
      return { success: false, error: err.message };
    }
  };

  const fetchAttendanceOverview = async (date: string): Promise<any[]> => {
    try {
      const res = await authFetch(`/api/v1/attendance/overview?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching attendance overview:', err);
      return [];
    }
  };

  const confirmAttendance = async (attendanceId: string): Promise<{ success: boolean; notified?: number; error?: string }> => {
    try {
      const res = await authFetch(`/api/v1/attendance/${attendanceId}/confirm`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: json.message || 'Failed to confirm attendance' };
      return { success: true, notified: json.data?.notified ?? 0 };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const remindAttendanceTeacher = async (cls: { standard: string; division: string; medium: string; date: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authFetch('/api/v1/attendance/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cls),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: json.message || 'Failed to send reminder' };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Update a standard fee structure
  const updateFeeStructure = async (id: string, data: Partial<FeeStructureData>): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/fee-structures/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update fee structure');
      const resData = await res.json();
      setFeeStructures(prev => prev.map(f => f._id === id ? resData.data : f));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteFeeStructure = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/fee-structures/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete fee structure');
      setFeeStructures(prev => prev.filter(f => f._id !== id));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Update a transport fee structure
  const updateTransportFeeStructure = async (id: string, data: Partial<TransportFeeStructureData>): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/fee-structures/transport/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update transport fee structure');
      const resData = await res.json();
      setTransportFeeStructures(prev => prev.map(t => t._id === id ? resData.data : t));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteTransportFeeStructure = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/fee-structures/transport/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete transport fee structure');
      setTransportFeeStructures(prev => prev.filter(t => t._id !== id));
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const createFeeStructure = async (data: Partial<FeeStructureData>): Promise<boolean> => {
    try {
      const res = await authFetch('/api/v1/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create fee structure');
      const resData = await res.json();
      setFeeStructures(prev => [...prev, resData.data]);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const createTransportFeeStructure = async (data: Partial<TransportFeeStructureData>): Promise<boolean> => {
    try {
      const res = await authFetch('/api/v1/fee-structures/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create transport fee structure');
      const resData = await res.json();
      setTransportFeeStructures(prev => [...prev, resData.data]);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const copyFeeStructures = async (fromYear: string, toYear: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await authFetch('/api/v1/fee-structures/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromYear, toYear })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Copy failed');
      debouncedFetchAll();
      return { success: true, message: data.message };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const createAcademicYear = async (data: Partial<AcademicYearData>): Promise<boolean> => {
    try {
      const res = await authFetch('/api/v1/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create academic year');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const activateAcademicYear = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/academic-years/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });
      if (!res.ok) throw new Error('Failed to activate academic year');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const createFeeCategory = async (data: Partial<FeeCategoryData>): Promise<boolean> => {
    try {
      const res = await authFetch('/api/v1/fee-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error('[createFeeCategory] error:', errBody?.message || res.status);
        return false;
      }
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error('[createFeeCategory] network error:', err);
      return false;
    }
  };

  const updateAcademicYear = async (id: string, data: Partial<AcademicYearData>): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/academic-years/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update academic year');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteAcademicYear = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/academic-years/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete academic year');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateFeeCategory = async (id: string, data: Partial<FeeCategoryData>): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/fee-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update fee category');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const deleteFeeCategory = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/fee-categories/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete fee category');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const checkMobile = async (primary: string, secondary: string) => {
    try {
      const params = new URLSearchParams();
      if (primary) params.append('primaryMobile', primary);
      if (secondary) params.append('secondaryMobile', secondary);

      const res = await authFetch(`/api/v1/parents/check-mobile?${params.toString()}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.data; // { exists: boolean, parent: object | null }
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      const res = await authFetch(`/api/v1/students/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        console.error('Failed to delete student');
        return false;
      }
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const restoreStudent = async (id: string) => {
    try {
      const res = await authFetch(`/api/v1/students/${id}/restore`, {
        method: 'POST'
      });
      if (!res.ok) {
        console.error('Failed to restore student');
        return false;
      }
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const updateStudent = async (id: string, updates: Partial<Student> & { transportMonths?: number }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await authFetch(`/api/v1/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Failed to update student:', data);
        return { success: false, error: data.message || 'Failed to update student' };
      }
      debouncedFetchAll();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || 'Network error occurred' };
    }
  };

  const regenerateLedgers = async (id: string): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/students/${id}/regenerate-ledgers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to regenerate ledgers');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const addCustomFee = async (id: string, feeName: string, amount: number): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/v1/students/${id}/custom-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeName, amount })
      });
      if (!res.ok) throw new Error('Failed to add custom fee');
      debouncedFetchAll();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const importStudents = async (studentsList: any[]) => {
    try {
      const res = await authFetch('/api/v1/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsList })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Import failed');
      }
      debouncedFetchAll();
      return data.data;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const autoPromoteBatch = async (studentIds: string[]) => {
    try {
      const res = await authFetch(`${API_BASE}/api/v1/students/auto-promote-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Auto-promotion failed');
      }
      const data = await res.json();
      debouncedFetchAll();
      return data.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const fixTransportLedgers = async (studentIds: string[], transportStartMonth: string) => {
    try {
      const res = await authFetch('/api/v1/students/fix-transport', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds, transportStartMonth })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Fix failed');
      debouncedFetchAll();
      return data.data;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setScreen,
        students,
        activeStudents,
        unpaidData,
        ledgerEntries,
        transactions,
        feeStructures,
        transportFeeStructures,
        academicYears,
        feeCategories,
        auditLogs,
        expenses,
        users,
        subjects,
        curriculums,
        teacherAllocations,
        classTeacherAllocations,
        leaveRequests,
        staffLeaveRequests,
        timetables,
        exams,
        results,
        homework,
        conversations,
        lastSyncTimestamp,
        fetchDashboardData,
        fetchUnpaidData,
        authFetch,
        fetchExpenses: async () => {
          try {
            const res = await authFetch('/api/v1/expenses');
            if (res.ok) {
              const data = await res.json();
              setExpenses(data.data?.expenses || []);
            }
          } catch (err) {
            console.error('Error fetching expenses:', err);
          }
        },
        addExpense: async (expData: Partial<ExpenseData>) => {
          try {
            const res = await authFetch('/api/v1/expenses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(expData),
            });
            if (res.ok) {
              const resData = await res.json();
              setExpenses((prev) => [resData.data.expense, ...prev]);
              return true;
            }
          } catch (err) {
            console.error('Error adding expense:', err);
          }
          return false;
        },
        deleteExpense: async (id: string) => {
          try {
            const res = await authFetch(`/api/v1/expenses/${id}`, {
              method: 'DELETE',
            });
            if (res.ok) {
              setExpenses((prev) => prev.filter((item) => item._id !== id));
              return true;
            }
          } catch (err) {
            console.error('Error deleting expense:', err);
          }
          return false;
        },
        reverseExpense: async (id: string, reason?: string) => {
          try {
            const res = await authFetch(`/api/v1/expenses/${id}/reverse`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason }),
            });
            if (res.ok) {
              const resData = await res.json();
              const updatedExp = resData.data.expense;
              setExpenses((prev) =>
                prev.map((exp) => (exp._id === id ? updatedExp : exp))
              );
              return true;
            }
          } catch (err) {
            console.error('Error reversing expense:', err);
          }
          return false;
        },
        fetchAttendance,
        saveAttendance,
        fetchPendingAbsences,
        verifyAbsence,
        fetchAttendanceOverview,
        confirmAttendance,
        remindAttendanceTeacher,
        addStudent,
        recordPayment,
        applyConcession,
        reversePayment,
        updateFeeStructure,
        updateTransportFeeStructure,
        deleteFeeStructure,
        deleteTransportFeeStructure,
        createFeeStructure,
        createTransportFeeStructure,
        createAcademicYear,
        updateAcademicYear,
        deleteAcademicYear,
        activateAcademicYear,
        createFeeCategory,
        updateFeeCategory,
        deleteFeeCategory,
        login,
        logout,
        checkMobile,
        deleteStudent,
        restoreStudent,
        updateStudent,
        regenerateLedgers,
        addCustomFee,
        importStudents,
        autoPromoteBatch,
        fixTransportLedgers,
        copyFeeStructures,
        selectedStudentIdForFee,
        setSelectedStudentIdForFee,
        currentUser,
        isSuperAdmin,
        isOrgAdmin,
        client,
        activePortal,
        setActivePortal,
        isLoadingDetails,
        isScreenLoading,
        refreshData: debouncedFetchAll
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default useApp;
