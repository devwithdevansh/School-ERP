import React, { useEffect } from 'react';
import { useApp } from './store';
import type { PaymentTransaction } from './mockData';
import { ScreenSkeleton } from './components/ScreenSkeleton';
import { BrandedLoader } from './components/BrandedLoader';
import { AppShell } from './layout/AppShell';
import { Dashboard } from './components/Dashboard';
import { CollectFee } from './components/CollectFee';
import { UnpaidFees } from './components/UnpaidFees';
import { Students } from './components/Students';
import { FeeStructure } from './components/FeeStructure';
import { Setup } from './components/Setup';
import { Login } from './components/Login';
import { PromoteStudents } from './components/PromoteStudents';
import { StaffManagement } from './components/StaffManagement';
import { AuditLogs } from './components/AuditLogs';
import { ImportExcel } from './components/ImportExcel';
import { TodayExpenses } from './components/TodayExpenses';

import { Reports } from './components/Reports';
import { Receipts } from './components/Receipts';
import { Notifications } from './components/Notifications';
import { Whatsapp } from './components/Whatsapp';
import { ErpDashboard } from './components/ErpDashboard';
import { Admission } from './components/Admission';
import { Attendance } from './components/Attendance';
import { Subjects } from './components/Subjects';
import { Timetable } from './components/Timetable';
import { Exams } from './components/Exams';
import { Results } from './components/Results';
import { RolesPermissions } from './components/RolesPermissions';
import { TeacherAllocationDashboard } from './components/TeacherAllocationDashboard';
import { StudentLeaveManagement } from './components/StudentLeaveManagement';
import { StaffLeaveManagement } from './components/StaffLeaveManagement';
import { TeacherView } from './components/TeacherView';
import { StudentView } from './components/StudentView';
import { AcademicCalendar } from './components/AcademicCalendar';
import { ErpPlaceholder } from './components/ErpPlaceholder';
import { DocumentsHub } from './components/DocumentsHub';
import { OrgClients } from './components/org/OrgClients';
import { OrgLicences } from './components/org/OrgLicences';
import { generateReceiptHTML, generateReportHTML, printHTML, fetchAsBase64 } from './utils/printUtils';
import { brand } from './config/brand';
import { parseExamRoute } from './utils/examRouteUtils';
import { hasPermission } from './config/permissionsRegistry';
import { ShieldAlert } from './components/icons';

const logoPath = brand.logo;
const watermarkPath = brand.logo;

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800">Something went wrong in this view</h3>
            <p className="mt-2 text-xs text-slate-500">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ScreenContent: React.FC<{ onPrint: (tx: PaymentTransaction) => void, onPrintReport: (report: any) => void }> = ({ onPrint, onPrintReport }) => {
  const { currentScreen, activePortal, currentUser, isSuperAdmin, setScreen } = useApp();

  // Organization admin console (platform owner)
  if (activePortal === 'ORG') {
    return currentScreen === 'org-licences' ? <OrgLicences /> : <OrgClients />;
  }

  // Teacher Workspace (Essential edition only)
  if (activePortal === 'TEACHER' || currentScreen === 'teacher-attendance' || currentScreen === 'teacher-timetable') {
    return <TeacherView />;
  }

  // Student / Parent Fee Workspace (Essential edition only)
  if (
    activePortal === 'STUDENT' ||
    currentScreen === 'student-fees' ||
    currentScreen === 'student-receipts'
  ) {
    return <StudentView onPrint={onPrint} />;
  }

  // If we are in ERP mode, route ERP screens
  if (activePortal === 'ERP') {
    switch (currentScreen) {
      case 'dashboard':
        return <ErpDashboard />;
      case 'admission':
        return <Admission />;
      case 'attendance':
        return <Attendance />;
      case 'academic-calendar':
        return <AcademicCalendar />;
      case 'subjects':
        return <Subjects />;
      case 'timetable':
        return <Timetable />;
      case 'exams':
        return <Exams />;
      case 'results':
        return <Results />;
      case 'documents':
      case 'certificates':
        return <DocumentsHub />;
      case 'roles':
        return <RolesPermissions />;
      case 'teacher-allocation':
        return <TeacherAllocationDashboard />;
      case 'student-leave':
        return <StudentLeaveManagement />;
      case 'staff-leave':
        return <StaffLeaveManagement />;
      case 'students':
        return <Students />;
      case 'staff-management':
        return <StaffManagement />;
      case 'setup':
        return <Setup />;
      case 'audit-log':
        return <AuditLogs />;
      default:
        return <ErpDashboard />;
    }
  }

  // Fees mode
  switch (currentScreen) {
    case 'dashboard':
      return <Dashboard />;
    case 'collect-fee':
      return <CollectFee />;
    case 'today-expenses':
      return <TodayExpenses />;
    case 'unpaid-fees':
      return <UnpaidFees />;
    case 'fee-structure':
      return <FeeStructure />;
    case 'setup':
      return <Setup />;
    case 'academic-calendar':
      return <AcademicCalendar />;
    case 'students':
      return <Students />;
    case 'promote-students':
      if (!hasPermission('SCREEN_PROMOTE', currentUser?.permissions, currentUser?.role, isSuperAdmin)) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
            <div className="max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200 animate-in fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Feature Strictly Restricted</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Student Cohort Promotion permanently advances grades and generates new academic year fee ledgers. By default, it is locked for client and staff roles. Contact your Super Administrator to authorize access.
              </p>
              <button
                type="button"
                onClick={() => setScreen('dashboard')}
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        );
      }
      return <PromoteStudents />;

    case 'import-excel':
      if (!hasPermission('SCREEN_IMPORT_EXCEL', currentUser?.permissions, currentUser?.role, isSuperAdmin)) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh]">
            <div className="max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-200 animate-in fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Bulk Ingestion Restricted</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                Bulk spreadsheet importing can overwrite student profiles and fee structures. By default, it is restricted for staff accounts. Contact your Super Administrator to unlock this capability.
              </p>
              <button
                type="button"
                onClick={() => setScreen('dashboard')}
                className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        );
      }
      return <ImportExcel />;
    case 'staff-management':
      return <StaffManagement />;
    // for test
    // Fallback views with high-fidelity polish
    case 'whatsapp':
      return <Whatsapp />;

    case 'notifications':
      return <Notifications />;

    case 'receipts':
      return <Receipts onPrint={onPrint} />;

    case 'audit-log':
      return <AuditLogs />;

    case 'reports':
      return <Reports onPrintReport={onPrintReport} />;

    default:
      return <Dashboard />;
  }
};

