import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

export interface TxItem {
  id: string; feeType: string; amount: number; concessionAmount?: number;
  status: string; method: string; remark?: string; date: string; time: string;
  academicYear?: string;
}

const CATEGORY_GROUPS = [
  {
    key: 'other',
    label: 'Other Fees',
    dotColor: 'bg-amber-400',
    headerBg: 'bg-amber-50',
    headerBorder: 'border-amber-200',
    headerText: 'text-amber-700',
    match: (ft: string) => !ft?.startsWith('Education Fee') && !ft?.startsWith('Term Fee') && !ft?.startsWith('Transport Fee'),
  },
  {
    key: 'eduTerm',
    label: 'Education & Term Fees',
    dotColor: 'bg-blue-400',
    headerBg: 'bg-blue-50',
    headerBorder: 'border-blue-200',
    headerText: 'text-blue-700',
    match: (ft: string) => ft?.startsWith('Education Fee') || ft?.startsWith('Term Fee'),
  },
  {
    key: 'transport',
    label: 'Transport Fees',
    dotColor: 'bg-emerald-400',
    headerBg: 'bg-emerald-50',
    headerBorder: 'border-emerald-200',
    headerText: 'text-emerald-700',
    match: (ft: string) => ft?.startsWith('Transport Fee'),
  },
] as const;

export const PaymentHistoryPanel: React.FC<{
  allTxs: TxItem[];
  reversePayment: (txId: string) => void;
}> = ({ allTxs, reversePayment }) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('All');

  const methodBadge = (method: string) => {
    if (method === 'CASH') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (method === 'CHEQUE') return 'bg-purple-50 text-purple-600 border-purple-100';
    if (method === 'ONLINE' || method === 'UPI') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (method === 'CARD') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  // Extract unique academic years from all transactions
  const uniqueYears = Array.from(new Set(allTxs.map(tx => tx.academicYear).filter(Boolean))) as string[];
  uniqueYears.sort((a, b) => b.localeCompare(a)); // Descending

  // Filter transactions by selected year
  const filteredTxs = selectedYear === 'All' ? allTxs : allTxs.filter(tx => tx.academicYear === selectedYear);

  // Categorize transactions into groups
  const grouped: { group: typeof CATEGORY_GROUPS[number]; items: TxItem[] }[] = [];
  for (const group of CATEGORY_GROUPS) {
    const matched = filteredTxs.filter(tx => group.match(tx.feeType));
    if (matched.length > 0) {
      grouped.push({ group, items: matched });
    }
  }

  const displayedTotal = filteredTxs.filter(tx => tx.status !== 'REVERSED').reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <History className="h-4 w-4 text-blue-500" />
          <h4 className="text-sm font-extrabold text-slate-800">Fee Collection History</h4>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
            {filteredTxs.length} records
          </span>
          {uniqueYears.length > 1 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="ml-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer"
            >
              <option value="All">All Years</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>
        {filteredTxs.length > 0 && (
          <div className="text-xs text-slate-500 font-semibold">
            Total Collected:&nbsp;
            <span className="text-emerald-600 font-extrabold">₹{displayedTotal.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {filteredTxs.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl py-10 text-center">
          <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-semibold">No payment history yet</p>
          <p className="text-xs text-slate-300 mt-1">Payments collected will appear here</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {grouped.map(({ group, items }) => {
            const isOpen = expandedGroup === group.key;
            const groupTotal = items.filter(t => t.status !== 'REVERSED').reduce((s, t) => s + t.amount, 0);
            const groupConcession = items.reduce((s, t) => s + (t.concessionAmount || 0), 0);
            const allReversed = items.every(t => t.status === 'REVERSED');

            return (
              <div
                key={group.key}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  allReversed
                    ? 'bg-red-50/30 border-red-100 opacity-60'
                    : isOpen
                    ? `bg-white ${group.headerBorder} shadow-sm ring-1 ring-blue-500/5`
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedGroup(isOpen ? null : group.key)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-2.5 w-2.5 rounded-full ${group.dotColor} shrink-0`}></div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm ${allReversed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {group.label}
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {items.length} record{items.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`font-extrabold text-base ${allReversed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        ₹{groupTotal.toLocaleString('en-IN')}
                      </div>
                      {groupConcession > 0 && (
                        <div className="text-[10px] text-purple-500 font-semibold">-₹{groupConcession.toLocaleString('en-IN')} off</div>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      allReversed ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {allReversed ? 'REVERSED' : 'PAID'}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Table */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200/60">
                          <th className="py-1.5 pr-2">Date</th>
                          <th className="py-1.5 pr-3">Fee</th>
                          <th className="py-1.5 px-2 text-right">Amount</th>
                          <th className="py-1.5 px-2 text-center">Method</th>
                          <th className="py-1.5 px-2 text-center">Status</th>
                          <th className="py-1.5 pl-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map(tx => {
                          const isReversed = tx.status === 'REVERSED';
                          const d = new Date(tx.date);
                          const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                          return (
                            <tr key={tx.id} className="hover:bg-slate-100/50 transition-colors">
                              <td className="py-2 pr-2 text-slate-400 font-semibold whitespace-nowrap">
                                {dateStr}
                              </td>
                              <td className={`py-2 pr-3 font-semibold ${isReversed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {tx.feeType ? (tx.feeType.split(' - ')[1] || tx.feeType) : 'General Fee'}
                                {tx.remark && <span className="text-slate-400 italic font-normal ml-1">({tx.remark})</span>}
                              </td>
                              <td className={`py-2 px-2 text-right font-bold ${isReversed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                ₹{tx.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${methodBadge(tx.method)} uppercase tracking-wider`}>
                                  {tx.method}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                  isReversed ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>{tx.status}</span>
                              </td>
                              <td className="py-2 pl-2 text-right">
                                {!isReversed && tx.method !== 'GOVT' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`Reverse ₹${tx.amount.toLocaleString('en-IN')} for ${tx.feeType}?\nThis will restore the balance.`)) {
                                        reversePayment(tx.id);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 font-bold px-2 py-1 rounded-lg text-[9px] transition-all"
                                  >
                                    <RotateCcw className="h-2.5 w-2.5" />
                                    Reverse
                                  </button>
                                ) : (
                                  <span className="text-slate-300 text-[9px] italic">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
