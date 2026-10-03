import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { Student } from '../../mockData';
import type { buildEduTermConfig } from './utils';

type EduTermConfig = ReturnType<typeof buildEduTermConfig>;

interface StudentFeeConfig {
  education: number;
  term: number;
  transport: number;
  admission: number;
  bagKit: number;
}

interface LedgerEntry {
  _id?: string;
  id?: string;
  studentId: string;
  feeType: string;
  feePeriod: string;
  status: string;
  totalAmount: number;
  remainingAmount: number;
  academicYear?: string;
}

interface FeeGridProps {
  feeCategory: 'EDUCATION' | 'TRANSPORT' | 'ADMISSION' | 'BAG_KIT' | 'OTHER';
  selectedStudent: Student;
  selectedFees: { category: string; period: string }[];
  setSelectedFees: React.Dispatch<React.SetStateAction<{ category: string; period: string }[]>>;
  isRegenerating: boolean;
  midYearTransportLedgers: LedgerEntry[];
  COMBINED_EDU_TERM_CONFIG: EduTermConfig;
  MONTHS_CONFIG: EduTermConfig;
  studentFeeConfig: StudentFeeConfig;
  getApplicablePeriods: (config: EduTermConfig, overrideCategory?: string) => EduTermConfig;
  getLedger: (category: string, period: string) => LedgerEntry | undefined;
  getDueAmount: (category: string, period: string) => number;
  isOverdue: (category: string, period: string) => boolean;
  handlePeriodToggle: (category: string, period: string) => void;
  selectNextNMonths: (n: number) => void;
  selectAllPending: () => void;
}

