import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard, Receipt, GraduationCap, CheckCircle2, AlertCircle, Clock,
  Users, RefreshCw, Check, X, ShieldCheck, ArrowRight, Printer, Loader2,
  IndianRupee, Phone, Building2
} from './icons';
import { useApp } from '../store';
import type { PaymentTransaction } from '../mockData';
import { brand } from '../config/brand';

interface StudentData {
  _id: string;
  id?: string;
  studentName: string;
  studentCode?: string;
  rollNo?: number | null;
  grNo?: string | null;
  standard: string;
  division: string;
  medium: string;
  gender?: string | null;
}

interface LedgerItem {
  _id: string;
  studentId: string;
  academicYear: string;
  feePeriod: string;
  feeType: string;
  ledgerNumber: string;
  totalAmount: number;
  paidAmount: number;
  concessionAmount: number;
  remainingAmount: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  dueDate?: string;
}

interface PaymentRecord {
  _id: string;
  receiptNumber?: number;
  amount: number;
  method: string;
  gatewayTransactionId?: string;
  createdAt: string;
  date?: string;
  ledgerId?: {
    _id: string;
    feePeriod?: string;
    feeType?: string;
    academicYear?: string;
  } | string;
  details?: Record<string, any>;
}

interface StudentViewProps {
  onPrint?: (tx: PaymentTransaction) => void;
}

/** Human-friendly title instead of internal technical database keys */
function formatFeeTitle(period: string, type: string) {
  const cleanPeriod = (period || 'Academic Fee').replace(/_/g, ' ');
  const typeMap: Record<string, string> = {
    EDUCATION: 'Tuition Fee',
    TERM: 'Term Fee',
    TRANSPORT: 'Transport Fee',
    ADMISSION: 'Admission Fee',
    BAG_KIT: 'Books & Uniform Kit',
    OTHER: 'School Fee',
  };
  const cleanType = typeMap[type] || type || 'Fee';
  return `${cleanPeriod} · ${cleanType}`;
}

