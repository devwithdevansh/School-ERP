import React from 'react';
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
import { Results } from './components/Results';
import { RolesPermissions } from './components/RolesPermissions';
import { TeacherAllocationDashboard } from './components/TeacherAllocationDashboard';
import { StudentLeaveManagement } from './components/StudentLeaveManagement';
import { StaffLeaveManagement } from './components/StaffLeaveManagement';
import { Messages } from './components/Messages';
import { ErpPlaceholder } from './components/ErpPlaceholder';
import { OrgClients } from './components/org/OrgClients';
import { OrgLicences } from './components/org/OrgLicences';
import { generateReceiptHTML, generateReportHTML, printHTML, fetchAsBase64 } from './utils/printUtils';
import { brand } from './config/brand';

const logoPath = brand.logo;
const watermarkPath = brand.logo;

const ScreenContent: React.FC<{ onPrint: (tx: PaymentTransaction) => void, onPrintReport: (report: any) => void }> = ({ onPrint, onPrintReport }) => {
  const { currentScreen, activePortal } = useApp();

  // Organization admin console (platform owner)
  if (activePortal === 'ORG') {
    return currentScreen === 'org-licences' ? <OrgLicences /> : <OrgClients />;
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
      case 'subjects':
        return <Subjects />;
      case 'timetable':
        return <Timetable />;
      case 'results':
        return <Results />;
      case 'certificates':
        return <ErpPlaceholder title="Certificates & ID Cards" />;
      case 'roles':
        return <RolesPermissions />;
      case 'teacher-allocation':
        return <TeacherAllocationDashboard />;
      case 'student-leave':
        return <StudentLeaveManagement />;
      case 'staff-leave':
        return <StaffLeaveManagement />;
      case 'messages':
        return <Messages />;
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
    case 'students':
      return <Students />;
    case 'promote-students':
      return <PromoteStudents />;
    case 'import-excel':
      return <ImportExcel />;
    case 'staff-management':
      return <StaffManagement />;
    // for test
    // Fallback views with high-fidelity polish
    case 'whatsapp':
      return <Whatsapp />;

    case 'notifications':
      return <Notifications />;

    case 'messages':
      return <Messages />;

    case 'parent-app':
      return (
        <div className="flex-1 p-6 flex items-center justify-center bg-slate-50">
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-2xl max-w-sm w-full border-t-8 border-t-slate-800 border-b-8 border-b-slate-800 relative">
            {/* Phone speaker/camera bar */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-24 bg-slate-800 rounded-full"></div>

            <div className="pt-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="shrink-0">
                  <img src={watermarkPath} alt={brand.productName} className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800">{brand.schoolName} Parent App</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Demo Preview</p>
                </div>
              </div>

              {/* Student info */}
              <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-3 text-left">
                <h5 className="font-bold text-xs text-slate-800">Priya Shah</h5>
                <p className="text-[10px] text-slate-500">English Medium · Std 5</p>

                <div className="mt-3 pt-2 border-t border-blue-100/50 flex justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Pending Due</span>
                  <span className="text-xs font-bold text-red-500">₹5,600</span>
                </div>
              </div>

              {/* Invoices list stub */}
              <div className="space-y-2 text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Pending Invoices</span>
                <div className="border border-slate-100 rounded-lg p-2.5 flex justify-between items-center text-xs">
                  <div>
                    <strong className="block text-slate-800 font-bold text-[11px]">Education Fee - June</strong>
                    <span className="text-[9px] text-slate-400">Due: June 15, 2026</span>
                  </div>
                  <span className="font-bold text-red-500 text-xs">₹2,800</span>
                </div>
                <div className="border border-slate-100 rounded-lg p-2.5 flex justify-between items-center text-xs">
                  <div>
                    <strong className="block text-slate-800 font-bold text-[11px]">Education Fee - July</strong>
                    <span className="text-[9px] text-slate-400">Due: July 15, 2026</span>
                  </div>
                  <span className="font-bold text-red-500 text-xs">₹2,800</span>
                </div>
              </div>

              <button className="w-full bg-[#115e59] text-white font-bold py-2 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all">
                Pay Now via UPI
              </button>
            </div>
          </div>
        </div>
      );

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
  const { currentScreen, isScreenLoading, isLoadingDetails } = useApp();

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
        <ScreenContent onPrint={onPrint} onPrintReport={onPrintReport} />
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
