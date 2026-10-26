import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { InstallmentPart, ScheduleType } from '../../store';
import { Plus, Trash2, Check, AlertCircle, RefreshCw } from '../icons';

export interface PaymentScheduleEditorProps {
  annualFee: number;
  scheduleType: ScheduleType;
  installmentParts: InstallmentPart[];
  onChange: (scheduleType: ScheduleType, parts: InstallmentPart[]) => void;
  academicYear?: string;
}

const MONTHS_LIST = [
  'June', 'July', 'August', 'September', 'October', 'November',
  'December', 'January', 'February', 'March', 'April', 'May'
];

export const PRESET_OPTIONS: { id: ScheduleType; label: string; desc: string; count: number }[] = [
  { id: 'DEFAULT_12_2', label: '12 Mo + 2 Terms', desc: 'Default 14 parts (12 monthly tuition + 2 term fees)', count: 14 },
  { id: 'MONTHLY_12', label: '12 Monthly', desc: '12 equal monthly installments without separate terms', count: 12 },
  { id: 'QUARTERLY_4', label: 'Quarterly', desc: '4 installments (Jun, Sep, Dec, Mar)', count: 4 },
  { id: 'HALF_YEARLY_2', label: 'Half-Yearly', desc: '2 semester installments (Jun & Nov)', count: 2 },
  { id: 'ANNUAL_1', label: 'Annual (1 Part)', desc: '100% full payment upfront in June', count: 1 },
  { id: 'CUSTOM', label: 'Custom Parts', desc: 'Arbitrary installment parts, names & amounts', count: 0 },
];

/**
 * Generate standard preset installment parts based on annual fee.
 */
export function generatePresetParts(type: ScheduleType, annualFee: number): InstallmentPart[] {
  const fee = Number(annualFee) || 0;

  if (type === 'DEFAULT_12_2') {
    // Standard 14 parts handled by default ledger generator
    return [];
  }

  if (type === 'MONTHLY_12') {
    const base = Math.floor(fee / 12);
    const rem = fee - (base * 12);
    return MONTHS_LIST.map((m, idx) => ({
      name: `${m} Tuition`,
      feeType: 'EDUCATION',
      amount: idx === 0 ? base + rem : base,
      dueMonth: m,
      order: idx + 1,
    }));
  }

  if (type === 'QUARTERLY_4') {
    const quarters = [
      { name: '1st Quarter (Jun - Aug)', month: 'June' },
      { name: '2nd Quarter (Sep - Nov)', month: 'September' },
      { name: '3rd Quarter (Dec - Feb)', month: 'December' },
      { name: '4th Quarter (Mar - May)', month: 'March' },
    ];
    const base = Math.floor(fee / 4);
    const rem = fee - (base * 4);
    return quarters.map((q, idx) => ({
      name: q.name,
      feeType: 'EDUCATION',
      amount: idx === 0 ? base + rem : base,
      dueMonth: q.month,
      order: idx + 1,
    }));
  }

  if (type === 'HALF_YEARLY_2') {
    const halves = [
      { name: 'Term 1 Installment', month: 'June' },
      { name: 'Term 2 Installment', month: 'November' },
    ];
    const base = Math.floor(fee / 2);
    const rem = fee - (base * 2);
    return halves.map((h, idx) => ({
      name: h.name,
      feeType: 'EDUCATION',
      amount: idx === 0 ? base + rem : base,
      dueMonth: h.month,
      order: idx + 1,
    }));
  }

  if (type === 'ANNUAL_1') {
    return [
      {
        name: 'Full Annual Fee',
        feeType: 'EDUCATION',
        amount: fee,
        dueMonth: 'June',
        order: 1,
      },
    ];
  }

  return [];
}

