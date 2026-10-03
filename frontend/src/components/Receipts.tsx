import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import type { PaymentTransaction } from '../mockData';
import {
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Printer,
  Calendar,
  Loader2
} from 'lucide-react';
import { formatTransactions } from '../utils/transactionHelpers';
import { getActiveStandards } from '../utils/standardUtils';

interface ReceiptsProps {
  onPrint: (tx: PaymentTransaction) => void;
}

export const Receipts: React.FC<ReceiptsProps> = ({ onPrint }) => {
  const { reversePayment, feeStructures, academicYears, students, transactions: globalTransactions, isLoadingDetails } = useApp();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  // Format transactions whenever raw data or students change
  useEffect(() => {
    if (globalTransactions.length > 0 && students.length > 0) {
      setTransactions(formatTransactions(globalTransactions, students));
    } else {
      setTransactions([]);
    }
  }, [globalTransactions, students]);

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
  
  // Search state
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [dateFilterMode, setDateFilterMode] = useState<'All' | 'Today' | 'Custom'>('All');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [classFilter, setClassFilter] = useState('All Classes');
  const [mediumFilter, setMediumFilter] = useState('All Mediums');
  const [academicYearFilter, setAcademicYearFilter] = useState('All Years');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState<string | null>(null);
  const [showReceiptNumbers, setShowReceiptNumbers] = useState(false);
  const [showOnlyPaid, setShowOnlyPaid] = useState(false);


  // Debounce search query by 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, methodFilter, dateFilterMode, customDate, classFilter, mediumFilter, showOnlyPaid]);

  const todayString = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Filtered transactions computation
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (tx.studentName ?? '').toLowerCase().includes(q);
        const matchesCode = (tx.studentCode ?? '').toLowerCase().includes(q);
        const matchesFeeType = (tx.feeType ?? '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesFeeType) return false;
      }

      // 2. Date Filter
      if (dateFilterMode === 'Today') {
        if (tx.date !== todayString) return false;
      } else if (dateFilterMode === 'Custom') {
        if (tx.date !== customDate) return false;
      }

      // 3. Method Filter
      if (methodFilter !== 'All Methods') {
        if (methodFilter === 'ONLINE') {
          if (tx.method !== 'ONLINE' && tx.method !== 'UPI') return false;
        } else {
          if (tx.method !== methodFilter) return false;
        }
      }

      // 4. Class Filter (Standard)
      if (classFilter !== 'All Classes') {
        const stdNum = classFilter.replace('Class ', '');
        const matchesClass = new RegExp(`(^|\\b|\\s)${stdNum}(\\b|\\s|-)`).test(tx.classInfo);
        if (!matchesClass) return false;
      }

      // 5. Medium Filter
      if (mediumFilter !== 'All Mediums') {
        const med = mediumFilter.replace(' Medium', '');
        if (!tx.classInfo.toLowerCase().includes(med.toLowerCase())) return false;
      }

      // 6. Academic Year Filter
      if (academicYearFilter !== 'All Years') {
        if (tx.academicYear !== academicYearFilter) return false;
      }

      // 7. Status Filter (Only Paid)
      if (showOnlyPaid && tx.status !== 'PAID') {
        return false;
      }

      return true;
    });
  }, [transactions, searchQuery, dateFilterMode, customDate, methodFilter, classFilter, mediumFilter, academicYearFilter, todayString, showOnlyPaid]);

  // Paginated transactions computation
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);

  return (
    <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-7xl mx-auto animate-fade-in w-full">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Receipt Center</h2>
          <p className="text-xs font-semibold text-slate-400">
            Manage transaction histories, view line items, print receipts, or trigger reversals.
          </p>
        </div>
      </header>

        {isLoadingDetails ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-semibold">Loading receipts...</p>
        </div>
      ) : (
        <>

      {/* Control panel (Search & Filters) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-center">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search student code, name or fee type..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>

          {/* Date Mode Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value as any)}
              className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-650 focus:outline-none transition-all shadow-sm cursor-pointer"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today Only</option>
              <option value="Custom">Pick Date</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Custom Date Selector (Shows only if Custom is selected) */}
          {dateFilterMode === 'Custom' ? (
            <div className="md:col-span-2 relative animate-fade-in">
              <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-2.5 text-xs font-bold text-slate-700 focus:outline-none transition-all shadow-sm cursor-pointer"
              />
            </div>
          ) : (
            <div className="md:col-span-2 hidden md:block"></div>
          )}

          {/* Method Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-655 focus:outline-none transition-all shadow-sm cursor-pointer"
            >
              <option value="All Methods">All Methods</option>
              <option value="CASH">CASH</option>
              <option value="ONLINE">ONLINE / UPI</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="CARD">CARD</option>
              <option value="NET BANKING">NET BANKING</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Academic Year Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-655 focus:outline-none transition-all shadow-sm cursor-pointer"
            >
              <option value="All Years">All Years</option>
              {academicYears.map((yr) => (
                <option key={yr.name} value={yr.name}>{yr.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Class Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-655 focus:outline-none transition-all shadow-sm cursor-pointer"
            >
              <option value="All Classes">All Classes</option>
              {dynamicStandards.map((std) => (
                <option key={std} value={`Class ${std}`}>{isNaN(Number(std)) ? std : `Std ${std}`}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Medium Filter */}
          <div className="md:col-span-2 relative">
            <select
              value={mediumFilter}
              onChange={(e) => setMediumFilter(e.target.value)}
              className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-655 focus:outline-none transition-all shadow-sm cursor-pointer"
            >
              <option value="All Mediums">All Mediums</option>
              {dynamicMediums.map((med) => (
                <option key={med} value={`${med} Medium`}>{med}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Toggle Receipt Numbers Button */}
          <div className="md:col-span-2 flex items-center">
            <button
              onClick={() => setShowReceiptNumbers(!showReceiptNumbers)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                showReceiptNumbers
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50'
              }`}
            >
              {showReceiptNumbers ? 'Hide Receipt No.' : 'See Receipt No.'}
            </button>
          </div>

          {/* Toggle Only Paid Button */}
          <div className="md:col-span-2 flex items-center">
            <button
              onClick={() => setShowOnlyPaid(!showOnlyPaid)}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                showOnlyPaid
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50'
              }`}
            >
              {showOnlyPaid ? 'Show All' : 'Only Paid'}
            </button>
          </div>
        </div>
      </div>

      {/* Receipts Table Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs font-extrabold uppercase bg-slate-50/50 tracking-wider">
                <th className="py-3.5 px-5 w-[10px]"></th>
                <th className="py-3.5 px-5">Student Profile</th>
                <th className="py-3.5 px-5">Fee Details Summary</th>
                <th className="py-3.5 px-5">Paid Amount</th>
                <th className="py-3.5 px-5">Method</th>
                <th className="py-3.5 px-5">Date & Time</th>
                <th className="py-3.5 px-5 text-center">{showReceiptNumbers ? 'Receipt No.' : 'Action'}</th>
                <th className="py-3.5 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-750">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-slate-400 font-medium">
                    No transactions recorded matching selection criteria.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => {
                  const isExpanded = expandedTxId === t.id;
                  const initials = (t.studentName ?? '')
                    .split(' ')
                    .map((n) => n[0])
                    .join('');

                  return (
                    <React.Fragment key={t.id}>
                      <tr className={`hover:bg-slate-50/30 transition-colors ${isExpanded ? 'bg-indigo-50/10' : ''}`}>
                        <td className="py-4 px-5">
                          <button
                            onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                            className="p-1 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-550" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-550" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-5 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-650 font-bold text-xs flex items-center justify-center uppercase border border-indigo-100">
                            {initials}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 flex items-center gap-2">
                              {t.studentName}
                              {t.isDeleted && (
                                <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wider font-bold">
                                  Deleted
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono font-medium">{t.studentCode} · {t.classInfo}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="text-slate-550 font-semibold text-xs max-w-[200px] truncate" title={t.feeType}>
                            {t.feeType.split('\n').join(', ')}
                          </div>
                        </td>
                        <td className="py-4 px-5 font-extrabold text-slate-800">
                          {t.amount < 0 ? (
                            <span className="text-red-500">-₹{Math.abs(t.amount).toLocaleString('en-IN')}</span>
                          ) : (
                            <span>₹{t.amount.toLocaleString('en-IN')}</span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                            t.method === 'ONLINE' || t.method === 'UPI'
                              ? 'bg-blue-50 text-blue-655 border-blue-100'
                              : t.method === 'CASH'
                              ? 'bg-slate-50 text-slate-600 border-slate-200/60'
                              : t.method === 'CARD'
                              ? 'bg-indigo-50 text-indigo-655 border-indigo-105'
                              : 'bg-purple-50 text-purple-655 border-purple-105'
                          }`}>
                            {t.method}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-400 text-xs font-semibold">
                          <span className="block">{t.date}</span>
                          <span className="block text-[10px] text-slate-400/80 mt-0.5">{t.time}</span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          {showReceiptNumbers ? (
                            <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                              {t.receiptNumber 
                                 ? `#${t.receiptNumber}` 
                                 : `#${(t.id?.slice(-12).toUpperCase() || 'N/A')}`}
                            </span>
                          ) : (
                            <button
                              onClick={() => onPrint(t)}
                              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all active:scale-[0.98]"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Print
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            t.status === 'REVERSED'
                              ? 'bg-red-50 text-red-500 border-red-100'
                              : t.status === 'PARTIALLY_REVERSED'
                              ? 'bg-amber-50 text-amber-500 border-amber-100'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable items section */}
                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={8} className="py-4 px-8 border-t border-b border-slate-100">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <span>Receipt Line Items</span>
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                  {(t.subItems || []).length} item{(t.subItems || []).length !== 1 ? 's' : ''}
                                </span>
                              </h4>
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                    <th className="py-2 px-3">Fee Type Details</th>
                                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                                    <th className="py-2 px-3 text-right">Concession (₹)</th>
                                    <th className="py-2 px-3 text-center">Method</th>
                                    <th className="py-2 px-3 text-center">Status</th>
                                    <th className="py-2 px-3 text-right">Reversal Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                  {(t.subItems || []).map((sub: any) => (
                                    <tr key={sub.id} className="hover:bg-slate-50/30 transition-colors">
                                      <td className="py-3 px-3 font-bold text-slate-800">{sub.description}</td>
                                      <td className="py-3 px-3 text-right font-extrabold text-slate-800">₹{sub.amount.toLocaleString('en-IN')}</td>
                                      <td className="py-3 px-3 text-right font-semibold text-purple-650">₹{(sub.concessionAmount || 0).toLocaleString('en-IN')}</td>
                                      <td className="py-3 px-3 text-center">
                                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200/50 uppercase">
                                          {sub.method}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                          sub.status === 'REVERSED'
                                            ? 'bg-red-50 text-red-500 border-red-100'
                                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                          {sub.status}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {sub.status !== 'REVERSED' && sub.method !== 'GOVT' ? (
                                          <button
                                            onClick={async () => {
                                              if (window.confirm(`Are you sure you want to reverse payment of ₹${sub.amount.toLocaleString('en-IN')} for ${sub.description}? This will restore the balance back to the ledger.`)) {
                                                setIsReversing(sub.id);
                                                await reversePayment(sub.id);
                                                setIsReversing(null);
                                              }
                                            }}
                                            disabled={isReversing === sub.id}
                                            className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg text-[9px] tracking-wide transition-all shadow-sm active:scale-[0.98] ${
                                              isReversing === sub.id
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                                : 'text-red-500 hover:text-red-750 hover:bg-red-50 border border-red-200/50 hover:border-red-300'
                                            }`}
                                          >
                                            <RotateCcw className={`h-2.5 w-2.5 ${isReversing === sub.id ? 'animate-spin' : ''}`} />
                                            {isReversing === sub.id ? 'Reversing...' : 'Reverse Item'}
                                          </button>
                                        ) : (
                                          <span className="text-slate-350 text-[9px] italic pr-2 font-medium">Not reversible</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border-t border-slate-100 p-4">
            <span className="text-xs font-semibold text-slate-500">
              Showing <span className="font-extrabold text-slate-800">{Math.min(filteredTransactions.length, (currentPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
              <span className="font-extrabold text-slate-800">{Math.min(filteredTransactions.length, currentPage * PAGE_SIZE)}</span> of{' '}
              <span className="font-extrabold text-slate-800">{filteredTransactions.length}</span> receipts
            </span>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
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
                            ? 'bg-indigo-600 border border-indigo-600 text-white shadow-md shadow-indigo-500/10'
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
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};
