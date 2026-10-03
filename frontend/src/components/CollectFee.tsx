import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import type { Student, PaymentTransaction } from '../mockData';
import { isPeriodOverdue } from '../utils';
import { Plus, Check, X, Loader2 } from 'lucide-react';
import { buildEduTermConfig, STANDARD_MONTH_PERIODS } from './CollectFee/utils';
import { PaymentHistoryPanel } from './CollectFee/PaymentHistoryPanel';
import type { TxItem } from './CollectFee/PaymentHistoryPanel';
import { StudentSidebar } from './CollectFee/StudentSidebar';
import { FeeGrid } from './CollectFee/FeeGrid';
import { PaymentSummaryTable } from './CollectFee/PaymentSummaryTable';
import type { LineItemConfig } from './CollectFee/PaymentSummaryTable';
import { formatTransactions } from '../utils/transactionHelpers';

export const CollectFee: React.FC = () => {
  const {
    activeStudents,
    recordPayment,
    feeStructures,
    transportFeeStructures,
    academicYears,
    regenerateLedgers,
    addCustomFee,
    selectedStudentIdForFee,
    setSelectedStudentIdForFee,
    reversePayment,
    authFetch
  } = useApp();

  // Academic year helpers
  const activeYear = academicYears.find(y => y.isActive);
  const activeYearName = activeYear?.name || '';
  const sortedYears = [...academicYears].sort((a, b) => b.name.localeCompare(a.name));

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(activeYearName);

  const [feeCategory, setFeeCategory] = useState<'EDUCATION' | 'TRANSPORT' | 'ADMISSION' | 'BAG_KIT' | 'OTHER'>('EDUCATION');
  const [selectedFees, setSelectedFees] = useState<{ category: string; period: string }[]>([]);
  const [lineItems, setLineItems] = useState<Record<string, LineItemConfig>>({});

  const [chequeNo, setChequeNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [autoSyncSignature, setAutoSyncSignature] = useState<string>('');

  // Custom Fee Modal
  const [isCustomFeeModalOpen, setIsCustomFeeModalOpen] = useState(false);
  const [customFeeName, setCustomFeeName] = useState('');
  const [customFeeAmount, setCustomFeeAmount] = useState('');
  const [isSubmittingCustomFee, setIsSubmittingCustomFee] = useState(false);

  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Sync selectedYear when academicYears loads
  useEffect(() => {
    if (activeYearName && !selectedYear) setSelectedYear(activeYearName);
  }, [activeYearName]);

  // Handle student pre-selection if redirected from Students page
  useEffect(() => {
    if (selectedStudentIdForFee && activeStudents.length > 0) {
      const found = activeStudents.find(s => s._id === selectedStudentIdForFee || s.id === selectedStudentIdForFee);
      if (found) {
        setSelectedStudent(found);
        setSearchQuery(found.studentCode || found.studentName);
        setSelectedYear(activeYearName);
        setSelectedStudentIdForFee(null);
      }
    }
  }, [activeStudents, selectedStudentIdForFee, setSelectedStudentIdForFee, activeYearName]);

  // Sync selected student when activeStudents list is refreshed
  useEffect(() => {
    if (selectedStudent && activeStudents.length > 0) {
      const updated = activeStudents.find(s => s._id === selectedStudent._id || s.id === selectedStudent.id);
      if (updated) setSelectedStudent(updated);
    }
  }, [activeStudents]);

  // Fetch ledgers and transactions when selectedStudent changes
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!selectedStudent) return;
      const sId = selectedStudent._id || selectedStudent.id;
      try {
        const [ledgersRes, txRes] = await Promise.all([
          authFetch(`/api/v1/ledgers?studentId=${sId}&limit=100`),
          authFetch(`/api/v1/payments?studentId=${sId}&limit=100`)
        ]);
        const ledgersData = await ledgersRes.json();
        setLedgerEntries(ledgersData.data || []);
        
        const txData = await txRes.json();
        const formatted = formatTransactions(txData.data || [], [selectedStudent]);
        setTransactions(formatted);
      } catch (err) {
        console.error('Failed to fetch student ledgers', err);
      }
    };
    fetchStudentData();
  }, [selectedStudent, authFetch]);

  // -------------------------------------------------------------------
  // Dynamic fee amounts derived from DB-backed feeStructures
  // -------------------------------------------------------------------
  const studentFeeConfig = useMemo(() => {
    if (!selectedStudent) return { education: 0, term: 0, transport: 0, admission: 0, bagKit: 0 };

    const isDefaultYear = selectedYear === academicYears[0]?.name;
    const fs = feeStructures.find(
      (f) => f.medium === selectedStudent.medium && f.standard === selectedStudent.standard && (f.academicYear === selectedYear || (!f.academicYear && isDefaultYear))
    );

    const annualFee = fs?.annualFee ?? 0;
    const eduParts = fs?.educationPartCount ?? 12;
    const termParts = fs?.termPartCount ?? 2;
    const totalParts = eduParts + termParts;
    const perPart = totalParts > 0 ? Math.round(annualFee / totalParts) : 0;
    const education = perPart;
    const term = (fs?.termFee !== undefined && fs.termFee > 0) ? fs.termFee : perPart;
    const admission = fs?.admissionFee ?? 0;
    const bagKit = fs?.bagKitFee ?? 0;

    const tfs = transportFeeStructures.find(
      (t) => t.transportType === selectedStudent.transportType && (t.academicYear === selectedYear || (!t.academicYear && isDefaultYear))
    );
    const transport = tfs?.amount ?? 0;

    return { education, term, transport, admission, bagKit };
  }, [selectedStudent, feeStructures, transportFeeStructures]);

  // Dynamic config for selected year
  const COMBINED_EDU_TERM_CONFIG = useMemo(() => buildEduTermConfig(selectedYear), [selectedYear]);
  const MONTHS_CONFIG = useMemo(() => COMBINED_EDU_TERM_CONFIG.filter(c => c.type === 'EDUCATION'), [COMBINED_EDU_TERM_CONFIG]);

  // Mid-year transport ledgers
  const midYearTransportLedgers = useMemo(() => {
    if (!selectedStudent) return [];
    const sId = selectedStudent._id || selectedStudent.id;
    return ledgerEntries.filter(
      (l) =>
        l.studentId === sId &&
        l.feeType === 'TRANSPORT' &&
        l.status !== 'CANCELLED' &&
        !STANDARD_MONTH_PERIODS.has(l.feePeriod) &&
        (l.academicYear === selectedYear || (!l.academicYear && selectedYear === activeYearName))
    );
  }, [selectedStudent, ledgerEntries, selectedYear, activeYearName, COMBINED_EDU_TERM_CONFIG]);

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------
  const getStandardAmount = (category: string, _period: string): number => {
    if (!selectedStudent) return 0;
    if (category === 'EDUCATION') return studentFeeConfig.education;
    if (category === 'TERM') return studentFeeConfig.term;
    if (category === 'TRANSPORT') return studentFeeConfig.transport;
    if (category === 'ADMISSION') return studentFeeConfig.admission;
    if (category === 'BAG_KIT') return studentFeeConfig.bagKit;
    return 0;
  };

  const getLedger = (category: string, period: string) => {
    const sId = selectedStudent?._id || selectedStudent?.id;
    const legacyPeriods: Record<string, string[]> = {
      ADMISSION: ['One-time', 'Admission'],
      BAG_KIT: ['One-time', 'Bag & Kit'],
    };
    const periodsToMatch = legacyPeriods[category] ?? [period];

    return ledgerEntries.find(
      (l) =>
        l.studentId === sId &&
        l.feeType === category &&
        periodsToMatch.includes(l.feePeriod) &&
        (l.academicYear === selectedYear || (!l.academicYear && selectedYear === activeYearName))
    );
  };

  const STANDARD_TERM_PERIODS = new Set(['Term 1', 'Term 2']);

  const isOverdue = (_category: string, period: string): boolean => {
    const entry = getLedger(_category, period);
    if (entry?.status === 'PAID') return false;
    return isPeriodOverdue(period, selectedYear, activeYearName);
  };

  const getDueAmount = (category: string, period: string): number => {
    const entry = getLedger(category, period);
    if (!entry) {
      if (STANDARD_MONTH_PERIODS.has(period) || STANDARD_TERM_PERIODS.has(period) || period === 'One-time') {
        return getStandardAmount(category, period);
      }
      return 0;
    }
    return entry.remainingAmount;
  };

  // -------------------------------------------------------------------
  // Period selection
  // -------------------------------------------------------------------
  const getApplicablePeriods = (config: ReturnType<typeof buildEduTermConfig>, overrideCategory?: string) => {
    if (selectedYear !== activeYearName) return config;
    if (!selectedStudent) return config;
    
    const allMonths = ['June','July','August','September','October','November','December','January','February','March','April','May'];
    const allMonthsLower = allMonths.map(m => m.toLowerCase());
    
    const eduStartMonth = (selectedStudent.admissionMonth || 'June').toLowerCase();
    const eduStartIdx = allMonthsLower.indexOf(eduStartMonth);
    const validEduStartIdx = (selectedStudent.isNewAdmission !== false && eduStartIdx >= 0) ? eduStartIdx : 0;

    const transportStartMonth = (selectedStudent.transportStartMonth || selectedStudent.admissionMonth || 'June').toLowerCase();
    const transportStartIdx = allMonthsLower.indexOf(transportStartMonth);
    const validTransportStartIdx = transportStartIdx >= 0 ? transportStartIdx : 0;

    return config.filter(item => {
      const activeType = overrideCategory === 'TRANSPORT' ? 'TRANSPORT' : item.type;
      if (activeType === 'TRANSPORT') {
        return allMonths.indexOf(item.value) >= validTransportStartIdx;
      }
      if (activeType === 'EDUCATION') {
        return allMonths.indexOf(item.value) >= validEduStartIdx;
      }
      if (activeType === 'TERM') {
        if (item.value === 'Term 1') return validEduStartIdx <= 5;
        if (item.value === 'Term 2') return true;
      }
      return true;
    });
  };

  const handlePeriodToggle = (category: string, period: string) => {
    const entry = getLedger(category, period);
    if (entry && entry.status === 'PAID') return;

    if (category === 'ADMISSION' || category === 'BAG_KIT' || category === 'OTHER') {
      setSelectedFees((prev) => {
        const exists = prev.find((p) => p.category === category && p.period === period);
        if (exists) return prev.filter((p) => !(p.category === category && p.period === period));
        return [...prev, { category, period }];
      });
      return;
    }

    const configList = getApplicablePeriods(
      category === 'EDUCATION' || category === 'TERM' ? COMBINED_EDU_TERM_CONFIG : MONTHS_CONFIG,
      category === 'TRANSPORT' ? 'TRANSPORT' : undefined
    );
    const clickedIndex = configList.findIndex(c => c.value === period);

    setSelectedFees((prev) => {
      const isCurrentlySelected = prev.some((p) => p.category === category && p.period === period);
      let newSelections = [...prev];

      if (isCurrentlySelected) {
        configList.forEach((c, idx) => {
          if (idx >= clickedIndex) {
            const cat = (category === 'EDUCATION' || category === 'TERM') ? c.type : category;
            newSelections = newSelections.filter(p => !(p.category === cat && p.period === c.value));
          }
        });
      } else {
        configList.forEach((c, idx) => {
          if (idx <= clickedIndex) {
            const cat = (category === 'EDUCATION' || category === 'TERM') ? c.type : category;
            const checkEntry = getLedger(cat, c.value);
            const isPaid = checkEntry?.status === 'PAID';
            const isNew = !checkEntry;
            const alreadySelected = newSelections.some(p => p.category === cat && p.period === c.value);
            if (!isPaid && !isNew && !alreadySelected) {
              newSelections.push({ category: cat, period: c.value });
            }
          }
        });
      }
      return newSelections;
    });
  };

  const selectAllPending = () => {
    if (feeCategory === 'EDUCATION') {
      const pending = getApplicablePeriods(COMBINED_EDU_TERM_CONFIG).filter((p) => {
        const entry = getLedger(p.type, p.value);
        return entry && entry.status !== 'PAID' && entry.remainingAmount > 0;
      });
      setSelectedFees((prev) => {
        const otherCategories = prev.filter((p) => p.category !== 'EDUCATION' && p.category !== 'TERM');
        return [...otherCategories, ...pending.map((p) => ({ category: p.type, period: p.value }))];
      });
    } else {
      const periods = getApplicablePeriods(MONTHS_CONFIG, feeCategory === 'TRANSPORT' ? 'TRANSPORT' : undefined).map((m) => m.value);
      const pending = periods.filter((p) => {
        const entry = getLedger(feeCategory, p);
        return entry && entry.status !== 'PAID' && entry.remainingAmount > 0;
      });
      setSelectedFees((prev) => {
        const otherCategories = prev.filter((p) => p.category !== feeCategory);
        return [...otherCategories, ...pending.map((period) => ({ category: feeCategory, period }))];
      });
    }
  };

  const selectNextNMonths = (n: number) => {
    if (feeCategory === 'EDUCATION') {
      const pendingItems = getApplicablePeriods(COMBINED_EDU_TERM_CONFIG).filter((c) => {
        const entry = getLedger(c.type, c.value);
        return entry && entry.status !== 'PAID' && entry.remainingAmount > 0;
      });
      const toSelect = pendingItems.slice(0, n);
      setSelectedFees((prev) => {
        const otherCategories = prev.filter((p) => p.category !== 'EDUCATION' && p.category !== 'TERM');
        return [...otherCategories, ...toSelect.map((p) => ({ category: p.type, period: p.value }))];
      });
    } else if (feeCategory === 'TRANSPORT') {
      const periods = getApplicablePeriods(MONTHS_CONFIG, 'TRANSPORT').map((m) => m.value);
      const pendingItems = periods.filter((p) => {
        const entry = getLedger(feeCategory, p);
        return entry && entry.status !== 'PAID' && entry.remainingAmount > 0;
      });
      const toSelect = pendingItems.slice(0, n);
      setSelectedFees((prev) => {
        const otherCategories = prev.filter((p) => p.category !== feeCategory);
        return [...otherCategories, ...toSelect.map((period) => ({ category: feeCategory, period }))];
      });
    }
  };

  // -------------------------------------------------------------------
  // Initialize lineItems when selectedFees changes
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!selectedStudent) return;
    setLineItems((prev) => {
      const next: Record<string, LineItemConfig> = {};
      selectedFees.forEach((f) => {
        const key = `${f.category}|${f.period}`;
        if (prev[key]) {
          next[key] = prev[key];
        } else {
          const due = getDueAmount(f.category, f.period);
          next[key] = { paymentAmount: due, concessionAmount: 0, paymentMethod: 'CASH', remark: '' };
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFees, selectedStudent, ledgerEntries]);

  const totalPayingNow = Object.values(lineItems).reduce((sum, item) => sum + item.paymentAmount, 0);

  // -------------------------------------------------------------------
  // Search filter
  // -------------------------------------------------------------------
  const filteredStudents = activeStudents.filter(
    (s) =>
      searchQuery === '' ||
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );


  // -------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || selectedFees.length === 0) return;

    const lineItemsArray = selectedFees.map((f) => {
      const entry = getLedger(f.category, f.period);
      const key = `${f.category}|${f.period}`;
      const config = lineItems[key];

      let finalRemark = config.remark;
      if (config.paymentMethod === 'CHEQUE' && (chequeNo || bankName)) {
        const chequeInfo = [chequeNo && `No: ${chequeNo}`, bankName && `Bank: ${bankName}`].filter(Boolean).join(', ');
        finalRemark = config.remark ? `${config.remark} (Cheque - ${chequeInfo})` : `Cheque - ${chequeInfo}`;
      }

      return {
        category: f.category,
        period: f.period,
        ledgerId: entry?.id || entry?._id,
        totalAmount: getStandardAmount(f.category, f.period),
        paymentAmount: config.paymentAmount,
        concessionAmount: config.concessionAmount,
        paymentMethod: config.paymentMethod,
        remark: finalRemark
      };
    });

    const feesWithLedger = lineItemsArray.filter(f => f.ledgerId);
    if (feesWithLedger.length === 0) {
      setSuccessMsg('⚠ No valid ledger entries found for selected fees. Please refresh and try again.');
      setTimeout(() => setSuccessMsg(''), 5000);
      return;
    }

    setIsProcessingPayment(true);
    await recordPayment(selectedStudent._id || selectedStudent.id, lineItemsArray);
    
    // Optimistic update for the local grid so it instantly turns green
    setLedgerEntries(prev => prev.map(ledger => {
      const payment = lineItemsArray.find(p => p.ledgerId === ledger._id);
      if (!payment) return ledger;
      const newPaid = (ledger.paidAmount || 0) + payment.paymentAmount;
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
    
    setIsProcessingPayment(false);

    setSuccessMsg(`✓ Collected ₹${totalPayingNow.toLocaleString('en-IN')} for ${selectedStudent.studentName}`);
    setSelectedFees([]);
    setLineItems({});
    setChequeNo('');
    setBankName('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // -------------------------------------------------------------------
  // Auto-Sync Mismatched or Missing Ledgers
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!selectedStudent || isRegenerating) return;

    const isDefaultYear = selectedYear === academicYears[0]?.name;
    const fs = feeStructures.find(f => f.medium === selectedStudent.medium && f.standard === selectedStudent.standard && (f.academicYear === selectedYear || (!f.academicYear && isDefaultYear)));
    const ts = transportFeeStructures.find(t => t.transportType === selectedStudent.transportType && (t.academicYear === selectedYear || (!t.academicYear && isDefaultYear)));
    const currentSignature = `${selectedStudent._id || selectedStudent.id}-${JSON.stringify(fs || {})}-${JSON.stringify(ts || {})}`;

    if (autoSyncSignature === currentSignature) return;

    let needsSync = false;

    const eduConfig = getApplicablePeriods(COMBINED_EDU_TERM_CONFIG);
    for (const item of eduConfig) {
      const entry = getLedger(item.type, item.value);
      if (!entry) { needsSync = true; break; }
      if (entry.status === 'PENDING' && !selectedStudent.isRTE && entry.totalAmount !== getStandardAmount(item.type, item.value)) { needsSync = true; break; }
    }

    if (!needsSync && selectedStudent.transportType !== 'None') {
      const transConfig = getApplicablePeriods(MONTHS_CONFIG, 'TRANSPORT');
      for (const item of transConfig) {
        const entry = getLedger('TRANSPORT', item.value);
        if (!entry) { needsSync = true; break; }
        if (entry.status === 'PENDING' && !selectedStudent.isRTE && entry.totalAmount !== getStandardAmount('TRANSPORT', item.value)) { needsSync = true; break; }
      }
    }

    if (!needsSync && selectedStudent.isNewAdmission) {
      for (const cat of ['ADMISSION', 'BAG_KIT']) {
        const entry = getLedger(cat, 'One-time');
        const stdAmt = getStandardAmount(cat, 'One-time');
        if (!entry && stdAmt > 0) { needsSync = true; break; }
        if (entry && entry.status === 'PENDING' && stdAmt > 0 && entry.totalAmount !== stdAmt) { needsSync = true; break; }
      }
    }

    if (needsSync) {
      setAutoSyncSignature(currentSignature);
      const doSync = async () => {
        setIsRegenerating(true);
        await regenerateLedgers(selectedStudent._id || selectedStudent.id);
        setIsRegenerating(false);
      };
      doSync();
    } else {
      setAutoSyncSignature(currentSignature);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, feeStructures, transportFeeStructures, ledgerEntries, isRegenerating, autoSyncSignature]);

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  const renderPaymentDetails = () => (
    <>
      <div className="flex items-center justify-between md:mb-6 mb-4">
        <h3 className="text-base font-bold text-slate-800 hidden md:block">2. Payment Details</h3>
        <div className="md:hidden"></div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (selectedStudent) setIsCustomFeeModalOpen(true); }}
          disabled={!selectedStudent}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
          Add Custom Fee
        </button>
      </div>

        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm py-3 px-4 rounded-xl flex items-center gap-2">
            <Check className="h-4 w-4 bg-emerald-500 text-white rounded-full p-0.5 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {selectedStudent ? (
          <>
            {/* Student banner + Category Tabs */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Paying For</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h4 className="text-base font-extrabold text-slate-800">{selectedStudent.studentName}</h4>
                  {selectedStudent.isRTE && (
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                      RTE Quota
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Std {selectedStudent.standard}-{selectedStudent.division} · {selectedStudent.medium} Medium · {selectedStudent.parentName}
                </p>
                {selectedStudent.transportType !== 'None' && (
                  <span className="text-[10px] font-bold text-blue-500 mt-1 block">
                    Transport: {selectedStudent.transportType} (₹{studentFeeConfig.transport.toLocaleString('en-IN')}/month)
                  </span>
                )}
              </div>

              <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200/20 flex-wrap">
                {(['EDUCATION', 'TRANSPORT', 'ADMISSION', 'BAG_KIT', 'OTHER'] as const)
                  .filter((cat) => {
                    if (cat === 'ADMISSION' && !selectedStudent.isNewAdmission) return false;
                    if (cat === 'BAG_KIT' && !selectedStudent.buyBagKit) return false;
                    return true;
                  })
                  .map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFeeCategory(cat)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-all ${
                        feeCategory === cat ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {cat === 'EDUCATION' ? 'EDUCATION & TERM' : cat === 'BAG_KIT' ? 'BAG & KIT' : cat}
                    </button>
                  ))}
              </div>
            </div>

            {/* ── Academic Year Tabs ── */}
            {(() => {
              const sId = selectedStudent._id || selectedStudent.id;
              const studentYears = [...new Set(
                ledgerEntries
                  .filter(l => l.studentId === sId && l.status !== 'PAID' && l.remainingAmount > 0 && l.academicYear)
                  .map(l => l.academicYear!)
              )];
              const hasPastYearDues = studentYears.some(y => y !== activeYearName);
              if (!hasPastYearDues && sortedYears.length <= 1) return null;
              const yearsToShow = sortedYears.filter(y => y.name === activeYearName || studentYears.includes(y.name));
              if (yearsToShow.length <= 1) return null;
              return (
                <div className="flex gap-2 flex-wrap mb-6">
                  {yearsToShow.map(y => {
                    const yearPendingAmt = ledgerEntries
                      .filter(l => l.studentId === sId && l.academicYear === y.name && l.status !== 'PAID' && l.remainingAmount > 0)
                      .reduce((s, l) => s + l.remainingAmount, 0);
                    const isPast = y.name !== activeYearName;
                    const isSelected = selectedYear === y.name;
                    return (
                      <button
                        key={y._id}
                        type="button"
                        onClick={() => { setSelectedYear(y.name); setSelectedFees([]); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? isPast ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : isPast ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                        }`}
                      >
                        {isPast && <span className="text-[10px]">⚠</span>}
                        {y.name}
                        {isPast && yearPendingAmt > 0 && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                            ₹{yearPendingAmt.toLocaleString('en-IN')}
                          </span>
                        )}
                        {!isPast && <span className={`ml-1 text-[9px] ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>Current</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── Fee Grids ── */}
            <div className="space-y-6">
              {(feeCategory === 'EDUCATION' || feeCategory === 'TRANSPORT') && (
                <FeeGrid
                  feeCategory={feeCategory}
                  selectedStudent={selectedStudent}
                  selectedFees={selectedFees}
                  setSelectedFees={setSelectedFees}
                  isRegenerating={isRegenerating}
                  midYearTransportLedgers={midYearTransportLedgers}
                  COMBINED_EDU_TERM_CONFIG={COMBINED_EDU_TERM_CONFIG}
                  MONTHS_CONFIG={MONTHS_CONFIG}
                  studentFeeConfig={studentFeeConfig}
                  getApplicablePeriods={getApplicablePeriods}
                  getLedger={getLedger}
                  getDueAmount={getDueAmount}
                  isOverdue={isOverdue}
                  handlePeriodToggle={handlePeriodToggle}
                  selectNextNMonths={selectNextNMonths}
                  selectAllPending={selectAllPending}
                />
              )}

              {/* ── ADMISSION / BAG_KIT ── */}
              {(feeCategory === 'ADMISSION' || feeCategory === 'BAG_KIT') && (
                <div className="space-y-6">
                  {(() => { const l = getLedger(feeCategory, 'One-time'); return l && l.status === 'PAID'; })() && (
                    <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm font-bold text-center">
                      {feeCategory === 'ADMISSION' ? 'Admission' : 'Bag & Kit'} fee has already been paid for this student.
                    </div>
                  )}
                  {isRegenerating && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-blue-700">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-semibold">Automatically syncing fee amounts...</span>
                    </div>
                  )}
                  <div className={`border rounded-xl p-5 border-l-4 ${feeCategory === 'ADMISSION' ? 'border-orange-100 bg-orange-50/50 border-l-orange-500' : 'border-slate-200 bg-slate-50 border-l-slate-600'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <span className={`font-bold flex items-center gap-2 ${feeCategory === 'ADMISSION' ? 'text-orange-600' : 'text-slate-700'}`}>
                        {feeCategory === 'ADMISSION' ? '🎓 Admission' : '🎒 Bag & Kit'}
                      </span>
                      <span className={`font-extrabold text-lg ${feeCategory === 'ADMISSION' ? 'text-orange-500' : 'text-slate-700'}`}>
                        ₹{getStandardAmount(feeCategory, 'One-time').toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <label className="text-slate-500 text-sm w-24 text-right">Amount:</label>
                        <input
                          type="number"
                          readOnly
                          className="border border-slate-200 rounded-lg px-3 py-1.5 w-40 bg-white font-bold text-slate-800 outline-none"
                          value={getStandardAmount(feeCategory, 'One-time')}
                        />
                        <span className="text-slate-400 text-sm">(one-time)</span>
                      </div>
                      <div className="flex items-center gap-4 mt-6">
                        <label className="text-slate-500 text-sm w-24 text-right">Action:</label>
                        <button
                          type="button"
                          onClick={() => handlePeriodToggle(feeCategory, 'One-time')}
                          className={`px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${
                            selectedFees.some(f => f.category === feeCategory && f.period === 'One-time')
                              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                              : 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {selectedFees.some(f => f.category === feeCategory && f.period === 'One-time')
                            ? 'Remove from Payment'
                            : 'Add to Payment'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CUSTOM FEES (OTHER) ── */}
              {feeCategory === 'OTHER' && (
                <div className="space-y-4">
                  {ledgerEntries.filter(l => (l.studentId === selectedStudent._id || l.studentId === selectedStudent.id) && l.feeType === 'OTHER').length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 text-slate-500 p-6 rounded-xl text-center text-sm font-bold">
                      No custom fees found for this student. Click "+ Add Custom Fee" to create one.
                    </div>
                  ) : (
                    ledgerEntries
                      .filter(l => (l.studentId === selectedStudent._id || l.studentId === selectedStudent.id) && l.feeType === 'OTHER')
                      .map(ledger => {
                        const isPaid = ledger.status === 'PAID';
                        const isSelected = selectedFees.some(f => f.category === 'OTHER' && f.period === ledger.feePeriod);
                        return (
                          <div key={ledger._id} className="border border-slate-200 bg-white rounded-xl p-5 flex items-center justify-between shadow-sm">
                            <div>
                              <span className="font-bold text-slate-700 flex items-center gap-2">🏷️ {ledger.feePeriod}</span>
                              <span className="text-xs text-slate-400 mt-1 block">Total: ₹{ledger.totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`font-extrabold text-lg ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {isPaid ? 'PAID' : `₹${ledger.remainingAmount.toLocaleString('en-IN')} DUE`}
                              </span>
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => handlePeriodToggle('OTHER', ledger.feePeriod)}
                                  className={`px-4 py-2 rounded-lg font-bold transition-all shadow-sm ${
                                    isSelected
                                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                      : 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  {isSelected ? 'Remove' : 'Add to Payment'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}

              {/* ── Payment Summary Table + Submit ── */}
              <PaymentSummaryTable
                selectedFees={selectedFees}
                lineItems={lineItems}
                setLineItems={setLineItems}
                totalPayingNow={totalPayingNow}
                chequeNo={chequeNo}
                setChequeNo={setChequeNo}
                bankName={bankName}
                setBankName={setBankName}
                getDueAmount={getDueAmount}
                onSubmit={handleSubmit}
                isSubmitting={isProcessingPayment}
              />
            </div>

            {/* ── PAYMENT HISTORY ── */}
            {(() => {
              const studentId = selectedStudent._id || selectedStudent.id;
              const studentTxs = transactions
                .filter(tx => tx.studentId === studentId)
                .flatMap((tx): TxItem[] => {
                  if (tx.subItems && tx.subItems.length > 0) {
                    return tx.subItems.map((sub: any) => ({
                      id: sub.id || tx.id,
                      feeType: sub.description,
                      amount: sub.amount,
                      concessionAmount: sub.concessionAmount,
                      method: (sub.method as PaymentTransaction['method']) || tx.method,
                      status: sub.status || tx.status,
                      remark: tx.remark,
                      date: tx.date,
                      time: tx.time,
                      academicYear: sub.academicYear || (tx as any).academicYear
                    }));
                  }
                  return [{
                    id: tx.id,
                    feeType: tx.feeType,
                    amount: tx.amount,
                    concessionAmount: tx.concessionAmount || 0,
                    method: tx.method,
                    status: tx.status,
                    remark: tx.remark,
                    date: tx.date,
                    time: tx.time,
                    academicYear: (tx as any).academicYear
                  }];
                })
                .sort((a, b) => {
                  const dateCompare = b.date.localeCompare(a.date);
                  return dateCompare !== 0 ? dateCompare : b.time.localeCompare(a.time);
                });

              return (
                <PaymentHistoryPanel
                  allTxs={studentTxs}
                  reversePayment={reversePayment}
                />
              );
            })()}
          </>
        ) : (
          <div className="text-center text-slate-400 py-20 text-sm hidden md:block">
            Select a student from the left panel to begin
          </div>
        )}
    </>
  );

  return (
    <div className="flex-grow flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-0 h-screen overflow-hidden">
      <StudentSidebar
        filteredStudents={filteredStudents}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedStudent={selectedStudent}
        onSelectStudent={(student) => {
          if (selectedStudent?._id === student._id) {
            setSelectedStudent(null);
          } else {
            setSelectedStudent(student);
            setSelectedFees([]);
            setFeeCategory('EDUCATION');
            setSelectedYear(activeYearName);
          }
        }}
        activeYearName={activeYearName}
        renderMobilePaymentDetails={renderPaymentDetails}
      />
      
      <section className="hidden md:block flex-grow p-6 overflow-y-auto">
        {renderPaymentDetails()}
      </section>

      {/* ── CUSTOM FEE MODAL ── */}
      {isCustomFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Add Custom Fee
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomFeeModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Fee Name / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g., Annual Event, Late Fine, Transport Damage"
                  value={customFeeName}
                  onChange={(e) => setCustomFeeName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  value={customFeeAmount}
                  onChange={(e) => setCustomFeeAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm font-semibold"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCustomFeeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingCustomFee || !customFeeName.trim() || !customFeeAmount || Number(customFeeAmount) <= 0}
                onClick={async () => {
                  if (selectedStudent && customFeeName && customFeeAmount) {
                    setIsSubmittingCustomFee(true);
                    const ok = await addCustomFee(selectedStudent.id || selectedStudent._id || '', customFeeName.trim(), Number(customFeeAmount));
                    setIsSubmittingCustomFee(false);
                    if (ok) {
                      setSuccessMsg(`✓ Custom fee '${customFeeName}' added successfully.`);
                      setIsCustomFeeModalOpen(false);
                      setCustomFeeName('');
                      setCustomFeeAmount('');
                      setFeeCategory('OTHER');
                      setTimeout(() => setSuccessMsg(''), 4000);
                    } else {
                      alert('Failed to add custom fee. Please try again.');
                    }
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingCustomFee && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmittingCustomFee ? 'Saving...' : 'Save Fee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