export const PaymentScheduleEditor: React.FC<PaymentScheduleEditorProps> = ({
  annualFee,
  scheduleType,
  installmentParts,
  onChange,
}) => {
  const currentTotal = useMemo(() => {
    return installmentParts.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [installmentParts]);

  const difference = (Number(annualFee) || 0) - currentTotal;
  const isBalanced = Math.abs(difference) === 0;

  // Auto-split evenly across parts
  const handleSplitEvenly = () => {
    if (installmentParts.length === 0) return;
    const fee = Number(annualFee) || 0;
    const count = installmentParts.length;
    const base = Math.floor(fee / count);
    const rem = fee - (base * count);

    const updated = installmentParts.map((p, idx) => ({
      ...p,
      amount: idx === 0 ? base + rem : base,
    }));
    onChange(scheduleType, updated);
  };

  // Switch preset schedule
  const handleSelectPreset = (type: ScheduleType) => {
    if (type === 'DEFAULT_12_2') {
      onChange('DEFAULT_12_2', []);
      return;
    }
    const newParts = generatePresetParts(type, annualFee);
    onChange(type, newParts);
  };

  // Add custom part
  const handleAddPart = () => {
    const nextOrder = installmentParts.length + 1;
    const defaultMonth = MONTHS_LIST[Math.min(nextOrder - 1, 11)] || 'June';
    const newPart: InstallmentPart = {
      name: `Installment ${nextOrder}`,
      feeType: 'EDUCATION',
      amount: Math.max(0, difference),
      dueMonth: defaultMonth,
      order: nextOrder,
    };
    onChange('CUSTOM', [...installmentParts, newPart]);
  };

  // Remove custom part
  const handleRemovePart = (index: number) => {
    const updated = installmentParts.filter((_, i) => i !== index);
    onChange(scheduleType === 'CUSTOM' ? 'CUSTOM' : scheduleType, updated);
  };

  // Update part field
  const handlePartChange = (index: number, field: keyof InstallmentPart, value: any) => {
    const updated = [...installmentParts];
    updated[index] = { ...updated[index], [field]: value };
    onChange(scheduleType, updated);
  };

  return (
    <div className="space-y-4">
      {/* 1. Preset Selector Buttons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Fee Schedule Schema
          </label>
          <span className="text-[11px] font-semibold text-slate-500">
            {scheduleType === 'DEFAULT_12_2' ? 'Standard 14 Parts' : `${installmentParts.length} Installment Parts`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESET_OPTIONS.map((opt) => {
            const isSelected = scheduleType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectPreset(opt.id)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Default Mode Note */}
      {scheduleType === 'DEFAULT_12_2' && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800">Classic School Fee Cycle:</p>
          <p className="text-[11px] leading-relaxed">
            Fees are split into <strong>12 monthly education installments</strong> (June to May) and <strong>2 term fees</strong> (Term 1 & Term 2). Each installment is automatically calculated as <code>Annual Fee ÷ 14</code>.
          </p>
        </div>
      )}

      {/* 3. Installments Table / Builder (For Non-Default Presets) */}
      {scheduleType !== 'DEFAULT_12_2' && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              Installments Breakdown
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSplitEvenly}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                title="Divide annual fee equally across parts"
              >
                <RefreshCw className="h-3 w-3" />
                Split Evenly
              </button>
              <button
                type="button"
                onClick={handleAddPart}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="h-3 w-3 stroke-[2.5]" />
                Add Part
              </button>
            </div>
          </div>

          {/* Parts List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {installmentParts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                No installment parts added. Click "+ Add Part" or choose a preset above.
              </div>
            ) : (
              installmentParts.map((part, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/90 shadow-2xs text-xs"
                >
                  <span className="w-5 text-center text-[10px] font-black text-slate-400 shrink-0">
                    #{index + 1}
                  </span>

                  {/* Part Name */}
                  <input
                    type="text"
                    value={part.name}
                    onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                    placeholder="e.g. Q1 Fee"
                    className="flex-1 min-w-[110px] font-semibold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  {/* Due Month */}
                  <select
                    value={part.dueMonth || 'June'}
                    onChange={(e) => handlePartChange(index, 'dueMonth', e.target.value)}
                    className="w-28 font-semibold text-slate-700 bg-slate-50/70 border border-slate-200 rounded-lg px-2 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>

                  {/* Amount */}
                  <div className="relative w-28 shrink-0">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={part.amount}
                      onChange={(e) =>
                        handlePartChange(index, 'amount', e.target.value === '' ? 0 : Number(e.target.value))
                      }
                      min={0}
                      className="w-full pl-6 pr-2 py-1.5 font-bold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Delete button */}
                  {installmentParts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePart(index)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                      title="Remove installment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Balance Status Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs font-bold">
            <span className="text-slate-600">
              Total of {installmentParts.length} Parts: <span className="text-slate-900">₹{currentTotal.toLocaleString('en-IN')}</span>
            </span>

            {isBalanced ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Check className="h-3 w-3 stroke-[3]" /> Balanced with Annual Fee
              </span>
            ) : difference > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <AlertCircle className="h-3 w-3" /> ₹{difference.toLocaleString('en-IN')} unassigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                <AlertCircle className="h-3 w-3" /> ₹{Math.abs(difference).toLocaleString('en-IN')} over annual fee
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentScheduleEditor;
