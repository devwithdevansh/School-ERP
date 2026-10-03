import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import {
  Plus,
  Search,
  Calendar,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  LayoutGrid,
  List,
  Trash2,
  Coffee,
  FileText,
  Wrench,
  Zap,
  Truck,
  Users,
  Tag,
  Loader2,
  X,
  CreditCard,
  RotateCcw,
  AlertCircle
} from 'lucide-react';



export const TodayExpenses: React.FC = () => {
  const { expenses, transactions, addExpense, deleteExpense, reverseExpense } = useApp();

  const todayString = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayString);
  const [viewMode, setViewMode] = useState<'card' | 'row'>('card');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reversal Modal State
  const [reversingItem, setReversingItem] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [isReversing, setIsReversing] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    paymentMethod: 'CASH' as 'CASH' | 'BANK' | 'ONLINE',
    description: '',
    date: todayString
  });

  // Calculate gross cash collection for the selected date from student payment transactions
  const grossCashCollection = useMemo(() => {
    return transactions.reduce((acc, tx: any) => {
      const txDate = new Date(tx.createdAt).toISOString().split('T')[0];
      if (txDate === selectedDate && tx.method?.toUpperCase() === 'CASH') {
        return acc + (tx.amount || 0);
      }
      return acc;
    }, 0);
  }, [transactions, selectedDate]);

  // Filter expenses for selected date
  const filteredDateExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
      return expDate === selectedDate;
    });
  }, [expenses, selectedDate]);

  // Total active cash expenses for selected date (excluding reversed)
  const cashExpensesTotal = useMemo(() => {
    return filteredDateExpenses.reduce((acc, exp) => {
      if (!exp.isReversed && exp.paymentMethod === 'CASH') {
        return acc + (exp.amount || 0);
      }
      return acc;
    }, 0);
  }, [filteredDateExpenses]);

  // Total active overall expenses for selected date (Cash + Bank + Online, excluding reversed)
  const totalExpensesAllModes = useMemo(() => {
    return filteredDateExpenses.reduce((acc, exp) => {
      if (!exp.isReversed) {
        return acc + (exp.amount || 0);
      }
      return acc;
    }, 0);
  }, [filteredDateExpenses]);

  // Net Cash in Hand = Gross Cash - Cash Expenses
  const netCashCollection = grossCashCollection - cashExpensesTotal;

  // Search filtered expenses
  const displayedExpenses = useMemo(() => {
    if (!searchQuery.trim()) return filteredDateExpenses;
    const query = searchQuery.toLowerCase();
    return filteredDateExpenses.filter(
      (exp) =>
        exp.title.toLowerCase().includes(query) ||
        exp.category.toLowerCase().includes(query) ||
        (exp.description && exp.description.toLowerCase().includes(query))
    );
  }, [filteredDateExpenses, searchQuery]);

  const handleOpenModal = () => {
    setFormData({
      title: '',
      amount: '',
      paymentMethod: 'CASH',
      description: '',
      date: selectedDate
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount || Number(formData.amount) <= 0) {
      alert('Please enter a valid expense title and positive amount.');
      return;
    }

    if (formData.paymentMethod === 'CASH' && Number(formData.amount) > netCashCollection) {
      alert(`Expense amount (₹${formData.amount}) cannot be greater than the Net Cash in Hand (₹${netCashCollection}).`);
      return;
    }

    setIsSubmitting(true);
    const success = await addExpense({
      title: formData.title.trim(),
      category: 'Miscellaneous',
      amount: Number(formData.amount),
      paymentMethod: formData.paymentMethod,
      description: formData.description.trim(),
      date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
    });

    setIsSubmitting(false);
    if (success) {
      setIsModalOpen(false);
    } else {
      alert('Failed to save expense. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense permanently?')) {
      setDeletingId(id);
      await deleteExpense(id);
      setDeletingId(null);
    }
  };

  const handleOpenReverseModal = (exp: any) => {
    setReversingItem(exp);
    setReversalReason('');
  };

  const handleConfirmReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingItem) return;

    setIsReversing(true);
    const success = await reverseExpense(reversingItem._id, reversalReason.trim());
    setIsReversing(false);

    if (success) {
      setReversingItem(null);
      setReversalReason('');
    } else {
      alert('Failed to reverse expense. Please try again.');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Tea & Snacks':
        return <Coffee className="h-5 w-5 text-amber-600" />;
      case 'Stationery & Office Supplies':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'Maintenance & Repairs':
        return <Wrench className="h-5 w-5 text-purple-600" />;
      case 'Utilities & Electricity':
        return <Zap className="h-5 w-5 text-yellow-600" />;
      case 'Transport & Fuel':
        return <Truck className="h-5 w-5 text-emerald-600" />;
      case 'Staff & Welfare':
        return <Users className="h-5 w-5 text-rose-600" />;
      default:
        return <Tag className="h-5 w-5 text-slate-600" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Tea & Snacks':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Stationery & Office Supplies':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Maintenance & Repairs':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Utilities & Electricity':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Transport & Fuel':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Staff & Welfare':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-blue-600" />
            Today's Expenses & Cash Flow
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage daily expenditures, track net cash in hand, and perform expense reversals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-medium text-slate-700 focus:outline-none bg-transparent"
            />
          </div>

          {/* Add Expense Button */}
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Cash Collection & Expenses Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Cash Collection Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Cash Collected</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Coins className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-800">
              ₹{grossCashCollection.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Received from student payments
            </div>
          </div>
        </div>

        {/* Today's Cash Expenses Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Cash Expenses</span>
            <div className="p-2.5 bg-rose-50 rounded-xl">
              <ArrowDownRight className="h-5 w-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-800">
              ₹{cashExpensesTotal.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Deducted from cash in hand
            </div>
          </div>
        </div>

        {/* Updated Net Cash Collection Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Net Cash In Hand</span>
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/20">
              <Wallet className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              ₹{netCashCollection.toLocaleString('en-IN')}
            </span>
            <div className="text-xs text-slate-300 font-medium mt-1">
              Gross Cash - Cash Expenses
            </div>
          </div>
        </div>

        {/* Total Expenses (All Modes) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Expenses Count</span>
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-800">
              {filteredDateExpenses.filter(e => !e.isReversed).length} <span className="text-sm font-normal text-slate-500">active</span>
            </span>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Active Spent: ₹{totalExpensesAllModes.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Controls Bar: Search & View Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 font-medium mr-1">View:</span>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg border transition-all ${
                viewMode === 'card'
                  ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-xs'
                  : 'text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Card View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('row')}
              className={`p-2 rounded-lg border transition-all ${
                viewMode === 'row'
                  ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-xs'
                  : 'text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Row View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expenses Listing */}
        {displayedExpenses.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-500 font-medium">No expenses recorded for this date.</p>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add an expense now
            </button>
          </div>
        ) : viewMode === 'card' ? (
          /* Card View Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {displayedExpenses.map((exp) => (
              <div
                key={exp._id}
                className={`border rounded-xl p-4 shadow-xs transition-shadow relative flex flex-col justify-between group ${
                  exp.isReversed
                    ? 'bg-slate-50/70 border-rose-200/80 opacity-75'
                    : 'bg-white border-slate-200 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                        {getCategoryIcon(exp.category)}
                      </div>
                      <div>
                        <h3 className={`text-sm font-semibold text-slate-800 line-clamp-1 ${exp.isReversed ? 'line-through text-slate-500' : ''}`}>
                          {exp.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(exp.category)}`}>
                            {exp.category}
                          </span>
                          {exp.isReversed && (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                              REVERSED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!exp.isReversed && (
                        <button
                          onClick={() => handleOpenReverseModal(exp)}
                          className="text-amber-500 hover:text-amber-700 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                          title="Reverse Expense"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exp._id)}
                        disabled={deletingId === exp._id}
                        className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Permanently"
                      >
                        {deletingId === exp._id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      {exp.description}
                    </p>
                  )}

                  {exp.isReversed && exp.reversedReason && (
                    <p className="text-xs text-rose-600 mt-2 bg-rose-50/60 p-2 rounded-lg border border-rose-100 font-medium flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Reason: {exp.reversedReason}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-500">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      exp.paymentMethod === 'CASH'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {exp.paymentMethod}
                    </span>
                    <span>{new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <span className={`text-base font-bold ${exp.isReversed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Row / Table View */
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50/50">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Status / Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedExpenses.map((exp) => (
                  <tr key={exp._id} className={`hover:bg-slate-50/80 transition-colors ${exp.isReversed ? 'bg-slate-50/50' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(exp.category)}
                        <span className={exp.isReversed ? 'line-through text-slate-400' : ''}>{exp.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(exp.category)}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        exp.paymentMethod === 'CASH'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs">
                      {exp.isReversed ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Reversed: {exp.reversedReason || 'No reason provided'}
                        </span>
                      ) : (
                        <span className="truncate block">{exp.description || '—'}</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${exp.isReversed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!exp.isReversed && (
                          <button
                            onClick={() => handleOpenReverseModal(exp)}
                            className="text-amber-500 hover:text-amber-700 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                            title="Reverse Expense"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(exp._id)}
                          disabled={deletingId === exp._id}
                          className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete Permanently"
                        >
                          {deletingId === exp._id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-rose-600 mx-auto" />
                          ) : (
                            <Trash2 className="h-4 w-4 mx-auto" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                Add New Expense
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Expense Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tea & Refreshments for Staff"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 250"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentMethod: e.target.value as 'CASH' | 'BANK' | 'ONLINE' })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="CASH">Cash (Deducts from Cash Collection)</option>
                    <option value="BANK">Bank Transfer / Cheque</option>
                    <option value="ONLINE">UPI / Online</option>
                  </select>
                </div>
              </div>



              {/* Expense Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add additional details if required..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-xl shadow-xs transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save Expense</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverse Expense Confirmation Modal */}
      {reversingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600" />
                Reverse Expense
              </h2>
              <button
                onClick={() => setReversingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-semibold">Confirm Expense Reversal:</p>
              <p className="mt-0.5">
                Expense <strong>"{reversingItem.title}"</strong> for <strong>₹{reversingItem.amount.toLocaleString('en-IN')}</strong> will be marked as reversed and its amount will be added back to your cash collection.
              </p>
            </div>

            <form onSubmit={handleConfirmReverse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Reversal (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Incorrect entry, refunded cash"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReversingItem(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-5 py-2 rounded-xl shadow-xs transition-colors"
                >
                  {isReversing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reversing...
                    </>
                  ) : (
                    <>Confirm Reversal</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayExpenses;
