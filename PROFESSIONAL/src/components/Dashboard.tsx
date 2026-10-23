import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import {
  Search,
  Plus,
  Coins,
  Smartphone,
  FileText,
  CreditCard,
  Globe,
  Users,
  AlertTriangle,
  Bus,
  GraduationCap,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from './icons';
import { formatTransactions } from '../utils/transactionHelpers';
import { BrandedLoader } from './BrandedLoader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-2rem)]">
      <BrandedLoader />
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const {
    students,
    activeStudents,
    setScreen,
    isLoadingDetails,
    transactions: globalTransactions,
    unpaidData,
    expenses,
  } = useApp();

  // Define today's date string matching the format in store.tsx (YYYY-MM-DD)
  const todayString = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayString);
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const rawTxData = useMemo(() => {
    return globalTransactions.filter((tx: any) => {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      return txDate === selectedDate;
    });
  }, [globalTransactions, selectedDate]);

  // Cash expenses for selected date
  const cashExpensesForSelectedDate = useMemo(() => {
    return (expenses || []).reduce((acc, exp) => {
      const expDate = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
      if (!exp.isReversed && expDate === selectedDate && exp.paymentMethod === 'CASH') {
        return acc + (exp.amount || 0);
      }
      return acc;
    }, 0);
  }, [expenses, selectedDate]);

  const metrics = useMemo(() => {
    let totalAmount = 0;
    let cashAmount = 0;
    let bankAmount = 0;
    let totalConcessions = 0;

    rawTxData.forEach((tx: any) => {
      const amount = tx.amount || 0;
      totalAmount += amount;

      // Concessions are only counted for the original payment to avoid double counting or negative concessions
      if (!tx.isReversal) {
        totalConcessions += tx.concessionAmount || 0;
      }

      if (tx.method?.toUpperCase() === 'CASH') {
        cashAmount += amount;
      } else {
        bankAmount += amount;
      }
    });

    // Unpaid count: number of students in unpaidData with a non-empty pendingLedgers array
    const unpaidCount = unpaidData.filter((u: any) => u.pendingLedgers && u.pendingLedgers.length > 0).length;

    return { totalAmount, cashAmount, bankAmount, totalConcessions, unpaidCount };
  }, [rawTxData, unpaidData]);

  const [dailyTransactions, setDailyTransactions] = useState<any[]>([]);

  // Format transactions whenever raw data or students change
  useEffect(() => {
    if (rawTxData.length > 0 && students.length > 0) {
      setDailyTransactions(formatTransactions(rawTxData, students));
    } else {
      setDailyTransactions([]);
    }
  }, [rawTxData, students]);

  // Debounce search input by 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Reset page when date or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchQuery]);

  // Timezone-safe day navigation helpers
  const handlePrevDay = () => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      dateObj.setDate(dateObj.getDate() - 1);

      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      dateObj.setDate(dateObj.getDate() + 1);

      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleToday = () => {
    setSelectedDate(todayString);
  };

  const formattedSelectedDate = useMemo(() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return selectedDate;
  }, [selectedDate]);

  // Filter transactions for selected date
  const selectedDateTransactions = dailyTransactions;

  // Collection totals for selected date
  const totalCollection = metrics.totalAmount;

  const englishCol = useMemo(() => {
    return selectedDateTransactions
      .filter((t) => t.classInfo.toLowerCase().includes('english'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDateTransactions]);

  const gujaratiCol = useMemo(() => {
    return selectedDateTransactions
      .filter((t) => t.classInfo.toLowerCase().includes('gujarati'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDateTransactions]);

  // Concession for selected date
  const todayConcession = metrics.totalConcessions;

  // Payment mode stats for selected date (Dynamic)
  const paymentModesData = useMemo(() => {
    const totals = new Map<string, number>();

    const normalizeMethod = (m: string) => {
      const upperM = (m || '').trim().toUpperCase();
      if (upperM === 'UPI') return 'ONLINE';
      if (['NEFT', 'RTGS', 'IMPS'].includes(upperM)) return 'NET BANKING';
      return upperM;
    };

    selectedDateTransactions.forEach((t) => {
      if (t.paymentBreakdown && t.paymentBreakdown.length > 0) {
        t.paymentBreakdown.forEach((b: any) => {
          const norm = normalizeMethod(b.method);
          totals.set(norm, (totals.get(norm) || 0) + b.amount);
        });
      } else if (t.method) {
        const methods = t.method.split('+').map((m: string) => m.trim());
        const norm = normalizeMethod(methods[0]);
        totals.set(norm, (totals.get(norm) || 0) + t.amount);
      }
    });

    const baseMethods = ['CASH', 'ONLINE', 'CHEQUE', 'CARD', 'NET BANKING'];
    baseMethods.forEach((m) => {
      if (!totals.has(m)) totals.set(m, 0);
    });

    const config: Record<string, { icon: React.ElementType; bg: string; tint: string }> = {
      CASH: {
        icon: Coins,
        bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        tint: 'from-emerald-500/[0.07] border-emerald-500/15',
      },
      ONLINE: {
        icon: Smartphone,
        bg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        tint: 'from-blue-500/[0.07] border-blue-500/15',
      },
      CHEQUE: {
        icon: FileText,
        bg: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
        tint: 'from-cyan-500/[0.07] border-cyan-500/15',
      },
      CARD: {
        icon: CreditCard,
        bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        tint: 'from-amber-500/[0.07] border-amber-500/15',
      },
      'NET BANKING': {
        icon: Globe,
        bg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        tint: 'from-indigo-500/[0.07] border-indigo-500/15',
      },
      GOVT: {
        icon: GraduationCap,
        bg: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
        tint: 'from-purple-500/[0.07] border-purple-500/15',
      },
    };

    const fallbackConfig = {
      icon: Coins,
      bg: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      tint: 'from-slate-500/[0.06] border-slate-200',
    };

    return Array.from(totals.entries())
      .map(([label, value]) => {
        const conf = config[label] || fallbackConfig;
        let displayValue = value;
        let subtitle = '';

        if (label === 'CASH') {
          displayValue = Math.max(0, value - cashExpensesForSelectedDate);
          if (cashExpensesForSelectedDate > 0) {
            subtitle = `Exp: -₹${cashExpensesForSelectedDate.toLocaleString('en-IN')}`;
          }
        }

        return {
          label,
          value: displayValue.toLocaleString('en-IN'),
          subtitle,
          ...conf,
        };
      })
      .sort((a, b) => {
        const aIdx = baseMethods.indexOf(a.label);
        const bIdx = baseMethods.indexOf(b.label);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [selectedDateTransactions, cashExpensesForSelectedDate]);

  // Overall student & ledger statistics
  const totalStudents = activeStudents.length;
  const englishStudents = activeStudents.filter((s) => s.medium.toLowerCase() === 'english').length;
  const gujaratiStudents = activeStudents.filter((s) => s.medium.toLowerCase() === 'gujarati').length;
  const transportStudents = activeStudents.filter((s) => s.transportType && s.transportType !== 'None').length;
  const rteStudents = activeStudents.filter((s) => s.isRTE).length;
  const unpaidCount = metrics.unpaidCount;

  const stats = [
    {
      title: 'TOTAL STUDENTS',
      value: totalStudents.toLocaleString('en-IN'),
      subtitle: `English: ${englishStudents} · Gujarati: ${gujaratiStudents}`,
      icon: Users,
      color: 'from-teal-500/[0.07] border-teal-500/15',
    },
    {
      title: 'UNPAID LEDGERS',
      value: unpaidCount.toLocaleString('en-IN'),
      subtitle: 'Action required',
      icon: AlertTriangle,
      color: 'from-rose-500/[0.07] border-rose-500/15',
    },
    {
      title: 'TRANSPORT STUDENTS',
      value: transportStudents.toLocaleString('en-IN'),
      subtitle: 'Multiple active zones',
      icon: Bus,
      color: 'from-amber-500/[0.07] border-amber-500/15',
    },
    {
      title: 'RTE STUDENTS',
      value: rteStudents.toLocaleString('en-IN'),
      subtitle: 'Govt pays · No reminders sent',
      icon: GraduationCap,
      color: 'from-indigo-500/[0.07] border-indigo-500/15',
    },
  ];

  // Filter daily transactions by search query
  const filteredTransactions = useMemo(() => {
    const daily = dailyTransactions;
    if (!searchQuery) return daily;
    const q = searchQuery.toLowerCase();
    return daily.filter(
      (tx) => tx.studentName.toLowerCase().includes(q) || tx.studentCode.toLowerCase().includes(q)
    );
  }, [dailyTransactions, searchQuery]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);

  // Online Payments Table Logic
  const [currentOnlinePage, setCurrentOnlinePage] = useState(1);
  const onlineTransactions = useMemo(() => {
    return filteredTransactions.filter((tx) => !!tx.gatewayTransactionId);
  }, [filteredTransactions]);

  const paginatedOnlineTransactions = useMemo(() => {
    const startIndex = (currentOnlinePage - 1) * PAGE_SIZE;
    return onlineTransactions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [onlineTransactions, currentOnlinePage]);

  const totalOnlinePages = Math.ceil(onlineTransactions.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentOnlinePage(1);
  }, [selectedDate, searchQuery]);

  if (isLoadingDetails && students.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {selectedDate === todayString ? "Today's Dashboard" : 'Daily Collection Dashboard'}
            </h2>
            {isLoadingDetails && (
              <Badge
                variant="outline"
                className="flex items-center gap-1.5 bg-amber-50 text-[#F59E0B] text-[10px] font-bold border-amber-200 animate-pulse px-2.5 py-0.5"
              >
                <Loader2 className="h-3 w-3 text-[#F59E0B]" />
                Syncing...
              </Badge>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{formattedSelectedDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder="Search payments..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full md:w-56 pl-9 bg-white shadow-xs rounded-xl text-xs font-semibold placeholder:font-normal"
            />
          </div>

          <Button
            onClick={() => setScreen('collect-fee')}
            className="flex items-center gap-1.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-[0.98] text-xs shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Collect Fee
          </Button>
        </div>
      </header>

      {/* Main Banner Card */}
      <Card className="bg-gradient-to-br from-[#11142a] via-[#1e1b4b] to-[#4338ca] text-white rounded-2xl shadow-xl relative overflow-hidden min-h-[160px] border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-blue-300/10 rounded-full translate-y-1/2 pointer-events-none" />

        <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-blue-200 uppercase">
              {selectedDate === todayString ? "Today's Total Collection" : `Total Collection on ${selectedDate}`}
            </span>
            <h3 className="text-4xl md:text-5xl font-extrabold mt-1 flex items-baseline tracking-tight">
              ₹{totalCollection.toLocaleString('en-IN')}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-blue-100">
            <div className="flex items-center gap-2 bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-400/30">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
              <span>
                English Medium: <strong className="text-white">₹{englishCol.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-400/30">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              <span>
                Gujarati Medium: <strong className="text-white">₹{gujaratiCol.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-900/40 px-3 py-1.5 rounded-full border border-blue-400/30">
              <span className="h-2 w-2 rounded-full bg-pink-400" />
              <span>
                Concessions Given: <strong className="text-white">₹{todayConcession.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            {cashExpensesForSelectedDate > 0 && (
              <div className="flex items-center gap-2 bg-rose-500/20 px-3 py-1.5 rounded-full border border-rose-400/30 text-rose-200">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span>
                  Cash Expenses: <strong className="text-white">₹{cashExpensesForSelectedDate.toLocaleString('en-IN')}</strong>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Modes Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {paymentModesData.map((mode) => {
          const Icon = mode.icon;
          return (
            <Card
              key={mode.label}
              className={`bg-white bg-gradient-to-br ${mode.tint} to-white shadow-xs hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden border`}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className={`p-2.5 rounded-xl border mb-2.5 ${mode.bg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{mode.label}</span>
                <strong className="text-slate-800 text-lg font-bold mt-0.5">₹{mode.value}</strong>
                {mode.subtitle && (
                  <Badge variant="outline" className="text-[10px] font-semibold text-rose-600 mt-1 bg-rose-50 border-rose-200">
                    {mode.subtitle}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Summary Statistics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`bg-white bg-gradient-to-br to-white shadow-xs hover:shadow-md transition-all duration-300 rounded-xl border ${stat.color}`}
            >
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider block">{stat.title}</span>
                  <strong className="text-2xl font-bold text-slate-800 block">{stat.value}</strong>
                  <span className="text-xs text-slate-500 font-medium block">{stat.subtitle}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70 text-slate-500 shadow-xs">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Recent Payments Section */}
      <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/40">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">
              Payments on {selectedDate === todayString ? 'Today' : selectedDate}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5 font-medium">
              Showing payment history logs matching selection.
            </CardDescription>
          </div>

          {/* Dynamic Date Picker & Browsing Controls inside the payments card */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs shrink-0 self-end sm:self-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevDay}
              className="h-7 w-7 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <div className="relative flex items-center">
              <Calendar className="h-3.5 w-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent pl-7 pr-2.5 py-0.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              />
            </div>

            {selectedDate !== todayString && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="h-6 px-2 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border-indigo-200 cursor-pointer"
                title="Go to Today"
              >
                Today
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNextDay}
              className="h-7 w-7 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/60 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Student</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Class</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Fee Type</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Amount</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Method</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Time</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      No transactions recorded for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{tx.studentName}</span>
                          {tx.status === 'RTE' && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                              RTE
                            </Badge>
                          )}
                        </div>
                        <span className="text-slate-400 text-[10px] block font-mono">{tx.studentCode}</span>
                      </TableCell>
                      <TableCell className="py-3.5 px-5 text-slate-600 font-semibold">{tx.classInfo}</TableCell>
                      <TableCell className="py-3.5 px-5 text-slate-600 font-semibold">{tx.feeType}</TableCell>
                      <TableCell className="py-3.5 px-5 font-bold text-slate-900">
                        {tx.amount === 0 ? (
                          '₹0'
                        ) : tx.amount === 1500 ? (
                          <span>
                            ₹1,500 <span className="text-[10px] text-slate-400 font-normal">of ₹3,500</span>
                          </span>
                        ) : (
                          `₹${tx.amount.toLocaleString('en-IN')}`
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            tx.method === 'ONLINE' || tx.method === 'UPI'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : tx.method === 'CASH'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : tx.method === 'CARD'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {tx.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 px-5 text-slate-400 text-xs font-semibold">{tx.time}</TableCell>
                      <TableCell className="py-3.5 px-5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            tx.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : tx.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination Panel */}
        {totalPages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border-t border-slate-100 p-4">
            <span className="text-xs font-semibold text-slate-500">
              Showing <span className="font-extrabold text-slate-800">{Math.min(filteredTransactions.length, (currentPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
              <span className="font-extrabold text-slate-800">{Math.min(filteredTransactions.length, currentPage * PAGE_SIZE)}</span> of{' '}
              <span className="font-extrabold text-slate-800">{filteredTransactions.length}</span> payments
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="h-8 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, arr) => {
                  const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="text-slate-400 px-1 text-xs">...</span>}
                      <Button
                        type="button"
                        size="sm"
                        variant={currentPage === page ? 'default' : 'outline'}
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 w-8 p-0 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  );
                })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="h-8 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Online Payment Gateway Logs Section */}
      <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden mt-6">
        <CardHeader className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/40">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Online Payment Gateway Logs</CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5 font-medium">
              Detailed Razorpay sub-methods and transaction IDs.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/60 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Student</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Gateway ID</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Sub-Method</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Amount</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Time</TableHead>
                  <TableHead className="py-3 px-5 text-slate-500 text-xs font-bold uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedOnlineTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-400">
                      No online transactions recorded for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOnlineTransactions.map((tx) => {
                    let subMethodText = 'Razorpay - Online';
                    if (tx.gatewayLog) {
                      const m = tx.gatewayLog.method;
                      if (m === 'upi') subMethodText = `UPI (${tx.gatewayLog.rawResponse?.vpa || 'N/A'})`;
                      else if (m === 'netbanking') subMethodText = `Net Banking (${tx.gatewayLog.rawResponse?.bank || 'N/A'})`;
                      else if (m === 'card') subMethodText = `Card (${tx.gatewayLog.rawResponse?.card?.network || 'N/A'})`;
                      else if (m === 'wallet') subMethodText = `Wallet (${tx.gatewayLog.rawResponse?.wallet || 'N/A'})`;
                      else subMethodText = `Razorpay - ${m}`;
                    }

                    return (
                      <TableRow key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="py-3.5 px-5">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900">{tx.studentName}</span>
                          </div>
                          <span className="text-slate-400 text-[10px] block font-mono">{tx.studentCode}</span>
                        </TableCell>
                        <TableCell className="py-3.5 px-5">
                          <Badge variant="secondary" className="font-mono text-xs font-bold">
                            {tx.gatewayTransactionId || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 px-5 text-indigo-600 font-bold text-xs">{subMethodText}</TableCell>
                        <TableCell className="py-3.5 px-5 font-bold text-slate-900">
                          ₹{tx.amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="py-3.5 px-5 text-slate-400 text-xs font-semibold">{tx.time}</TableCell>
                        <TableCell className="py-3.5 px-5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                              tx.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : tx.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination Panel for Online Logs */}
        {totalOnlinePages > 1 && (
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border-t border-slate-100 p-4">
            <span className="text-xs font-semibold text-slate-500">
              Showing <span className="font-extrabold text-slate-800">{Math.min(onlineTransactions.length, (currentOnlinePage - 1) * PAGE_SIZE + 1)}</span> to{' '}
              <span className="font-extrabold text-slate-800">{Math.min(onlineTransactions.length, currentOnlinePage * PAGE_SIZE)}</span> of{' '}
              <span className="font-extrabold text-slate-800">{onlineTransactions.length}</span> payments
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentOnlinePage === 1}
                onClick={() => setCurrentOnlinePage((prev) => Math.max(1, prev - 1))}
                className="h-8 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </Button>
              {Array.from({ length: totalOnlinePages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalOnlinePages || Math.abs(page - currentOnlinePage) <= 1)
                .map((page, index, arr) => {
                  const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="text-slate-400 px-1 text-xs">...</span>}
                      <Button
                        type="button"
                        size="sm"
                        variant={currentOnlinePage === page ? 'default' : 'outline'}
                        onClick={() => setCurrentOnlinePage(page)}
                        className={`h-8 w-8 p-0 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentOnlinePage === page
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  );
                })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentOnlinePage === totalOnlinePages}
                onClick={() => setCurrentOnlinePage((prev) => Math.min(totalOnlinePages, prev + 1))}
                className="h-8 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
