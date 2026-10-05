import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { FileSpreadsheet, Printer, Calendar, Filter, Users, DollarSign, Award, ArrowUpRight, Search, Loader2 } from './icons';
import * as XLSX from 'xlsx';
import { isLedgerPending } from '../utils';
import { formatTransactions } from '../utils/transactionHelpers';
import { getActiveStandards } from '../utils/standardUtils';

interface ReportsProps {
  onPrintReport: (report: { type: string; title: string; data: any }) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onPrintReport }) => {
  const { activeStudents, unpaidData, feeStructures, academicYears, transactions: globalTransactions, expenses, users } = useApp();

  const [activeTab, setActiveTab] = useState<'daily' | 'outstanding' | 'rte' | 'concessions'>('daily');

  // Daily Collections State
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dailySearchQuery, setDailySearchQuery] = useState('');

  // Outstanding Dues State
  const [outstandingClassFilter, setOutstandingClassFilter] = useState('All Classes');
  const [outstandingMediumFilter, setOutstandingMediumFilter] = useState('All Mediums');
  const [outstandingSearchQuery, setOutstandingSearchQuery] = useState('');

  // RTE Reconcile State
  const [rteClassFilter, setRteClassFilter] = useState('All Classes');
  const [rteSearchQuery, setRteSearchQuery] = useState('');

  const activeYearName = useMemo(() => academicYears.find(y => y.isActive)?.name || academicYears[0]?.name || '', [academicYears]);
  const activeYearFeeStructures = useMemo(() => {
    return feeStructures.filter(f => f.academicYear === activeYearName || (!f.academicYear && (activeYearName === academicYears[0]?.name)));
  }, [feeStructures, activeYearName, academicYears]);

  const dynamicStandards = useMemo(() => {
    return getActiveStandards(feeStructures, activeYearName, undefined);
  }, [feeStructures, activeYearName]);

  const dynamicMediums = useMemo(() => {
    const medSet = new Set(activeYearFeeStructures.map(f => f.medium));
    const list = Array.from(medSet);
    if (list.length === 0) {
      return ['English', 'Gujarati'];
    }
    return list;
  }, [activeYearFeeStructures]);

  // Available filters from data
  const classes = useMemo(() => {
    return ['All Classes', ...dynamicStandards.map(std => isNaN(Number(std)) ? std : `Class ${std}`)];
  }, [dynamicStandards]);

  const mediums = useMemo(() => {
    return ['All Mediums', ...dynamicMediums.map(med => `${med} Medium`)];
  }, [dynamicMediums]);

  const [dailyTransactions, setDailyTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'daily' || activeTab === 'concessions') {
      const filtered = globalTransactions.filter((tx: any) => {
        const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
        return txDate === selectedDate;
      });
      if (filtered.length > 0 && activeStudents.length > 0) {
        setDailyTransactions(formatTransactions(filtered, activeStudents));
      } else {
        setDailyTransactions([]);
      }
    }
  }, [activeTab, selectedDate, globalTransactions, activeStudents]);

  // ==========================================
  // 1. DAILY COLLECTIONS REPORT CALCULATION
  // ==========================================
  const dailyReportData = useMemo(() => {
    // Filter transactions by selected date (YYYY-MM-DD)
    const filteredTxns = dailyTransactions.filter(t => {
      if (!t.date) return false;
      const matchesDate = t.date === selectedDate;
      if (!matchesDate) return false;

      if (dailySearchQuery) {
        const q = dailySearchQuery.toLowerCase();
        return (
          t.studentName.toLowerCase().includes(q) ||
          t.studentCode.toLowerCase().includes(q) ||
          t.feeType.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Filter expenses by selected date
    let cashExpenses = 0;
    const filteredExpenses = (expenses || []).filter(exp => {
      if (exp.isReversed) return false;
      const expDate = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
      if (expDate !== selectedDate) return false;

      if (dailySearchQuery) {
        const q = dailySearchQuery.toLowerCase();
        return (
          exp.title.toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Summary calculations
    let totalCollected = 0;
    let cashCollected = 0;
    let onlineCollected = 0;
    let chequeCollected = 0;

    filteredTxns.forEach(t => {
      totalCollected += t.amount;
      const method = t.method?.toUpperCase();
      if (method === 'CASH') cashCollected += t.amount;
      else if (method === 'ONLINE') onlineCollected += t.amount;
      else if (method === 'CHEQUE') chequeCollected += t.amount;
    });

    filteredExpenses.forEach(exp => {
      if (exp.paymentMethod === 'CASH') {
        cashExpenses += (exp.amount || 0);
      }
    });

    return {
      transactions: filteredTxns,
      expenses: filteredExpenses,
      cashExpenses,
      totalCollected,
      cashCollected,
      netCashCollected: cashCollected - cashExpenses,
      onlineCollected,
      chequeCollected
    };
  }, [dailyTransactions, expenses, selectedDate, dailySearchQuery]);

  // ==========================================
  // 2. OUTSTANDING DUES REPORT CALCULATION
  // ==========================================
  const outstandingReportData = useMemo(() => {
    // Combine fetched unpaid data with activeStudents
    const mappedUnpaidStudents = unpaidData.map(reportItem => {
      const globalStudent = activeStudents.find(s => s._id === reportItem._id || s.id === reportItem._id);
      
      const overdueLedgers = reportItem.pendingLedgers.filter((l: any) => 
        isLedgerPending(l) // assuming active year is current year for reports
      );
      
      const uniquePeriods = new Set(
        overdueLedgers
          .filter((l: any) => l.feePeriod !== 'One-time')
          .map((l: any) => `${l.academicYear || ''}_${l.feePeriod}`)
      );

      let educationDue = 0;
      let transportDue = 0;
      overdueLedgers.forEach((l: any) => {
        const remaining = (l.totalAmount || 0) - (l.paidAmount || 0) - (l.concessionAmount || 0);
        if (l.feeType === 'TRANSPORT') transportDue += remaining;
        else educationDue += remaining;
      });

      return {
        ...globalStudent,
        ...reportItem,
        studentName: reportItem.studentName,
        parentName: globalStudent?.parentName || '',
        parentMobile: globalStudent?.parentMobile || '',
        totalDue: reportItem.totalPendingAmount,
        educationDue,
        transportDue,
        dueMonthsCount: uniquePeriods.size,
        periods: uniquePeriods
      };
    });

    // 2. Map back to students with filters
    const list = mappedUnpaidStudents
      .filter(s => {
        // Active status
        if (!s.isActive) return false;

        // Exclude RTE students (since their tuition fees are government-exempted/covered)
        if (s.isRTE || s.status === 'RTE') return false;

        // Class Filter
        if (outstandingClassFilter !== 'All Classes') {
          const std = outstandingClassFilter.replace('Class ', '');
          if (s.standard !== std) return false;
        }

        // Medium Filter
        if (outstandingMediumFilter !== 'All Mediums') {
          const med = outstandingMediumFilter.replace(' Medium', '');
          if (s.medium !== med) return false;
        }

        // Search Filter
        if (outstandingSearchQuery) {
          const q = outstandingSearchQuery.toLowerCase();
          return (
            s.studentName.toLowerCase().includes(q) ||
            s.studentCode.toLowerCase().includes(q) ||
            s.parentMobile.includes(q)
          );
        }
        return true;
      })
      .map(s => {
        return {
          id: s._id || s.id,
          studentCode: s.studentCode,
          studentName: s.studentName,
          classInfo: `Class ${s.standard} - ${s.division} (${s.medium})`,
          parentName: s.parentName,
          parentMobile: s.parentMobile,
          overdueCount: s.dueMonthsCount,
          totalDue: s.totalDue,
          educationDue: s.educationDue,
          transportDue: s.transportDue
        };
      })
      .filter(s => s.totalDue > 0) // Only show students with actual dues
      .sort((a, b) => b.totalDue - a.totalDue);

    // Dues Buckets
    let oneDueCount = 0;
    let twoDueCount = 0;
    let threePlusDueCount = 0;
    let totalOutstandingAmount = 0;
    let totalEducationDue = 0;
    let totalTransportDue = 0;

    list.forEach(s => {
      totalOutstandingAmount += s.totalDue;
      totalEducationDue += s.educationDue;
      totalTransportDue += s.transportDue;
      if (s.overdueCount === 1) oneDueCount++;
      else if (s.overdueCount === 2) twoDueCount++;
      else if (s.overdueCount >= 3) threePlusDueCount++;
    });

    return {
      students: list,
      totalOutstandingAmount,
      totalEducationDue,
      totalTransportDue,
      studentCount: list.length,
      oneDueCount,
      twoDueCount,
      threePlusDueCount
    };
  }, [activeStudents, unpaidData, outstandingClassFilter, outstandingMediumFilter, outstandingSearchQuery]);

  // ==========================================
  // 3. RTE RECONCILE REPORT CALCULATION
  // ==========================================
  const rteReportData = useMemo(() => {
    let rteList = activeStudents.filter(s => s.isRTE);

    if (rteClassFilter !== 'All Classes') {
        const std = rteClassFilter.replace('Class ', '');
        rteList = rteList.filter(s => s.standard === std);
    }
    
    if (rteSearchQuery) {
        const q = rteSearchQuery.toLowerCase();
        rteList = rteList.filter(s => s.studentName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q));
    }

    const list = rteList.map(s => {
        return {
          id: s.id,
          studentCode: s.studentCode,
          studentName: s.studentName,
          classInfo: `Class ${s.standard} - ${s.division} (${s.medium})`,
          parentName: s.parentName,
          parentMobile: s.parentMobile,
          exemptedAmount: 0 // Local state simplification
        };
      })
      .sort((a, b) => b.studentName.localeCompare(a.studentName));

    const totalExemptedAmount = 0;

    return {
      students: list,
      totalExemptedAmount,
      studentCount: list.length
    };
  }, [activeStudents, rteClassFilter, rteSearchQuery]);

  // ==========================================
  // 4. CONCESSIONS REPORT CALCULATION
  // ==========================================
  const getCashierName = (id?: string) => {
    if (!id) return 'Admin';
    const u = users.find(u => u._id === id);
    return u ? u.name : 'Admin';
  };

  const concessionsReportData = useMemo(() => {
    const filteredTxns = dailyTransactions.filter(t => {
      if (!t.date || t.date !== selectedDate) return false;
      if (t.concessionAmount <= 0) return false;
      if (dailySearchQuery) {
        const q = dailySearchQuery.toLowerCase();
        return (
          t.studentName.toLowerCase().includes(q) ||
          t.studentCode.toLowerCase().includes(q) ||
          t.feeType.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const totalConcessionGiven = filteredTxns.reduce((sum, tx) => sum + (tx.concessionAmount || 0), 0);

    return {
      transactions: filteredTxns,
      totalConcessionGiven
    };
  }, [dailyTransactions, selectedDate, dailySearchQuery]);

  // ==========================================
  // EXPORT EXCEL FUNCTIONS
  // ==========================================
  const exportDailyExcel = () => {
    const data = dailyReportData.transactions.map((t, idx) => ({
      'S.No': idx + 1,
      'Student Code': t.studentCode,
      'Student Name': t.studentName,
      'Class Details': t.classInfo,
      'Fee Description': t.feeType.replace(/\n/g, ', '),
      'Payment Method': t.method,
      'Time': t.time,
      'Amount (₹)': t.amount,
      'Remarks': t.remark || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Fit column widths
    const maxLens = [{ wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];
    worksheet['!cols'] = maxLens;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Collections");

    if (dailyReportData.expenses && dailyReportData.expenses.length > 0) {
      const expData = dailyReportData.expenses.map((exp: any, idx: number) => ({
        'S.No': idx + 1,
        'Expense Title': exp.title,
        'Category': exp.category,
        'Payment Method': exp.paymentMethod,
        'Amount (₹)': exp.amount,
        'Description': exp.description || ''
      }));
      const expWorksheet = XLSX.utils.json_to_sheet(expData);
      expWorksheet['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, expWorksheet, "Daily Expenses");
    }

    XLSX.writeFile(workbook, `daily_collections_${selectedDate}.xlsx`);
  };

  const exportOutstandingExcel = () => {
    const data = outstandingReportData.students.map((s, idx) => ({
      'S.No': idx + 1,
      'Student Code': s.studentCode,
      'Student Name': s.studentName,
      'Class Details': s.classInfo,
      'Parent Name': s.parentName,
      'Parent Mobile': s.parentMobile,
      'Overdue Ledger Count': s.overdueCount,
      'Education Dues (₹)': s.educationDue,
      'Transport Dues (₹)': s.transportDue,
      'Total Outstanding (₹)': s.totalDue
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outstanding Dues");
    XLSX.writeFile(workbook, `outstanding_dues_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportRteExcel = () => {
    const data = rteReportData.students.map((s, idx) => ({
      'S.No': idx + 1,
      'Student Code': s.studentCode,
      'Student Name': s.studentName,
      'Class Details': s.classInfo,
      'Parent Name': s.parentName,
      'Parent Mobile': s.parentMobile,
      'Exempted Tuition Fee (₹)': s.exemptedAmount
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 22 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RTE Reimbursements");
    XLSX.writeFile(workbook, `rte_exemption_sheet_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Reports & Analytics</h2>
            {false && (
              <span className="flex items-center gap-1.5 bg-amber-50 text-[#F59E0B] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-100 animate-pulse">
                <Loader2 className="animate-spin h-3 w-3 text-[#F59E0B]" strokeWidth={3} />
                Loading...
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-400">Generate collections audits, class dues trackers, and government RTE reconcile statements</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'daily' && (
            <>
              <button
                onClick={exportDailyExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-emerald-100 transition-all active:scale-[0.98]"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => onPrintReport({ type: 'daily-collections', title: `Daily Collections Report - ${selectedDate}`, data: dailyReportData })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" />
                <span>Print PDF</span>
              </button>
            </>
          )}
          {activeTab === 'outstanding' && (
            <>
              <button
                onClick={exportOutstandingExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-emerald-100 transition-all active:scale-[0.98]"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => onPrintReport({ type: 'outstanding-dues', title: 'Outstanding Due Balance Report', data: outstandingReportData })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" />
                <span>Print PDF</span>
              </button>
            </>
          )}
          {activeTab === 'rte' && (
            <>
              <button
                onClick={exportRteExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-emerald-100 transition-all active:scale-[0.98]"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => onPrintReport({ type: 'rte-reconcile', title: 'RTE Quota Reconcile Sheet', data: rteReportData })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" />
                <span>Print PDF</span>
              </button>
            </>
          )}
          {activeTab === 'concessions' && (
            <>
              <button
                onClick={() => {}}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-emerald-100 transition-all active:scale-[0.98]"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 gap-6">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${activeTab === 'daily'
              ? 'border-amber-500 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Daily Collections</span>
        </button>
        <button
          onClick={() => setActiveTab('outstanding')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${activeTab === 'outstanding'
              ? 'border-amber-500 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          <Users className="h-4 w-4" />
          <span>Outstanding Dues</span>
        </button>
        <button
          onClick={() => setActiveTab('rte')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${activeTab === 'rte'
              ? 'border-amber-500 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          <Award className="h-4 w-4" />
          <span>RTE Reconcile</span>
        </button>
        <button
          onClick={() => setActiveTab('concessions')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-2 -mb-[2px] ${activeTab === 'concessions'
              ? 'border-amber-500 text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          <Award className="h-4 w-4" />
          <span>Concessions Given</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. DAILY COLLECTIONS TAB */}
      {/* ======================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Collections</span>
                <h3 className="text-xl font-bold text-slate-800">₹{dailyReportData.totalCollected.toLocaleString()}</h3>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-emerald-50 text-emerald-500 p-3 rounded-xl">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Net Cash Payments</span>
                <h3 className="text-xl font-bold text-slate-800">₹{Math.max(0, dailyReportData.netCashCollected).toLocaleString()}</h3>
                {dailyReportData.cashExpenses > 0 && (
                  <p className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
                    Exp: -₹{dailyReportData.cashExpenses.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-blue-50 text-blue-500 p-3 rounded-xl">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Online Transfers</span>
                <h3 className="text-xl font-bold text-slate-800">₹{dailyReportData.onlineCollected.toLocaleString()}</h3>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-purple-50 text-purple-500 p-3 rounded-xl">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Cheque Deposits</span>
                <h3 className="text-xl font-bold text-slate-800">₹{dailyReportData.chequeCollected.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search student or code..."
                  value={dailySearchQuery}
                  onChange={(e) => setDailySearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Student Info</th>
                    <th className="py-4 px-6">Fee Description</th>
                    <th className="py-4 px-6">Method</th>
                    <th className="py-4 px-6">Time</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {dailyReportData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                        No collections recorded on this date matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    dailyReportData.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{t.studentName}</div>
                          <div className="text-[10px] text-slate-450 font-semibold">{t.studentCode} | {t.classInfo}</div>
                        </td>
                        <td className="py-4 px-6 whitespace-pre-line text-slate-500 font-medium">{t.feeType}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.method?.toUpperCase() === 'CASH' ? 'bg-emerald-50 text-emerald-600' :
                              t.method?.toUpperCase() === 'ONLINE' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
                            {t.method}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-semibold">{t.time}</td>
                        <td className="py-4 px-6 text-right font-extrabold text-slate-800">₹{t.amount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. OUTSTANDING DUES TAB */}
      {/* ======================================================== */}
      {activeTab === 'outstanding' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-red-50 text-red-500 p-3 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Outstanding</span>
                <h3 className="text-xl font-bold text-slate-800">₹{outstandingReportData.totalOutstandingAmount.toLocaleString()}</h3>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 truncate">
                  Edu: ₹{outstandingReportData.totalEducationDue.toLocaleString()} | Trans: ₹{outstandingReportData.totalTransportDue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-slate-50 text-slate-500 p-3 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Students with Dues</span>
                <h3 className="text-xl font-bold text-slate-800">{outstandingReportData.studentCount} Students</h3>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Avg. Due Per Student</span>
                <h3 className="text-xl font-bold text-slate-800">
                  ₹{outstandingReportData.studentCount > 0
                    ? Math.round(outstandingReportData.totalOutstandingAmount / outstandingReportData.studentCount).toLocaleString()
                    : 0}
                </h3>
              </div>
            </div>
            {/* Visual Mini Chart */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center animate-fadeIn">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-2">Dues Aging (Overdue Months)</span>
              <div className="flex items-end gap-3 h-10">
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-amber-400 rounded-t-sm"
                    style={{
                      height: `${outstandingReportData.studentCount > 0 ? (outstandingReportData.oneDueCount / outstandingReportData.studentCount) * 100 : 0}%`,
                      minHeight: outstandingReportData.oneDueCount > 0 ? '4px' : '0px'
                    }}
                  ></div>
                  <span className="text-[8px] text-slate-400 font-bold mt-1">1M ({outstandingReportData.oneDueCount})</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-orange-400 rounded-t-sm"
                    style={{
                      height: `${outstandingReportData.studentCount > 0 ? (outstandingReportData.twoDueCount / outstandingReportData.studentCount) * 100 : 0}%`,
                      minHeight: outstandingReportData.twoDueCount > 0 ? '4px' : '0px'
                    }}
                  ></div>
                  <span className="text-[8px] text-slate-400 font-bold mt-1">2M ({outstandingReportData.twoDueCount})</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-red-400 rounded-t-sm"
                    style={{
                      height: `${outstandingReportData.studentCount > 0 ? (outstandingReportData.threePlusDueCount / outstandingReportData.studentCount) * 100 : 0}%`,
                      minHeight: outstandingReportData.threePlusDueCount > 0 ? '4px' : '0px'
                    }}
                  ></div>
                  <span className="text-[8px] text-slate-400 font-bold mt-1">3M+ ({outstandingReportData.threePlusDueCount})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search student name/code..."
                value={outstandingSearchQuery}
                onChange={(e) => setOutstandingSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={outstandingClassFilter}
                onChange={(e) => setOutstandingClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500 w-full sm:w-auto"
              >
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={outstandingMediumFilter}
                onChange={(e) => setOutstandingMediumFilter(e.target.value)}
                className="bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500 w-full sm:w-auto"
              >
                {mediums.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Student Info</th>
                    <th className="py-4 px-6">Parent Info</th>
                    <th className="py-4 px-6">Overdue Items</th>
                    <th className="py-4 px-6 text-right">Edu Dues</th>
                    <th className="py-4 px-6 text-right">Trans Dues</th>
                    <th className="py-4 px-6 text-right">Outstanding Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {outstandingReportData.students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                        No outstanding dues found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    outstandingReportData.students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{s.studentName}</div>
                          <div className="text-[10px] text-slate-450 font-semibold">{s.studentCode} | {s.classInfo}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-650">{s.parentName}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{s.parentMobile}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${s.overdueCount >= 3 ? 'bg-red-50 text-red-650' :
                              s.overdueCount === 2 ? 'bg-orange-50 text-orange-655' : 'bg-amber-50 text-amber-600'
                            }`}>
                            {s.overdueCount} Months Overdue
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-orange-500">₹{s.educationDue.toLocaleString()}</td>
                        <td className="py-4 px-6 text-right font-extrabold text-amber-500">₹{s.transportDue.toLocaleString()}</td>
                        <td className="py-4 px-6 text-right font-extrabold text-red-500">₹{s.totalDue.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RTE RECONCILE TAB */}
      {/* ======================================================== */}
      {activeTab === 'rte' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-indigo-50 text-indigo-500 p-3 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total RTE Enrolled</span>
                <h3 className="text-xl font-bold text-slate-800">{rteReportData.studentCount} Students</h3>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-emerald-50 text-emerald-500 p-3 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Exempted Tuition Fees</span>
                <h3 className="text-xl font-bold text-slate-800">₹{rteReportData.totalExemptedAmount.toLocaleString()}</h3>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search RTE student name/code..."
                value={rteSearchQuery}
                onChange={(e) => setRteSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="w-full sm:w-auto">
              <select
                value={rteClassFilter}
                onChange={(e) => setRteClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500 w-full"
              >
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Student Info</th>
                    <th className="py-4 px-6">Parent Info</th>
                    <th className="py-4 px-6">Exemption Status</th>
                    <th className="py-4 px-6 text-right">Total Exempted Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {rteReportData.students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                        No RTE students found matching the filter.
                      </td>
                    </tr>
                  ) : (
                    rteReportData.students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{s.studentName}</div>
                          <div className="text-[10px] text-slate-450 font-semibold">{s.studentCode} | {s.classInfo}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-655">{s.parentName}</div>
                          <div className="text-[10px] text-slate-400 font-bold">{s.parentMobile}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-650">
                            100% RTE Exempted
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-extrabold text-indigo-600">₹{s.exemptedAmount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* 4. CONCESSIONS TAB */}
      {/* ======================================================== */}
      {activeTab === 'concessions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-purple-50 text-purple-500 p-3 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Concessions Given</span>
                <h3 className="text-xl font-bold text-slate-800">₹{concessionsReportData.totalConcessionGiven.toLocaleString()}</h3>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4 animate-fadeIn">
              <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Students</span>
                <h3 className="text-xl font-bold text-slate-800">{concessionsReportData.transactions.length} Students</h3>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search student or code..."
                  value={dailySearchQuery}
                  onChange={(e) => setDailySearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-150 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Student Info</th>
                    <th className="py-4 px-6">Fee Description</th>
                    <th className="py-4 px-6 text-right">Concession Amt</th>
                    <th className="py-4 px-6 text-center">Time</th>
                    <th className="py-4 px-6">Given By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {concessionsReportData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                        No concessions recorded on this date matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    concessionsReportData.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-bold text-slate-800 mb-0.5 whitespace-nowrap">{t.studentName}</div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                              {t.studentCode}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                              {t.classInfo}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md whitespace-nowrap">
                            {t.feeType.split('\n').map((ft: string, i: number) => (
                              <React.Fragment key={i}>
                                {ft}
                                {i < t.feeType.split('\n').length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-purple-600 whitespace-nowrap">
                          ₹{t.concessionAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="text-slate-500 font-medium whitespace-nowrap">{t.time}</span>
                        </td>
                        <td className="py-3 px-6">
                          <span className="text-slate-500 font-medium whitespace-nowrap">
                            {getCashierName(t.performedBy)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
