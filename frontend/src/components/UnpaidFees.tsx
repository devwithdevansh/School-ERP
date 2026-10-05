import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import { isLedgerPending, isPeriodOverdue } from '../utils';
import * as XLSX from 'xlsx';
import { getActiveStandards } from '../utils/standardUtils';

import {
  Search,
  ChevronDown,
  FileSpreadsheet,
  MessageSquare,
  CheckSquare,
  Square,
  Bus
} from './icons';

export const UnpaidFees: React.FC = () => {
  const { students, unpaidData, feeStructures, academicYears, setScreen, setSelectedStudentIdForFee } = useApp();
  
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
  // Local input search state (instant typing response)
  const [searchVal, setSearchVal] = useState('');
  // Debounced search query state (throttles filter processing)
  const [searchQuery, setSearchQuery] = useState('');
  
  const [dueFilter, setDueFilter] = useState<'ALL' | '1_DUE' | '2_DUE' | '3_DUE'>('ALL');
  
  // Selection states for WhatsApp bulk sending
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Class filters dropdown state
  const [stdFilter, setStdFilter] = useState('All Standards');
  const [divFilter, setDivFilter] = useState('All Divisions');
  const [mediumFilter, setMediumFilter] = useState('All Mediums');
  const [zoneFilter, setZoneFilter] = useState('All Zones');

  // Pagination states (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Debounce search query updates by 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Reset pagination page on filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dueFilter, stdFilter, divFilter, mediumFilter, zoneFilter, searchQuery]);
  // Combine fetched unpaid data with global students for UI filters
  const mappedUnpaidStudents = useMemo(() => {
    return unpaidData.map(reportItem => {
      const globalStudent = students.find(s => s._id === reportItem._id || s.id === reportItem._id);
      
      const overdueLedgers = reportItem.pendingLedgers.filter((l: any) => 
        isLedgerPending(l) && isPeriodOverdue(l.feePeriod, l.academicYear, activeYearName)
      );
      
      const uniquePeriods = new Set(
        overdueLedgers
          .filter((l: any) => l.feePeriod !== 'One-time')
          .map((l: any) => `${l.academicYear || activeYearName}_${l.feePeriod}`)
      );
      const dueCount = uniquePeriods.size;
      
      let status = 'PAID';
      if (globalStudent?.isRTE) status = 'RTE';
      else if (dueCount === 0 && overdueLedgers.length > 0) status = '1 DUE'; // only One-time
      else if (dueCount === 1) status = '1 DUE';
      else if (dueCount === 2) status = '2 DUE';
      else if (dueCount >= 3) status = '3+ DUE';

      let lastPaidMonth = 'Never';
      if (reportItem.lastPaidDate) {
        lastPaidMonth = new Date(reportItem.lastPaidDate).toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }

      return {
        ...globalStudent,
        ...reportItem,
        id: reportItem._id,
        studentName: globalStudent?.studentName || reportItem?.studentName || 'UNKNOWN',
        parentName: globalStudent?.parentName || '',
        parentMobile: globalStudent?.parentMobile || '',
        status,
        outstanding: reportItem.totalPendingAmount,
        lastPaidMonth
      };
    });
  }, [unpaidData, students, activeYearName]);

  // Dynamic counts based on mapped students
  const counts = useMemo(() => {
    const unpaid = mappedUnpaidStudents.filter((s) => s.status !== 'PAID' && s.status !== 'RTE');
    return {
      all: unpaid.length,
      oneMonth: unpaid.filter(s => s.status === '1 DUE').length,
      twoMonths: unpaid.filter(s => s.status === '2 DUE').length,
      threeMonths: unpaid.filter(s => s.status === '3+ DUE').length,
    };
  }, [mappedUnpaidStudents]);
  // Map students to overdue profiles matching the wireframe rows
  const unpaidStudents = useMemo(() => {
    return mappedUnpaidStudents.filter((s) => {
      // Exclude paid and RTE students
      if (s.status === 'PAID' || s.status === 'RTE') return false;

      // Filter by tab selection
      if (dueFilter === '1_DUE' && s.status !== '1 DUE') return false;
      if (dueFilter === '2_DUE' && s.status !== '2 DUE') return false;
      if (dueFilter === '3_DUE' && s.status !== '3+ DUE') return false;

      // Filter by dropdown selectors
      if (stdFilter !== 'All Standards' && s.standard !== stdFilter.replace('Class ', '')) return false;
      if (divFilter !== 'All Divisions' && s.division !== divFilter.replace('Division ', '')) return false;
      if (mediumFilter !== 'All Mediums' && s.medium !== mediumFilter.split(' ')[0]) return false;
      if (zoneFilter !== 'All Zones') {
        if (zoneFilter === 'None' && s.transportType !== 'None') return false;
        if (zoneFilter !== 'None' && s.transportType !== zoneFilter) return false;
      }

      // Filter by Search Query — search name, code, or parent mobile
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (s.studentName ?? '').toLowerCase().includes(q);
        const matchCode = (s.studentCode ?? '').toLowerCase().includes(q);
        const matchMobile = (s.parentMobile ?? '').toLowerCase().includes(q);
        return matchName || matchCode || matchMobile;
      }

      return true;
    });
  }, [mappedUnpaidStudents, dueFilter, stdFilter, divFilter, mediumFilter, zoneFilter, searchQuery]);

  const getOutstandingAmount = (studentId: string) => {
    const s = mappedUnpaidStudents.find((ms) => ms.id === studentId);
    return s?.outstanding || 0;
  };

  // Helper: get a stable student ID
  const getSid = (s: any) => s.id || s._id;

  const getLastPaidMonth = (studentId: string) => {
    const s = mappedUnpaidStudents.find((ms) => ms.id === studentId);
    return s?.lastPaidMonth || 'Never';
  };

  // Slice list for pagination
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return unpaidStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [unpaidStudents, currentPage]);

  const totalPages = Math.ceil(unpaidStudents.length / PAGE_SIZE);

  const handleSelectAll = () => {
    const pageStudentIds = paginatedStudents.map(s => getSid(s)!);
    const allPageSelected = pageStudentIds.every(id => selectedStudentIds.includes(id));
    
    if (allPageSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !pageStudentIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => {
        const next = [...prev];
        pageStudentIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleSelectRow = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds((prev) => [...prev, studentId]);
    }
  };

  const handleExportExcel = () => {
    if (unpaidStudents.length === 0) return;

    const yearsSet = new Set<string>();
    
    unpaidStudents.forEach(s => {
      if (s.pendingLedgers) {
        s.pendingLedgers.forEach((l: any) => {
          if (isLedgerPending(l) && isPeriodOverdue(l.feePeriod, l.academicYear, activeYearName)) {
            const remaining = l.remainingAmount ?? ((l.totalAmount || 0) - (l.paidAmount || 0) - (l.concessionAmount || 0));
            if (remaining > 0 && l.academicYear) {
              yearsSet.add(l.academicYear);
            }
          }
        });
      }
    });
    
    const exportYears = Array.from(yearsSet).sort();
    if (exportYears.length === 0) {
      if (activeYearName) exportYears.push(activeYearName);
    }

    // 2. Build the title row (matching standard/medium filter + current date + monthly rate)
    let classPart = 'ALL CLASSES';
    if (stdFilter !== 'All Standards') {
      const stdNum = stdFilter.replace('Class ', '').trim();
      classPart = `${stdNum}TH`.toUpperCase();
      const numMatch = stdNum.match(/^\d+/);
      if (numMatch) {
        classPart = `${numMatch[0]}TH`.toUpperCase();
      }
      if (divFilter !== 'All Divisions') {
        const divPart = divFilter.replace('Division ', '').trim();
        classPart += ` DIV ${divPart}`;
      }
    }
    
    let mediumPart = '';
    if (mediumFilter !== 'All Mediums') {
      mediumPart = mediumFilter.toLowerCase().includes('english') ? 'EM' : 'GM';
    }

    const todayStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.'); // DD.MM.YYYY

    // Lookup monthly education fee if a single class and medium is filtered
    let feePart = '';
    if (stdFilter !== 'All Standards' && mediumFilter !== 'All Mediums') {
      const stdNum = stdFilter.replace('Class ', '').trim();
      const medName = mediumFilter.replace(' Medium', '');
      const isDefaultYear = activeYearName === academicYears[0]?.name;
      const fs = feeStructures.find(f => f.standard === stdNum && f.medium === medName && (f.academicYear === activeYearName || (!f.academicYear && isDefaultYear)));
      if (fs) {
        const annualFee = fs.annualFee || 0;
        const totalParts = (fs.educationPartCount || 12) + (fs.termPartCount || 2);
        const monthlyVal = totalParts > 0 ? Math.round(annualFee / totalParts) : 0;
        if (monthlyVal > 0) {
          feePart = ` (RS.${monthlyVal})`;
        }
      }
    }

    const titleText = `${classPart} ${mediumPart} ${todayStr}${feePart}`.replace(/\s+/g, ' ').trim();

    // 3. Header Rows Setup
    const headers = ['NAME', 'PARENTS NUMBER', 'STANDARD', 'DIVISION', 'MEDIUM'];
    exportYears.forEach(year => {
      headers.push(`YEAR ${year}`);
      headers.push(year);
    });
    headers.push('TOTAL');

    const rows: any[][] = [];
    rows.push([titleText]);
    rows.push([]); // blank spacing row
    rows.push(headers);

    // Standard sequence list for unpaid month sorting
    const periodSeq = [
      'Term 1', 'June', 'July', 'August', 'September', 'October', 'November', 
      'Term 2', 'December', 'January', 'February', 'March', 'April', 'May'
    ];
    const getPeriodIdx = (p: string) => periodSeq.indexOf(p);
    
    const getPeriodLabel = (p: string) => {
      if (p === 'Term 1') return 'TERM-1';
      if (p === 'Term 2') return 'TERM-2';
      return p.substring(0, 3).toUpperCase();
    };

    const getUnpaidPeriodString = (student: any, year: string) => {
      if (!student.pendingLedgers) return '';
      const studentLedgers = student.pendingLedgers.filter((l: any) => 
        l.academicYear === year && 
        isLedgerPending(l) &&
        isPeriodOverdue(l.feePeriod, l.academicYear, activeYearName) &&
        (l.remainingAmount ?? ((l.totalAmount || 0) - (l.paidAmount || 0) - (l.concessionAmount || 0))) > 0
      );

      if (studentLedgers.length === 0) return '';
      
      const standardLedgers = studentLedgers.filter((l: any) => periodSeq.includes(l.feePeriod));
      if (standardLedgers.length === 0) {
        return studentLedgers[0].feePeriod;
      }

      const indices = standardLedgers.map((l: any) => getPeriodIdx(l.feePeriod)).filter((idx: number) => idx !== -1);
      if (indices.length === 0) return '';

      const minIdx = Math.min(...indices);
      const maxIdx = Math.max(...indices);

      if (minIdx === maxIdx) {
        return getPeriodLabel(periodSeq[minIdx]);
      }
      return `${getPeriodLabel(periodSeq[minIdx])} TO ${getPeriodLabel(periodSeq[maxIdx])}`;
    };

    const getUnpaidAmountForYear = (student: any, year: string) => {
      if (!student.pendingLedgers) return 0;
      return student.pendingLedgers
        .filter((l: any) => l.academicYear === year && isLedgerPending(l) && isPeriodOverdue(l.feePeriod, l.academicYear, activeYearName))
        .reduce((sum: number, l: any) => sum + Math.max(0, l.remainingAmount ?? ((l.totalAmount || 0) - (l.paidAmount || 0) - (l.concessionAmount || 0))), 0);
    };

    // 4. Fill Student Row Data
    let grandTotal = 0;
    const yearTotals = new Map<string, number>();
    exportYears.forEach(y => yearTotals.set(y, 0));

    unpaidStudents.forEach(s => {
      const rowData: any[] = [
        (s.studentName || '').toUpperCase(), 
        s.parentMobile || '', 
        (s.standard || '').toUpperCase(),
        (s.division || '').toUpperCase(),
        (s.medium || '').toUpperCase()
      ];
      
      let studentTotal = 0;
      exportYears.forEach(year => {
        const periodStr = getUnpaidPeriodString(s, year);
        const amount = getUnpaidAmountForYear(s, year);
        
        rowData.push(periodStr);
        rowData.push(amount > 0 ? amount : '');
        
        studentTotal += amount;
        yearTotals.set(year, (yearTotals.get(year) || 0) + amount);
      });
      
      rowData.push(studentTotal);
      grandTotal += studentTotal;
      rows.push(rowData);
    });

    // 5. Fill Grand Total Sum Row
    const totalRow: any[] = ['GRAND TOTAL', '', '', '', ''];
    exportYears.forEach(year => {
      totalRow.push('');
      totalRow.push(yearTotals.get(year) || 0);
    });
    totalRow.push(grandTotal);
    rows.push(totalRow);

    // 6. Write sheet file
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Unpaid Fees');

    // Merge title row
    const totalCols = headers.length;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }
    ];

    // Format widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 18 }, // Parents Number
      { wch: 12 }, // Medium
    ];
    for (let i = 0; i < academicYears.length; i++) {
      ws['!cols'].push({ wch: 15 }); // Year Period label
      ws['!cols'].push({ wch: 12 }); // Year Amount value
    }
    ws['!cols'].push({ wch: 15 }); // Total

    const fileName = `${titleText.replace(/[^a-zA-Z0-9.\-\(\)]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleCollectClick = (studentId?: string) => {
    if (studentId) {
      setSelectedStudentIdForFee(studentId);
    }
    // Set screen to collect-fee
    setScreen('collect-fee');
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Unpaid Fees</h2>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Track and manage outstanding student dues
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search student name..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full md:w-64 bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => handleCollectClick()}
            className="flex items-center gap-1.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-[0.98] text-sm shrink-0"
          >
            Collect Fee
          </button>
        </div>
      </header>

      {/* Filter Tabs & Quick Action Buttons */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-100 pb-4">
        {/* Due Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDueFilter('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              dueFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white border border-slate-100 hover:bg-slate-50 text-slate-500'
            }`}
          >
            All <span className="opacity-85 font-semibold ml-1">{counts.all}</span>
          </button>
          <button
            onClick={() => setDueFilter('1_DUE')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              dueFilter === '1_DUE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white border border-slate-100 hover:bg-slate-50 text-slate-500'
            }`}
          >
            1 Month Due <span className="opacity-85 font-semibold ml-1">{counts.oneMonth}</span>
          </button>
          <button
            onClick={() => setDueFilter('2_DUE')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              dueFilter === '2_DUE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white border border-slate-100 hover:bg-slate-50 text-slate-500'
            }`}
          >
            2 Months Due <span className="opacity-85 font-semibold ml-1">{counts.twoMonths}</span>
          </button>
          <button
            onClick={() => setDueFilter('3_DUE')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              dueFilter === '3_DUE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white border border-slate-100 hover:bg-slate-50 text-slate-500'
            }`}
          >
            3+ Months Due <span className="opacity-85 font-semibold ml-1">{counts.threeMonths}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:self-auto">
          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Standard Selector */}
            <div className="relative">
              <select
                value={stdFilter}
                onChange={(e) => setStdFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 focus:outline-none hover:border-slate-300 shadow-sm"
              >
                <option value="All Standards">All Standards</option>
                {dynamicStandards.map((cls) => (
                  <option key={cls} value={`Class ${cls}`}>{isNaN(Number(cls)) ? cls : `Std ${cls}`}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Division Selector */}
            <div className="relative">
              <select
                value={divFilter}
                onChange={(e) => setDivFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 focus:outline-none hover:border-slate-300 shadow-sm"
              >
                <option value="All Divisions">All Divisions</option>
                <option value="Division A">Division A</option>
                <option value="Division B">Division B</option>
                <option value="Division C">Division C</option>
                <option value="Division D">Division D</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Medium */}
            <div className="relative">
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 focus:outline-none hover:border-slate-300 shadow-sm"
              >
                <option value="All Mediums">All Mediums</option>
                {dynamicMediums.map((med) => (
                  <option key={med} value={`${med} Medium`}>{med}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Zones / Transport */}
            <div className="relative">
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 focus:outline-none hover:border-slate-300 shadow-sm"
              >
                <option value="All Zones">All Zones</option>
                {Array.from(new Set(students.map((s: any) => s.transportType).filter((t: any) => t && t !== 'None'))).sort().map((zone: any) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
                <option value="None">No Transport</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={unpaidStudents.length === 0}
            className="flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export Excel
          </button>
          <button
            disabled
            className="flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs transition-all bg-slate-200 text-slate-400 cursor-not-allowed shadow-none opacity-70"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Send WhatsApp (WIP)
          </button>
        </div>
      </div>

      {/* Main Student Overdue Table Grid */}
      <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase bg-slate-50/50">
                <th className="py-3.5 px-4 w-12 text-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-600 transition-colors">
                    {paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(getSid(s)!)) ? (
                      <CheckSquare className="h-4 w-4 text-blue-600 fill-blue-50/20" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Months Overdue</th>
                <th className="py-3.5 px-4">Outstanding</th>
                <th className="py-3.5 px-4">Last Paid</th>
                <th className="py-3.5 px-4">Transport</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No overdue students match the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const sId = getSid(s);
                  const isChecked = selectedStudentIds.includes(sId!);
                  const isThreePlus = s.status === '3+ DUE';
                  const isTwo = s.status === '2 DUE';

                  let badgeColor = 'bg-yellow-50 text-yellow-600 border border-yellow-100';
                  if (isThreePlus) badgeColor = 'bg-red-50 text-red-600 border border-red-100';
                  else if (isTwo) badgeColor = 'bg-amber-50 text-amber-600 border border-amber-100';

                  return (
                    <tr key={sId} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-4 text-center">
                        <button onClick={() => handleSelectRow(sId!)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 fill-blue-50/20" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 block">{s.studentName}</span>
                        <span className="text-slate-400 text-[10px] block font-semibold mt-0.5">
                          Parent: {s.parentMobile}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-semibold">
                        {s.standard} - {s.division} - {s.medium}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {s.status === '3+ DUE' ? '3+ MONTHS' : s.status === '2 DUE' ? '2 MONTHS' : '1 MONTH'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-800">
                        ₹{getOutstandingAmount(sId!).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs font-semibold">
                        {getLastPaidMonth(sId!)}
                      </td>
                      <td className="py-4 px-4">
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                            s.transportType !== 'None' 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200/50' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                          }`}
                        >
                          <Bus className="h-3 w-3" />
                          {s.transportType === 'None' ? 'NONE' : s.transportType.toUpperCase()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleCollectClick(sId!)}
                          className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-4 py-1.5 rounded-xl text-xs shadow-sm active:scale-95 transition-all"
                        >
                          Collect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">
            Showing <span className="font-extrabold text-slate-800">{Math.min(unpaidStudents.length, (currentPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
            <span className="font-extrabold text-slate-800">{Math.min(unpaidStudents.length, currentPage * PAGE_SIZE)}</span> of{' '}
            <span className="font-extrabold text-slate-850">{unpaidStudents.length}</span> students
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
              })
              .map((page, index, arr) => {
                const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="text-slate-400 px-1 text-xs">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        currentPage === page
                          ? 'bg-blue-600 border border-blue-600 text-white shadow-md shadow-blue-500/10'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