export const StudentView: React.FC<StudentViewProps> = ({ onPrint }) => {
  const {
    currentUser,
    client,
    currentScreen,
    setScreen,
    authFetch,
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search filter for receipts tab
  const [receiptSearch, setReceiptSearch] = useState('');

  // Set of selected ledger IDs for payment
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<Set<string>>(new Set());
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccessModal, setPaymentSuccessModal] = useState<{
    paymentId: string;
    amount: number;
    studentName: string;
    date: string;
    tx?: PaymentTransaction;
  } | null>(null);

  const activeTab = currentScreen === 'student-receipts' ? 'receipts' : 'fees';
  const currentStudent = students[selectedStudentIndex] || null;

  // 1. Fetch Students enrolled for this parent
  const fetchMyStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/v1/students?limit=20');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const list = Array.isArray(data) ? data : data.students || [];
        setStudents(list);
        if (list.length > 0 && selectedStudentIndex >= list.length) {
          setSelectedStudentIndex(0);
        }
      }
    } catch (err) {
      console.error('Failed to load student profiles:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedStudentIndex]);

  useEffect(() => {
    fetchMyStudents();
  }, [fetchMyStudents]);

  // 2. Fetch Ledgers & Payment History
  const loadStudentDetails = useCallback(async (studentId: string) => {
    if (!studentId) return;
    try {
      setLoadingData(true);
      const [ledgersRes, paymentsRes] = await Promise.all([
        authFetch(`/api/v1/ledgers?studentId=${studentId}&limit=100`),
        authFetch(`/api/v1/payments?studentId=${studentId}&limit=100`),
      ]);

      let ledgerList: LedgerItem[] = [];
      if (ledgersRes.ok) {
        const json = await ledgersRes.json();
        ledgerList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      }
      setLedgers(ledgerList);

      let paymentList: PaymentRecord[] = [];
      if (paymentsRes.ok) {
        const json = await paymentsRes.json();
        paymentList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      }
      setPayments(paymentList);

      // Pre-select all pending ledgers by default
      const pendingIds = new Set(
        ledgerList
          .filter((l) => l.status !== 'PAID' && l.remainingAmount > 0)
          .map((l) => l._id)
      );
      setSelectedLedgerIds(pendingIds);
    } catch (err) {
      console.error('Failed to load student fee records:', err);
    } finally {
      setLoadingData(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (currentStudent?._id) {
      loadStudentDetails(currentStudent._id);
    }
  }, [currentStudent?._id, loadStudentDetails]);

  // Pending ledgers strictly having positive remaining balance
  const pendingLedgers = useMemo(() => {
    return ledgers.filter((l) => l.status !== 'PAID' && l.remainingAmount > 0);
  }, [ledgers]);

  const totalOutstanding = useMemo(() => {
    return pendingLedgers.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  }, [pendingLedgers]);

  const totalPaidSoFar = useMemo(() => {
    return ledgers.reduce((sum, l) => sum + (l.paidAmount || 0), 0);
  }, [ledgers]);

  // STRICT RULE: Payable total is ONLY the exact remaining balance of selected pending items. NO ADVANCE.
  const selectedTotal = useMemo(() => {
    return pendingLedgers
      .filter((l) => selectedLedgerIds.has(l._id))
      .reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
  }, [pendingLedgers, selectedLedgerIds]);

  const toggleLedgerSelection = (ledgerId: string) => {
    setSelectedLedgerIds((prev) => {
      const next = new Set(prev);
      if (next.has(ledgerId)) {
        next.delete(ledgerId);
      } else {
        next.add(ledgerId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLedgerIds.size === pendingLedgers.length) {
      setSelectedLedgerIds(new Set());
    } else {
      setSelectedLedgerIds(new Set(pendingLedgers.map((l) => l._id)));
    }
  };

  // Helper to dynamically load Razorpay checkout script
  const ensureRazorpayLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Online Payment via Razorpay (Exact balance clearance only, NO advance)
  const handlePayViaRazorpay = async () => {
    if (!currentStudent || selectedTotal <= 0 || selectedLedgerIds.size === 0) return;

    try {
      setProcessingPayment(true);
      const isLoaded = await ensureRazorpayLoaded();
      if (!isLoaded) {
        alert('Failed to initialize Razorpay payment gateway. Please check your internet connection.');
        setProcessingPayment(false);
        return;
      }

      // Step 1: Create Razorpay Order
      const orderRes = await authFetch('/api/v1/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedTotal }),
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.data) {
        throw new Error(orderJson.message || 'Could not initiate payment order with server.');
      }
      const orderData = orderJson.data;

      // Step 2: Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id || orderData.key,
        amount: orderData.amount, // in paisa
        currency: orderData.currency || 'INR',
        name: client?.name || brand.schoolName,
        description: `School Fee Payment for ${currentStudent.studentName}`,
        order_id: orderData.id,
        prefill: {
          name: currentUser?.name || currentStudent.studentName,
          contact: currentUser?.email || '',
        },
        theme: {
          color: '#059669', // Emerald theme
        },
        handler: async (response: any) => {
          try {
            setProcessingPayment(true);
            // Step 3: Verify Razorpay Payment Signature and Settle Ledgers
            const selectedItems = pendingLedgers
              .filter((l) => selectedLedgerIds.has(l._id))
              .map((l) => ({
                ledgerId: l._id,
                amount: l.remainingAmount, // strictly exact remaining balance
              }));

            const verifyRes = await authFetch('/api/v1/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payments: selectedItems,
              }),
            });

            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyJson.message || 'Payment signature verification failed.');
            }
            const createdPayments = verifyJson.data || [];
            const firstPayment = Array.isArray(createdPayments) ? createdPayments[0] : createdPayments;

            // Prepare transaction for receipt printing
            const tx: PaymentTransaction = {
              id: firstPayment?._id || response.razorpay_payment_id,
              _id: firstPayment?._id || response.razorpay_payment_id,
              receiptNumber: firstPayment?.receiptNumber,
              ledgerId: selectedItems[0]?.ledgerId || '',
              studentId: currentStudent._id,
              studentName: currentStudent.studentName,
              studentCode: currentStudent.studentCode || '',
              classInfo: `Grade ${currentStudent.standard} - ${currentStudent.division} (${currentStudent.medium})`,
              feeType: 'Online Fee Payment (Razorpay)',
              amount: selectedTotal,
              concessionAmount: 0,
              method: 'ONLINE',
              status: 'PAID',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              remark: `Razorpay Payment ID: ${response.razorpay_payment_id}`,
            };

            setPaymentSuccessModal({
              paymentId: response.razorpay_payment_id,
              amount: selectedTotal,
              studentName: currentStudent.studentName,
              date: new Date().toLocaleDateString(),
              tx,
            });

            // Refresh records
            await loadStudentDetails(currentStudent._id);
          } catch (verifyErr: any) {
            console.error('Payment verification failed:', verifyErr);
            alert(verifyErr?.message || 'Payment was charged but verification failed. Please contact school office.');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
          },
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();
    } catch (err: any) {
      console.error('Payment initiation error:', err);
      alert(err?.message || 'Could not initiate online payment. Please try again.');
      setProcessingPayment(false);
    }
  };

  // Trigger Receipt Print
  const handlePrintReceipt = (payment: PaymentRecord) => {
    if (!currentStudent) return;
    const ledgerPeriod = typeof payment.ledgerId === 'object' && payment.ledgerId !== null
      ? formatFeeTitle(payment.ledgerId.feePeriod || '', payment.ledgerId.feeType || '')
      : 'Online Fee Payment';

    const tx: PaymentTransaction = {
      id: payment._id,
      _id: payment._id,
      receiptNumber: payment.receiptNumber,
      ledgerId: typeof payment.ledgerId === 'object' && payment.ledgerId !== null ? payment.ledgerId._id : (payment.ledgerId as string || ''),
      studentId: currentStudent._id,
      studentName: currentStudent.studentName,
      studentCode: currentStudent.studentCode || '',
      classInfo: `Grade ${currentStudent.standard} - ${currentStudent.division} (${currentStudent.medium})`,
      feeType: ledgerPeriod,
      amount: payment.amount,
      concessionAmount: 0,
      method: payment.method || 'ONLINE',
      status: 'PAID',
      date: new Date(payment.createdAt || payment.date || Date.now()).toISOString().split('T')[0],
      time: new Date(payment.createdAt || payment.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      remark: payment.gatewayTransactionId ? `Razorpay ID: ${payment.gatewayTransactionId}` : 'School Fee Payment',
    };

    if (onPrint) {
      onPrint(tx);
    } else {
      window.print();
    }
  };

  // Filtered payments for Receipts tab
  const filteredPayments = useMemo(() => {
    if (!receiptSearch.trim()) return payments;
    const q = receiptSearch.toLowerCase().trim();
    return payments.filter((p) => {
      const rNum = String(p.receiptNumber || '');
      const method = String(p.method || '').toLowerCase();
      const ref = String(p.gatewayTransactionId || '').toLowerCase();
      const period = typeof p.ledgerId === 'object' && p.ledgerId !== null ? String(p.ledgerId.feePeriod || '').toLowerCase() : '';
      return rNum.includes(q) || method.includes(q) || ref.includes(q) || period.includes(q);
    });
  }, [payments, receiptSearch]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-slate-700">Loading student fee records...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex-1 p-6 sm:p-12 bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">No Student Linked</h2>
          <p className="text-sm text-slate-500 mt-2">
            No active student profiles were found linked to your mobile account (<strong>{currentUser?.email}</strong>). Please contact the school office to verify your registered parent mobile number.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ========================================================================= */}
      {/* 1. STUDENT IDENTITY BANNER & SIBLING SWITCHER                             */}
      {/* ========================================================================= */}
      {currentStudent && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Student Info */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xl shadow-md ring-4 ring-emerald-50">
                {currentStudent.studentName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Enrolled Student</p>
                  <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Essential Edition
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {currentStudent.studentName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/80">
                    Grade {currentStudent.standard} - {currentStudent.division}
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200/60">
                    {currentStudent.medium} Medium
                  </span>
                  {currentStudent.grNo && (
                    <span className="inline-flex items-center text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                      GR No: <strong className="text-slate-800 ml-1">{currentStudent.grNo}</strong>
                    </span>
                  )}
                  {currentStudent.rollNo && (
                    <span className="inline-flex items-center text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                      Roll: <strong className="text-slate-800 ml-1">{currentStudent.rollNo}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sibling Switcher & Refresh */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0">
              {students.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
                  <label className="text-xs font-bold text-slate-500 ml-1">Switch Child:</label>
                  <select
                    value={selectedStudentIndex}
                    onChange={(e) => setSelectedStudentIndex(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  >
                    {students.map((st, idx) => (
                      <option key={st._id || idx} value={idx}>
                        {st.studentName} (Grade {st.standard}-{st.division})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => loadStudentDetails(currentStudent._id)}
                title="Refresh Records"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Clean 2-Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setScreen('student-fees')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'fees'
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Pay Pending Fees</span>
              {pendingLedgers.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'fees' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {pendingLedgers.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setScreen('student-receipts')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'receipts'
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Payment Receipts</span>
              {payments.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'receipts' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {payments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PAY PENDING FEES                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Pending Dues</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <AlertCircle className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-rose-900 tracking-tight">
                ₹{totalOutstanding.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] font-medium text-rose-600 mt-0.5">
                {pendingLedgers.length} pending fee installment{pendingLedgers.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Paid</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-900 tracking-tight">
                ₹{totalPaidSoFar.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
                Credited with {payments.length} receipt{payments.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Selected for Payment</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <CreditCard className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-indigo-900 tracking-tight">
                ₹{selectedTotal.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] font-medium text-indigo-600 mt-0.5">
                {selectedLedgerIds.size} {selectedLedgerIds.size === 1 ? 'installment' : 'installments'} selected
              </p>
            </div>
          </div>

          {/* Installment Selection Bar */}
          {pendingLedgers.length > 0 && (
            <div className="rounded-2xl bg-slate-100/80 border border-slate-200/80 px-4 py-3 text-xs text-slate-600 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Select the pending fee installments you wish to clear online.</span>
              </div>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="shrink-0 text-xs font-black text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                {selectedLedgerIds.size === pendingLedgers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          )}

          {/* Pending Fees Table */}
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {loadingData ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-xs font-bold">Checking pending fee dues...</p>
              </div>
            ) : pendingLedgers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-base font-black text-slate-900">All Fees Cleared!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  There are no pending fee dues for {currentStudent?.studentName}. Thank you for keeping your child&apos;s account up to date.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedLedgerIds.size === pendingLedgers.length && pendingLedgers.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-4">Fee Period & Description</th>
                      <th className="py-3.5 px-4 text-right">Total Installment</th>
                      <th className="py-3.5 px-4 text-right">Already Paid</th>
                      <th className="py-3.5 px-4 text-right">Remaining Due</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingLedgers.map((l) => {
                      const isSelected = selectedLedgerIds.has(l._id);
                      const title = formatFeeTitle(l.feePeriod, l.feeType);
                      return (
                        <tr
                          key={l._id}
                          onClick={() => toggleLedgerSelection(l._id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleLedgerSelection(l._id)}
                              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <p className="font-bold text-slate-900 text-sm">{title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Session: <strong className="text-slate-600">{l.academicYear}</strong>
                            </p>
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-slate-600">
                            ₹{l.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-emerald-600">
                            ₹{l.paidAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-4 text-right font-black text-rose-700 text-base">
                            ₹{l.remainingAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {l.status === 'PARTIAL' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Partial Due
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Unpaid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Checkout Action */}
            {pendingLedgers.length > 0 && (
              <div className="p-5 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Selected for clearance: <strong className="text-slate-900">{selectedLedgerIds.size} installment{selectedLedgerIds.size === 1 ? '' : 's'}</strong>
                  </p>
                  <p className="text-base font-black text-slate-900 mt-0.5">
                    Payable Amount:{' '}
                    <span className="text-emerald-700 text-lg">
                      ₹{selectedTotal.toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={processingPayment || selectedTotal <= 0}
                  onClick={handlePayViaRazorpay}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-7 py-3.5 text-xs font-black text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Opening Razorpay Gateway...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Pay ₹{selectedTotal.toLocaleString('en-IN')} via Razorpay</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* School Office Contact Note */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>
                Need assistance with your fee dues? Contact the school accounts counter during office hours (9:00 AM – 1:00 PM).
              </span>
            </div>
            {client?.contactNumber && (
              <span className="font-bold text-slate-700">
                Phone: {client.contactNumber}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAYMENT RECEIPTS & HISTORY                                         */}
      {/* ========================================================================= */}
      {activeTab === 'receipts' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Payment History & Receipts</h2>
                <p className="text-xs text-slate-500">Official fee receipts issued for {currentStudent?.studentName}</p>
              </div>
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  placeholder="Search receipt # or method..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {loadingData ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-xs font-bold">Loading payment receipts...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No payment receipts found.</p>
                <p className="text-xs text-slate-500 mt-1">Receipts will automatically appear here once fees are cleared.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Receipt No.</th>
                      <th className="py-3.5 px-4">Payment Date & Time</th>
                      <th className="py-3.5 px-4">Fee Period / Details</th>
                      <th className="py-3.5 px-4">Payment Mode</th>
                      <th className="py-3.5 px-4">Transaction Reference</th>
                      <th className="py-3.5 px-4 text-right">Amount Paid</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((p) => {
                      const periodText = typeof p.ledgerId === 'object' && p.ledgerId !== null
                        ? formatFeeTitle(p.ledgerId.feePeriod || '', p.ledgerId.feeType || '')
                        : 'School Fee Payment';
                      const isOnline = p.method === 'ONLINE' || !!p.gatewayTransactionId;
                      return (
                        <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900">
                              #{p.receiptNumber || p._id.slice(-6).toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {new Date(p.createdAt || p.date || Date.now()).toLocaleDateString()}{' '}
                            <span className="text-slate-400 text-[10px]">
                              {new Date(p.createdAt || p.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {periodText}
                          </td>
                          <td className="py-3.5 px-4">
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CreditCard className="h-3 w-3" />
                                Online (Razorpay)
                              </span>
                            ) : p.method === 'CHEQUE' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Cheque
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Cash Counter
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                            {p.gatewayTransactionId || p.details?.chequeNo || 'School Counter'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                            ₹{p.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handlePrintReceipt(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5 text-slate-500" />
                              <span>Print</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PAYMENT SUCCESS MODAL                                                  */}
      {/* ========================================================================= */}
      {paymentSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h3 className="text-xl font-black text-slate-900">Fee Payment Successful!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Payment was verified and credited directly to the school account.
            </p>

            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student:</span>
                <span className="font-bold text-slate-900">{paymentSuccessModal.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount Paid:</span>
                <span className="font-black text-emerald-700 text-sm">₹{paymentSuccessModal.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Razorpay Payment ID:</span>
                <span className="font-mono text-slate-800 text-[11px] font-semibold">{paymentSuccessModal.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="text-slate-800 font-medium">{paymentSuccessModal.date}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (paymentSuccessModal.tx && onPrint) {
                    onPrint(paymentSuccessModal.tx);
                  } else {
                    window.print();
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-xs font-black text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Official Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentSuccessModal(null)}
                className="rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 px-4 py-3 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
