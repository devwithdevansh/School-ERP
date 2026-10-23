import React, { useState } from 'react';
import { usePlan } from '../context/PlanContext';
import { Check, Info, Sparkles, X, Shield, User, FileSpreadsheet, Send, ArrowRight } from './icons';

export const PlanSwitcher: React.FC = () => {
  const { plan, setPlan, isBasic, demoRole, setDemoRole } = usePlan();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Plan Switcher Segmented Control */}
        <div className="flex items-center rounded-xl bg-slate-900/90 p-1 shadow-inner border border-slate-700/60 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setPlan('BASIC')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
              isBasic
                ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-sm ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Basic Plan (Essential) - Simplified teacher workflows, assisted attendance & admin centralized records"
          >
            <span className="text-amber-300">⚡</span>
            <span>Basic</span>
            <span className="hidden sm:inline text-[10px] font-normal opacity-85">(Essential)</span>
          </button>

          <button
            type="button"
            onClick={() => setPlan('STANDARD')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
              !isBasic
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 text-white shadow-sm ring-1 ring-white/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Standard Plan (Professional) - Full interactive ERP suite across all departments"
          >
            <span className="text-pink-300">🚀</span>
            <span>Standard</span>
            <span className="hidden sm:inline text-[10px] font-normal opacity-85">(Professional)</span>
          </button>
        </div>

        {/* Demo Role Switcher (Admin vs Teacher preview) */}
        <div className="hidden md:flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-medium">
          <span className="px-1.5 text-slate-400 text-[10px]">Preview:</span>
          <button
            type="button"
            onClick={() => setDemoRole('ADMIN')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-all ${
              demoRole === 'ADMIN'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="h-3 w-3 text-indigo-500" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => setDemoRole('TEACHER')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition-all ${
              demoRole === 'TEACHER'
                ? 'bg-white text-teal-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="h-3 w-3 text-teal-600" />
            <span>Teacher</span>
          </button>
        </div>

        {/* Brochure Comparison Modal Trigger */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-xs"
          title="Compare Basic vs Standard Plan according to DevWithDevansh Brochure"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Brochure Comparison Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm">
                  DWD
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">Plan Feature Comparison</h3>
                  <p className="text-xs text-slate-500">DevWithDevansh Education Software Plans (Starting ₹9,999/yr)</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5">
              {/* Basic Plan Column */}
              <div className={`rounded-xl border p-4 transition-all ${
                isBasic ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wide">
                    Level 01 · Essential
                  </span>
                  {isBasic && <span className="text-[11px] font-bold text-teal-700">● Active View</span>}
                </div>
                <h4 className="mt-2 font-display text-lg font-bold text-slate-900">Basic Plan</h4>
                <p className="text-xs text-slate-600 mt-1">
                  For institutes starting their digital journey without disrupting existing paper & Excel habits.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                    <span><strong>1-Page Class Attendance</strong>: Simple touch roster for class teachers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                    <span><strong>Submit to Admin / Excel</strong>: Teacher submits directly to admin or exports Excel.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                    <span><strong>Teacher Read-Only Views</strong>: Marks & academic records guarded and admin-managed.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                    <span><strong>Core Fees & Receipts</strong>: Fee tracking, receipts, dues list.</span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => { setPlan('BASIC'); setShowModal(false); }}
                  className="mt-5 w-full rounded-lg bg-teal-600 py-2 text-xs font-semibold text-white hover:bg-teal-700 transition"
                >
                  Switch to Basic Plan View
                </button>
              </div>

              {/* Standard Plan Column */}
              <div className={`rounded-xl border p-4 transition-all ${
                !isBasic ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wide">
                    Level 02 · Professional
                  </span>
                  {!isBasic && <span className="text-[11px] font-bold text-indigo-700">● Active View</span>}
                </div>
                <h4 className="mt-2 font-display text-lg font-bold text-slate-900">Standard Plan</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Broader digital management across departments with interactive teacher and admin autonomy.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Full Attendance Suite</strong>: Period tracking, leaves, timetable link.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Interactive Marks Entry</strong>: Direct grading, automated report card compilation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Teacher Allocation & Roles</strong>: Granular permissions, timetable scheduler.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Full Automation & Add-ons</strong>: WhatsApp notifications, fee structures, parent app ready.</span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => { setPlan('STANDARD'); setShowModal(false); }}
                  className="mt-5 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2 text-xs font-semibold text-white hover:from-indigo-700 hover:to-violet-700 transition"
                >
                  Switch to Standard Plan View
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/80 border border-amber-200/70 p-3 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Brochure Philosophy</strong>: <em>"We don't ask your institute to change its workflow just to fit our software. Start small, expand later."</em>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