export const FeeGrid: React.FC<FeeGridProps> = ({
  feeCategory,
  selectedStudent,
  selectedFees,
  setSelectedFees,
  isRegenerating,
  midYearTransportLedgers,
  COMBINED_EDU_TERM_CONFIG,
  MONTHS_CONFIG,
  studentFeeConfig,
  getApplicablePeriods,
  getLedger,
  getDueAmount,
  isOverdue,
  handlePeriodToggle,
  selectNextNMonths,
  selectAllPending,
}) => {
  const skipTransportGrid =
    feeCategory === 'TRANSPORT' &&
    selectedStudent.transportType === 'None' &&
    midYearTransportLedgers.length === 0;

  return (
    <div
      className={`border rounded-xl p-5 border-l-4 ${
        feeCategory === 'EDUCATION'
          ? 'border-blue-100 bg-blue-50/30 border-l-blue-500'
          : 'border-emerald-100 bg-emerald-50/30 border-l-emerald-500'
      }`}
    >
      {/* Header row */}
      <div className="flex justify-between items-center mb-6">
        <span
          className={`font-bold flex items-center gap-2 ${
            feeCategory === 'EDUCATION' ? 'text-blue-700' : 'text-emerald-700'
          }`}
        >
          {feeCategory === 'EDUCATION' ? '📚 Education & Term Fee' : '🚌 Transport Fee'}
        </span>
        <span
          className={`font-extrabold text-lg ${
            feeCategory === 'EDUCATION' ? 'text-blue-600' : 'text-emerald-600'
          }`}
        >
          {feeCategory === 'EDUCATION' && selectedStudent.isRTE ? (
            <span className="flex items-center gap-2">
              <span className="line-through text-slate-400 font-semibold text-sm">
                ₹{studentFeeConfig.education.toLocaleString('en-IN')}/month
              </span>
              <span className="text-[10px] font-extrabold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 uppercase tracking-wider">
                RTE Waived
              </span>
            </span>
          ) : (
            `₹${(feeCategory === 'EDUCATION'
              ? studentFeeConfig.education
              : studentFeeConfig.transport
            ).toLocaleString('en-IN')}/month`
          )}
        </span>
      </div>

      {/* RTE banner */}
      {feeCategory === 'EDUCATION' && selectedStudent.isRTE && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5">🎓</span>
          <div>
            <h5 className="font-extrabold text-blue-800 text-xs uppercase tracking-wide">RTE Quota Student</h5>
            <p className="text-xs text-blue-600/90 mt-1 leading-relaxed font-semibold">
              This student is enrolled under the Right to Education (RTE) quota. Annual tuition and term fees are fully waived/covered.
            </p>
          </div>
        </div>
      )}

      {/* Quick-select controls */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-slate-500">
          Select any month(s) — paid months are greyed, due months are highlighted
        </p>
        <div className="flex gap-3 text-[10px] uppercase font-bold text-blue-600 shrink-0">
          <button type="button" onClick={() => selectNextNMonths(1)} className="hover:underline">1 Pay</button>
          <span>·</span>
          <button type="button" onClick={() => selectNextNMonths(3)} className="hover:underline">3 Pay</button>
          <span>·</span>
          <button type="button" onClick={() => selectNextNMonths(6)} className="hover:underline">6 Pay</button>
          <span>·</span>
          <button type="button" onClick={selectAllPending} className="hover:underline">Select All Due</button>
          <span>·</span>
          <button
            type="button"
            onClick={() =>
              setSelectedFees((prev) =>
                prev.filter((p) =>
                  feeCategory === 'EDUCATION'
                    ? p.category !== 'EDUCATION' && p.category !== 'TERM'
                    : p.category !== feeCategory
                )
              )
            }
            className="hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Auto-syncing spinner */}
      {isRegenerating && !skipTransportGrid && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-semibold">Automatically syncing fee amounts...</span>
        </div>
      )}

      {/* No transport warning */}
      {feeCategory === 'TRANSPORT' &&
        selectedStudent.transportType === 'None' &&
        midYearTransportLedgers.length === 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-semibold text-amber-700">
            This student has no transport subscription. Transport fee does not apply.
          </div>
        )}

      {/* Mid-year transport ledgers */}
      {feeCategory === 'TRANSPORT' && midYearTransportLedgers.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Mid-Year Transport</p>
          <div className="flex flex-col gap-2">
            {midYearTransportLedgers.map((ledger) => {
              const isPaid = ledger.status === 'PAID';
              const isSelected = selectedFees.some(
                (f) => f.category === 'TRANSPORT' && f.period === ledger.feePeriod
              );
              return (
                <button
                  key={ledger._id || ledger.id}
                  type="button"
                  disabled={isPaid}
                  onClick={() => {
                    if (isPaid) return;
                    setSelectedFees((prev) => {
                      const exists = prev.some(
                        (f) => f.category === 'TRANSPORT' && f.period === ledger.feePeriod
                      );
                      if (exists)
                        return prev.filter(
                          (f) => !(f.category === 'TRANSPORT' && f.period === ledger.feePeriod)
                        );
                      return [...prev, { category: 'TRANSPORT', period: ledger.feePeriod }];
                    });
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl transition-all ${
                    isPaid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 cursor-not-allowed'
                      : isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                      : 'bg-amber-50/40 border-amber-300 text-amber-700 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    <span className="text-sm font-bold">{ledger.feePeriod}</span>
                  </div>
                  <span className="text-sm font-extrabold">
                    {isPaid ? 'PAID' : `₹${ledger.remainingAmount.toLocaleString('en-IN')} DUE`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Standard monthly grid */}
      {!(feeCategory === 'TRANSPORT' && selectedStudent.transportType === 'None') && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
          {getApplicablePeriods(
            feeCategory === 'EDUCATION' ? COMBINED_EDU_TERM_CONFIG : MONTHS_CONFIG,
            feeCategory
          ).map((item) => {
            const activeCat = feeCategory === 'EDUCATION' ? item.type : feeCategory;
            const entry = getLedger(activeCat, item.value);

            // Hide transport months that are cancelled or do not exist (not within active transport months)
            if (activeCat === 'TRANSPORT' && (!entry || entry.status === 'CANCELLED')) {
              return null;
            }

            const isPaid = entry?.status === 'PAID';
            const isPending = entry && entry.status !== 'PAID';
            const isNew = !entry;
            const isSelected = selectedFees.some(
              (f) => f.category === activeCat && f.period === item.value
            );
            const dueAmt = getDueAmount(activeCat, item.value);
            const overdue = !isPaid && isPending && isOverdue(activeCat, item.value);
            const upcoming = !isPaid && isPending && !overdue;

            let btnStyle =
              'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/30';
            if (isPaid) {
              btnStyle =
                selectedStudent.isRTE && (activeCat === 'EDUCATION' || activeCat === 'TERM')
                  ? 'bg-blue-50 border-blue-200 text-blue-600 cursor-not-allowed'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 cursor-not-allowed';
            } else if (isSelected) {
              btnStyle =
                activeCat === 'TERM'
                  ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20';
            } else if (overdue) {
              btnStyle = 'border-red-300 text-red-700 bg-red-50/60 hover:border-red-400 hover:bg-red-50';
            } else if (upcoming) {
              btnStyle = 'border-amber-200 text-amber-600 bg-amber-50/30 hover:border-amber-300';
            } else if (isNew) {
              btnStyle = 'border-slate-200 bg-white text-slate-400 hover:border-blue-300 hover:bg-blue-50/20';
            }

            return (
              <button
                key={item.value}
                type="button"
                disabled={
                  isPaid ||
                  isNew ||
                  (activeCat === 'TRANSPORT' && selectedStudent.transportType === 'None')
                }
                onClick={() => handlePeriodToggle(activeCat, item.value)}
                className={`border rounded-xl py-2.5 text-center flex flex-col items-center justify-center transition-all relative select-none ${btnStyle} ${
                  activeCat === 'TERM' ? 'col-span-1 md:col-span-2' : ''
                }`}
              >
                {isSelected && <Check className="absolute top-1 right-1 h-2.5 w-2.5 stroke-[3]" />}
                <span
                  className={`font-bold tracking-wide ${activeCat === 'TERM' ? 'text-sm' : 'text-xs'}`}
                >
                  {item.label}
                </span>
                {item.year ? (
                  <span className="text-[9px] mt-0.5 opacity-70">'{item.year}</span>
                ) : (
                  <span className="text-[9px] mt-0.5 opacity-70 px-1">{item.sublabel}</span>
                )}
                <span
                  className={`text-[8px] font-extrabold uppercase mt-1 tracking-wide ${
                    overdue && !isSelected
                      ? 'text-red-600'
                      : upcoming && !isSelected
                      ? 'text-amber-500'
                      : ''
                  }`}
                >
                  {isPaid
                    ? selectedStudent.isRTE &&
                      (activeCat === 'EDUCATION' || activeCat === 'TERM')
                      ? 'RTE'
                      : 'PAID'
                    : overdue
                    ? `₹${dueAmt.toLocaleString('en-IN')}`
                    : upcoming
                    ? `₹${dueAmt.toLocaleString('en-IN')}`
                    : isNew
                    ? 'NEW'
                    : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
