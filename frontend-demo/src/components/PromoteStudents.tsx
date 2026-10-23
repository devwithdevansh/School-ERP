import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Users, ArrowRight, CheckCircle, Search, ChevronDown, GraduationCap, ShieldAlert, Check, Info, X } from './icons';
import { getActiveStandards } from '../utils/standardUtils';

export const PromoteStudents: React.FC = () => {
  const { activeStudents, setScreen, academicYears, authFetch, feeStructures } = useApp();
  const [sourceMedium, setSourceMedium] = useState('English');
  const [sourceClass, setSourceClass] = useState('5');
  const [sourceDiv, setSourceDiv] = useState('A');
  const [targetClass, setTargetClass] = useState('6');
  const [targetDiv, setTargetDiv] = useState('A');
  const [targetYear, setTargetYear] = useState('2026-27');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPromoInfo, setShowPromoInfo] = useState(false);

  const activeYearName = React.useMemo(() => academicYears.find(y => y.isActive)?.name || academicYears[0]?.name || '', [academicYears]);

  // Derive source medium options dynamically from active year fee structures
  const sourceMediumOptions = React.useMemo(() => {
    const configuredMeds = feeStructures
      .filter(f => f.academicYear === activeYearName || (!f.academicYear && (activeYearName === academicYears[0]?.name)))
      .map(f => f.medium);
    const medSet = new Set(configuredMeds);
    if (medSet.size === 0) {
      return ['English', 'Gujarati'];
    }
    return Array.from(medSet);
  }, [feeStructures, activeYearName, academicYears]);

  // Derive source class options dynamically from active year fee structures
  const sourceClassOptions = React.useMemo(() => {
    return getActiveStandards(feeStructures, activeYearName, undefined);
  }, [feeStructures, activeYearName]);

  // Derive target class options dynamically from target year fee structures
  const targetClassOptions = React.useMemo(() => {
    return getActiveStandards(feeStructures, targetYear, undefined);
  }, [feeStructures, targetYear]);

  useEffect(() => {
    if (academicYears && academicYears.length > 0) {
      const active = academicYears.find(y => y.isActive);
      if (active) {
        setTargetYear(active.name);
      } else {
        setTargetYear(academicYears[0].name);
      }
    }
  }, [academicYears]);

  useEffect(() => {
    if (sourceMediumOptions.length > 0 && !sourceMediumOptions.includes(sourceMedium)) {
      setSourceMedium(sourceMediumOptions[0]);
    }
  }, [sourceMediumOptions, sourceMedium]);

  useEffect(() => {
    if (sourceClassOptions.length > 0 && !sourceClassOptions.includes(sourceClass)) {
      setSourceClass(sourceClassOptions[0]);
    }
  }, [sourceClassOptions, sourceClass]);

  useEffect(() => {
    if (targetClassOptions.length > 0 && !targetClassOptions.includes(targetClass)) {
      setTargetClass(targetClassOptions[0]);
    }
  }, [targetClassOptions, targetClass]);

  useEffect(() => {
    if (sourceClass) {
      const nextNum = parseInt(sourceClass, 10);
      let nextClass = sourceClass;
      if (!isNaN(nextNum)) {
        nextClass = (nextNum + 1).toString();
      } else if (sourceClass.toLowerCase() === 'playhouse') {
        nextClass = 'Nursery';
      } else if (sourceClass.toLowerCase() === 'nursery') {
        nextClass = 'LKG';
      } else if (sourceClass.toLowerCase() === 'lkg') {
        nextClass = 'UKG';
      } else if (sourceClass.toLowerCase() === 'ukg') {
        nextClass = '1';
      }

      if (targetClassOptions.includes(nextClass)) {
        setTargetClass(nextClass);
      } else if (targetClassOptions.length > 0) {
        setTargetClass(targetClassOptions.includes(nextClass) ? nextClass : targetClassOptions[0]);
      }
      setTargetDiv(sourceDiv);
    }
  }, [sourceClass, sourceDiv, targetClassOptions]);

  // Reset selected list when source configurations change
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [sourceMedium, sourceClass, sourceDiv]);

  const eligibleStudents = activeStudents.filter(s =>
    s.medium === sourceMedium &&
    String(s.standard).trim() === String(sourceClass).trim() &&
    String(s.division).trim() === String(sourceDiv).trim() &&
    (searchQuery === '' || s.studentName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleAll = () => {
    if (selectedStudentIds.length === eligibleStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleStudents.map(s => s._id || s.id));
    }
  };

  const toggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedStudentIds(prev => [...prev, id]);
    }
  };

  const handlePromote = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(`Promote ${selectedStudentIds.length} students to Std ${targetClass}-${targetDiv} for ${targetYear}?`)) return;

    setLoading(true);
    try {
      const res = await authFetch('/api/v1/students/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          targetStandard: targetClass,
          targetDivision: targetDiv,
          targetAcademicYear: targetYear
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setScreen('students');
        }, 2000);
      } else {
        alert('Failed to promote students');
      }
    } catch (err) {
      alert('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Premium Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden mb-6">
        {/* Background decorative elements */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-32 h-32 bg-indigo-400/10 rounded-full -mb-10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-extrabold text-indigo-100 uppercase tracking-wider backdrop-blur-sm">
              <GraduationCap className="h-3.5 w-3.5" /> Promotion Center
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Bulk Student Promotion</h2>
            <p className="text-indigo-100 text-xs md:text-sm max-w-2xl">
              Advance groups of students to their next standard, customize destination divisions, and assign academic years efficiently.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPromoInfo(!showPromoInfo)}
            className={`flex items-center justify-center gap-2 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-[0.99] shrink-0 border ${
              showPromoInfo
                ? 'bg-white text-indigo-800 border-white hover:bg-indigo-50'
                : 'bg-indigo-500/30 text-indigo-100 border-indigo-500/50 hover:bg-indigo-500/50 hover:text-white'
            }`}
          >
            <Info className="h-4 w-4" />
            {showPromoInfo ? 'Hide Promotion Guide' : 'How Promotion Works'}
          </button>
        </div>
      </div>

      {showPromoInfo && (
        <div className="bg-indigo-50/60 border border-indigo-150 rounded-2xl p-5 shadow-sm space-y-3.5 animate-fade-in mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2">
              <span className="text-xl">🎓</span>
              <div>
                <h4 className="font-extrabold text-indigo-900 text-sm">Understanding the Promotion Process</h4>
                <p className="text-[11px] text-indigo-700/80 font-medium mt-0.5">
                  Promotions are isolated by academic years. Read these key rules to ensure the process goes smoothly.
                </p>
              </div>
            </div>
            <button onClick={() => setShowPromoInfo(false)} className="text-indigo-400 hover:text-indigo-600 transition-colors p-1"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-1.5">
              <h5 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider text-indigo-600">1. Pre-requisite</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Before promoting, you <strong>MUST</strong> set up the target year's <strong>Fee Structure</strong> first in Setup. The system needs this to calculate their new monthly fee amounts.
              </p>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-1.5">
              <h5 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider text-indigo-600">2. Ledger Generation</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Promoting creates the student's monthly ledgers for the <strong>target academic year</strong> using the fee structure defined for their <strong>promoted standard</strong>.
              </p>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-1.5">
              <h5 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider text-indigo-600">3. Ledger Isolation</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Fees from previous years remain unchanged at their original rates. The new year's ledgers are fully isolated from the previous year.
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 font-bold border border-emerald-200 shadow-sm animate-fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Students successfully promoted! Redirecting to dashboard...</span>
        </div>
      )}

      {/* Configuration Flow Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Source Configuration (Left) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-350 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="h-4 w-4" /></span>
              Source Cohort
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Select the current cohort to promote</p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Medium */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Medium</label>
              <div className="relative">
                <select
                  value={sourceMedium}
                  onChange={e => setSourceMedium(e.target.value)}
                  className="appearance-none w-full bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-700 focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  {sourceMediumOptions.map((med) => (
                    <option key={med} value={med}>{med}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Standard */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Std (Class)</label>
              <div className="relative">
                <select
                  value={sourceClass}
                  onChange={e => setSourceClass(e.target.value)}
                  className="appearance-none w-full bg-slate-50 border border-slate-200 hover:border-slate-355 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-700 focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  {sourceClassOptions.map((cls) => (
                    <option key={cls} value={cls}>{isNaN(Number(cls)) ? cls : `Std ${cls}`}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Division */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Division</label>
              <div className="relative">
                <select
                  value={sourceDiv}
                  onChange={e => setSourceDiv(e.target.value)}
                  className="appearance-none w-full bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-slate-700 focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  {['A', 'B', 'C', 'D'].map(d => <option key={d} value={d}>Div {d}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Connector (Middle) */}
        <div className="lg:col-span-2 flex flex-row lg:flex-col items-center justify-center gap-2 p-2 rounded-2xl text-center">
          <div className="hidden lg:flex flex-col items-center justify-center h-full">
            <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
              <ArrowRight className="h-5 w-5" />
            </div>
            <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-wider mt-2">Promote To</span>
          </div>
          <div className="flex lg:hidden items-center justify-center py-2 w-full gap-2">
            <span className="h-px bg-slate-200 flex-1"></span>
            <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">Promoting to</span>
            <span className="h-px bg-slate-200 flex-1"></span>
          </div>
        </div>

        {/* Target Cohort (Right) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-350 flex flex-col justify-between ring-1 ring-indigo-500/5">
          <div>
            <h3 className="font-extrabold text-indigo-950 text-sm flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><ArrowRight className="h-4 w-4" /></span>
              Target Cohort
            </h3>
            <p className="text-[11px] text-indigo-400 mt-1">Specify destination class details & academic year</p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {/* Target Class */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">Std (Class)</label>
              <div className="relative">
                <select
                  value={targetClass}
                  onChange={e => setTargetClass(e.target.value)}
                  className="appearance-none w-full bg-indigo-50/40 border border-indigo-100 hover:border-indigo-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-indigo-900 focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  {targetClassOptions.map((cls) => (
                    <option key={cls} value={cls}>{isNaN(Number(cls)) ? cls : `Std ${cls}`}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
              </div>
            </div>

            {/* Target Division */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">Division</label>
              <div className="relative">
                <select
                  value={targetDiv}
                  onChange={e => setTargetDiv(e.target.value)}
                  className="appearance-none w-full bg-indigo-50/40 border border-indigo-100 hover:border-indigo-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-indigo-900 focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  {['A', 'B', 'C', 'D'].map(d => <option key={d} value={d}>Div {d}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
              </div>
            </div>

            {/* Target Academic Year */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">Academic Year</label>
              <div className="relative">
                <select
                  value={targetYear}
                  onChange={e => setTargetYear(e.target.value)}
                  className="appearance-none w-full bg-indigo-50/40 border border-indigo-100 hover:border-indigo-200 rounded-xl py-2.5 pl-3 pr-8 text-xs font-bold text-indigo-900 focus:outline-none transition-all shadow-sm cursor-pointer"
                >
                  {academicYears && academicYears.length > 0 ? (
                    academicYears.map(year => (
                      <option key={year._id} value={year.name}>{year.name}</option>
                    ))
                  ) : (
                    <>
                      {academicYears.map(ay => (
                        <option key={ay._id} value={ay.name}>{ay.name}</option>
                      ))}
                      <option value="2026-27">2026-27</option>
                    </>
                  )}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Eligible Students Selection Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
        {/* Header Controller Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search students by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-full shrink-0">
              {eligibleStudents.length} Eligible
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500">
              Selected: <strong className="text-indigo-600 font-extrabold">{selectedStudentIds.length}</strong> of {eligibleStudents.length}
            </span>
            {eligibleStudents.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-[10px] font-extrabold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.98]"
              >
                {selectedStudentIds.length === eligibleStudents.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          {eligibleStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3 border border-slate-100">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-slate-750 text-sm">No Eligible Students Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1 font-medium">
                No active students are currently enrolled in Std {sourceClass}-{sourceDiv} ({sourceMedium} Medium). Adjust filters to load cohorts.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-15 border-b border-slate-100">
                <tr className="font-extrabold text-[9px] uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Select</th>
                  <th className="py-3 px-4">Student Profile Details</th>
                  <th className="py-3 px-4">Student ID / Code</th>
                  <th className="py-3 px-4">Fee Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-755 font-semibold">
                {eligibleStudents.map(student => {
                  const sId = student._id || student.id;
                  const isSelected = selectedStudentIds.includes(sId);
                  const initials = (student.studentName ?? '')
                    .split(' ')
                    .map((n) => n[0])
                    .join('');

                  return (
                    <tr
                      key={sId}
                      onClick={() => toggleStudent(sId)}
                      className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : ''}`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(sId)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-350 rounded cursor-pointer transition-all"
                        />
                      </td>
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-650 font-bold text-xs flex items-center justify-center uppercase border border-indigo-100">
                          {initials}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-800 text-sm block">{student.studentName}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Parent Contact: {student.parentMobile ?? 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{student.studentCode}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${student.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : student.status === 'RTE'
                              ? 'bg-purple-50 text-purple-600 border-purple-100'
                              : 'bg-amber-50 text-amber-550 border-amber-100'
                          }`}>
                          {student.status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Sticky Promotion Warning and Confirmation Bottom Panel */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0 mt-0.5 border border-amber-100">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">Verify Cohort Migration Details</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                You are migrating <strong className="text-indigo-600 font-extrabold">{selectedStudentIds.length}</strong> student(s) from{' '}
                <strong>Std {sourceClass} {sourceMedium} ({sourceDiv})</strong> to{' '}
                <strong className="text-indigo-600 font-extrabold">Std {targetClass} ({targetDiv})</strong> under Academic Year{' '}
                <strong className="text-indigo-600 font-extrabold">{targetYear}</strong>.
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                This transaction advances student profiles and builds new outstanding fee ledgers matching the target class fee structures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="bg-slate-50 hover:bg-slate-105 border border-slate-200 hover:border-slate-350 text-slate-655 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-[0.98]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handlePromote}
              disabled={loading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  Execute Cohort Promotion
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
