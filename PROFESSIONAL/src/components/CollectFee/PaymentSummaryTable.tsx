import React from 'react';

export interface LineItemConfig {
  paymentAmount: number;
  concessionAmount: number;
  paymentMethod: 'CASH' | 'CHEQUE' | 'ONLINE' | 'CARD' | 'NET BANKING' | 'CONCESSION';
  remark: string;
}

interface PaymentSummaryTableProps {
  selectedFees: { category: string; period: string }[];
  lineItems: Record<string, LineItemConfig>;
  setLineItems: React.Dispatch<React.SetStateAction<Record<string, LineItemConfig>>>;
  totalPayingNow: number;
  chequeNo: string;
  setChequeNo: (v: string) => void;
  bankName: string;
  setBankName: (v: string) => void;
  getDueAmount: (category: string, period: string) => number;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
}

export const PaymentSummaryTable: React.FC<PaymentSummaryTableProps> = ({
  selectedFees,
  lineItems,
  setLineItems,
  totalPayingNow,
  chequeNo,
  setChequeNo,
  bankName,
  setBankName,
  getDueAmount,
  onSubmit,
  isSubmitting = false,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Line-item table */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Fee Summary & Payment</h4>
        </div>

        {selectedFees.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-semibold text-sm">
            No fees selected. Please select fees above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-3">Fee Name (Total Due)</th>
                  <th className="px-4 py-3 w-40">Payment (₹)</th>
                  <th className="px-4 py-3 w-32">Concession (₹)</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedFees.map((f) => {
                  const key = `${f.category}|${f.period}`;
                  const due = getDueAmount(f.category, f.period);
                  const config = lineItems[key];
                  if (!config) return null;

                  return (
                    <tr key={key} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        <div className="flex flex-col">
                          <span>{f.category === 'BAG_KIT' ? 'BAG & KIT' : f.category} - {f.period}</span>
                          <span className="text-xs text-amber-600">Due: ₹{due.toLocaleString('en-IN')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={config.paymentAmount === 0 ? '' : config.paymentAmount}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value) || 0;
                            if (val > due) val = due;
                            const newConcession = Math.max(0, due - val);
                            setLineItems((prev) => {
                              const currentConf = prev[key] || {
                                paymentAmount: 0,
                                concessionAmount: 0,
                                paymentMethod: 'CASH' as const,
                                remark: '',
                              };
                              return {
                                ...prev,
                                [key]: {
                                  ...currentConf,
                                  paymentAmount: val,
                                  concessionAmount:
                                    currentConf.concessionAmount + val > due
                                      ? newConcession
                                      : currentConf.concessionAmount,
                                },
                              };
                            });
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={config.concessionAmount === 0 ? '' : config.concessionAmount}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value) || 0;
                            if (val > due) val = due;
                            const newPayment = Math.max(0, due - val);
                            setLineItems((prev) => {
                              const currentConf = prev[key] || {
                                paymentAmount: 0,
                                concessionAmount: 0,
                                paymentMethod: 'CASH' as const,
                                remark: '',
                              };
                              return {
                                ...prev,
                                [key]: {
                                  ...currentConf,
                                  concessionAmount: val,
                                  paymentAmount:
                                    currentConf.paymentAmount + val > due
                                      ? newPayment
                                      : currentConf.paymentAmount,
                                },
                              };
                            });
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4 text-xs font-semibold">
                          {(['CASH', 'CHEQUE', 'ONLINE', 'CARD'] as const).map((mode) => (
                            <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`mode-${key}`}
                                value={mode}
                                checked={config.paymentMethod === mode}
                                onChange={() => {
                                  setLineItems((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], paymentMethod: mode },
                                  }));
                                }}
                                className="accent-blue-600"
                              />
                              {mode}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={config.remark}
                          onChange={(e) => {
                            setLineItems((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], remark: e.target.value },
                            }));
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="Optional remark"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#134e4a] text-white">
                <tr>
                  <td className="px-4 py-4 font-bold text-right" colSpan={1}>Total Payable</td>
                  <td className="px-4 py-4 font-extrabold text-lg">₹{totalPayingNow.toLocaleString('en-IN')}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Cheque info — shown when any line item uses CHEQUE */}
      {Object.values(lineItems).some((item) => item.paymentMethod === 'CHEQUE') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-purple-50 border border-purple-100 rounded-xl">
          <div>
            <label className="block text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">
              Global Cheque No.
            </label>
            <input
              type="text"
              value={chequeNo}
              onChange={(e) => setChequeNo(e.target.value)}
              placeholder="123456"
              className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">
              Global Bank Name
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="SBI, HDFC..."
              className="w-full bg-white border border-purple-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={selectedFees.length === 0 || isSubmitting}
        className={`w-full py-3.5 rounded-xl font-bold tracking-wide transition-all text-center flex items-center justify-center gap-2 ${
          selectedFees.length === 0 || isSubmitting
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            : 'bg-[#F59E0B] hover:bg-amber-600 text-slate-900 shadow-lg shadow-amber-500/10 hover:scale-[1.01] active:scale-[0.99]'
        }`}
      >
        {isSubmitting
          ? 'Processing Payment...'
          : selectedFees.length === 0
          ? 'Select a fee above to collect'
          : `Collect Payment of ₹${totalPayingNow.toLocaleString('en-IN')}`}
      </button>
    </form>
  );
};