const MainAppLayout: React.FC<{ onPrint: (tx: PaymentTransaction) => void, onPrintReport: (report: any) => void }> = ({ onPrint, onPrintReport }) => {
  const { currentScreen, isScreenLoading, isLoadingDetails, activePortal, setActivePortal, setScreen, currentUser } = useApp();

  useEffect(() => {
    const handleUrlSync = () => {
      if (currentUser?.role === 'parent' || currentUser?.role === 'ORG_ADMIN') {
        if (window.location.pathname.startsWith('/academics')) {
          window.history.replaceState({}, '', '/');
        }
        return;
      }
      const route = parseExamRoute();
      if (route.screen === 'exams') {
        setActivePortal('ERP');
        setScreen('exams');
      } else if (route.screen === 'results') {
        setActivePortal('ERP');
        setScreen('results');
      }
    };

    const route = parseExamRoute();
    if (route.screen === 'exams' || route.screen === 'results') {
      handleUrlSync();
    }

    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [currentUser?.role, setActivePortal, setScreen]);

  if (currentScreen === 'login') {
    return <Login />;
  }

  return (
    <AppShell>
      {isLoadingDetails && !isScreenLoading && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[100] px-8 py-5 rounded-2xl pointer-events-none">
          <BrandedLoader compact label="Syncing background data…" />
        </div>
      )}
      {isScreenLoading ? (
        <ScreenSkeleton />
      ) : (
        <AppErrorBoundary>
          <ScreenContent onPrint={onPrint} onPrintReport={onPrintReport} />
        </AppErrorBoundary>
      )}
    </AppShell>
  );
};

export const App: React.FC = () => {
  /**
   * Receipt printing — converts logo assets to base64 data URIs first
   * (fixes intermittent missing-logo issue in iframe), then generates
   * a fully self-contained HTML string and prints via hidden iframe.
   */
  const handlePrint = async (tx: PaymentTransaction) => {
    let currentUserName: string | undefined;
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) currentUserName = JSON.parse(saved)?.name;
    } catch { /* ignore */ }

    // Embed images as base64 so they always load in the iframe
    const [logoBase64, watermarkBase64] = await Promise.all([
      fetchAsBase64(logoPath),
      fetchAsBase64(watermarkPath),
    ]);

    const html = generateReceiptHTML(tx, { currentUserName, logoBase64, watermarkBase64 });
    printHTML(html);
  };

  const handlePrintReport = async (report: any) => {
    const logoBase64 = await fetchAsBase64(logoPath);
    const html = generateReportHTML(report, { logoBase64 });
    printHTML(html);
  };

  return (
    <React.StrictMode>
      <MainAppLayout onPrint={handlePrint} onPrintReport={handlePrintReport} />
    </React.StrictMode>
  );
};

export default App;
