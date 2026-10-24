import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Loader2, CheckCircle2, XCircle, Clock,
  Users, ChevronLeft, ChevronRight, Printer, Search, Phone, AlertTriangle, FileSpreadsheet
} from './icons';
import { useApp } from '../store';

interface RegisterDay {
  day: number;
  dateKey: string;
  dayOfWeek: string;
  date: string;
}

interface StudentRow {
  studentId: string;
  studentName: string;
  rollNo?: number | string | null;
  parentPhone?: string | null;
  dayStatuses: Record<string, string>;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  totalDays: number;
  percentage: number;
}

interface AbsenteeItem {
  studentId: string;
  studentName: string;
  rollNo?: number | string | null;
  parentPhone?: string | null;
  remarks?: string | null;
  verifiedByAdmin?: boolean;
}

interface DailyAbsenteeDay {
  dateKey: string;
  date: string;
  absentCount: number;
  absents: AbsenteeItem[];
}

interface RegisterData {
  month: number;
  year: number;
  standard: string;
  division: string;
  medium: string;
  totalStudents: number;
  totalWorkingDays: number;
  dates: RegisterDay[];
  register: StudentRow[];
  dailyAbsentees: DailyAbsenteeDay[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AttendanceRegisterView: React.FC = () => {
  const { students, fetchAttendanceRegister } = useApp();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [subView, setSubView] = useState<'GRID' | 'ABSENTEES'>('GRID');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithAbsents, setOnlyWithAbsents] = useState(false);

  // Derive available classes from active migrated students
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    const list: { standard: string; division: string; medium: string }[] = [];
    students.forEach((s) => {
      if (s.isActive !== false && s.isMigrated === true && s.standard && s.division) {
        const key = `${s.standard}-${s.division}-${s.medium || 'English'}`;
        if (!set.has(key)) {
          set.add(key);
          list.push({ standard: s.standard, division: s.division, medium: s.medium || 'English' });
        }
      }
    });
    list.sort((a, b) => {
      const numA = parseInt(a.standard, 10);
      const numB = parseInt(b.standard, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      } else {
        const cmp = a.standard.localeCompare(b.standard);
        if (cmp !== 0) return cmp;
      }
      return a.division.localeCompare(b.division);
    });
    return list;
  }, [students]);

  const [standard, setStandard] = useState<string>('1');
  const [division, setDivision] = useState<string>('A');
  const [medium, setMedium] = useState<string>('English');

  // Initialize selected class if students exist
  useEffect(() => {
    if (availableClasses.length > 0) {
      const currentExists = availableClasses.some(
        (c) => c.standard === standard && c.division === division && c.medium === medium
      );
      if (!currentExists) {
        setStandard(availableClasses[0].standard);
        setDivision(availableClasses[0].division);
        setMedium(availableClasses[0].medium);
      }
    }
  }, [availableClasses]);

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RegisterData | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetchAttendanceRegister(standard, division, medium, selectedMonth, selectedYear);
    setData(res);
    setLoading(false);
  }, [standard, division, medium, selectedMonth, selectedYear, fetchAttendanceRegister]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Filtered register rows
  const filteredRegister = useMemo(() => {
    if (!data?.register) return [];
    if (!searchQuery.trim()) return data.register;
    const q = searchQuery.toLowerCase().trim();
    return data.register.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        (r.rollNo != null && String(r.rollNo).includes(q))
    );
  }, [data?.register, searchQuery]);

  // Filtered daily absentees
  const filteredDailyAbsentees = useMemo(() => {
    if (!data?.dailyAbsentees) return [];
    let list = data.dailyAbsentees;
    if (onlyWithAbsents) {
      list = list.filter((d) => d.absentCount > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list
        .map((d) => ({
          ...d,
          absents: d.absents.filter(
            (a) =>
              a.studentName.toLowerCase().includes(q) ||
              (a.rollNo != null && String(a.rollNo).includes(q)) ||
              (a.remarks && a.remarks.toLowerCase().includes(q))
          ),
        }))
        .filter((d) => d.absents.length > 0);
    }
    return list;
  }, [data?.dailyAbsentees, onlyWithAbsents, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (!data?.register || data.register.length === 0) {
      return { totalStudents: 0, workingDays: 0, avgPct: 0, totalAbsences: 0 };
    }
    const totalStudents = data.register.length;
    const workingDays = data.totalWorkingDays;
    const totalAbsences = data.register.reduce((sum, r) => sum + r.totalAbsent, 0);
    const avgPct =
      data.register.reduce((sum, r) => sum + r.percentage, 0) / (totalStudents || 1);
    return {
      totalStudents,
      workingDays,
      avgPct: Math.round(avgPct * 10) / 10,
      totalAbsences,
    };
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Class and Medium Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Class / Grade
              </label>
              <select
                value={`${standard}|${division}|${medium}`}
                onChange={(e) => {
                  const [std, div, med] = e.target.value.split('|');
                  setStandard(std);
                  setDivision(div);
                  setMedium(med);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {availableClasses.map((c) => (
                  <option key={`${c.standard}|${c.division}|${c.medium}`} value={`${c.standard}|${c.division}|${c.medium}`}>
                    Std {c.standard}-{c.division} ({c.medium})
                  </option>
                ))}
              </select>
            </div>

            {/* Month & Year Navigation */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Month &amp; Year
              </label>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-600 transition-colors"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm font-bold text-slate-800 min-w-[130px] text-center">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-600 transition-colors"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Subview Toggle and Print Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setSubView('GRID')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'GRID'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Register Grid (1–31)
              </button>
              <button
                onClick={() => setSubView('ABSENTEES')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subView === 'ABSENTEES'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Daily Absentee History
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              Print Register
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">
              {summaryMetrics.totalStudents}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Total Enrolled</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">
              {summaryMetrics.workingDays}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">School Working Days</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700 leading-none">
              {summaryMetrics.avgPct}%
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Class Average Attendance</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 leading-none">
              {summaryMetrics.totalAbsences}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Total Student Absences</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Controls within tab: Search & toggles */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {subView === 'ABSENTEES' && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={onlyWithAbsents}
                onChange={(e) => setOnlyWithAbsents(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500/20 h-4 w-4"
              />
              Show Only Dates With Absences
            </label>
          )}

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> P = Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> A = Absent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> L = Late
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> LV = Leave
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm font-semibold">Generating Attendance Register...</p>
          </div>
        ) : !data || data.register.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm font-medium">
            No student attendance records found for this class and month.
          </div>
        ) : subView === 'GRID' ? (
          /* ───────────────────────────────────────────────────────────────────────────
           * REGISTER GRID VIEW (1 to 31)
           * ─────────────────────────────────────────────────────────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-12 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                    Roll
                  </th>
                  <th className="py-3 px-4 min-w-[180px] sticky left-12 bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Student Name
                  </th>
                  {data.dates.map((d) => (
                    <th
                      key={d.dateKey}
                      className="py-2 px-1 text-center font-bold border-r border-slate-100 min-w-[32px]"
                      title={`${d.dateKey} (${d.dayOfWeek})`}
                    >
                      <div className="text-[12px] text-slate-800">{d.day}</div>
                      <div className="text-[9px] text-slate-400 lowercase">{d.dayOfWeek.slice(0, 2)}</div>
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center text-emerald-700 bg-emerald-50/50 w-12 font-black border-l border-slate-200">
                    P
                  </th>
                  <th className="py-3 px-2 text-center text-rose-700 bg-rose-50/50 w-12 font-black">
                    A
                  </th>
                  <th className="py-3 px-2 text-center text-blue-700 bg-blue-50/50 w-14 font-black">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredRegister.map((st, i) => (
                  <tr key={st.studentId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-2 text-center text-slate-400 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r border-slate-200 font-mono">
                      {st.rollNo ?? i + 1}
                    </td>
                    <td className="py-2 px-4 font-bold text-slate-800 sticky left-12 bg-white group-hover:bg-blue-50/30 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)] truncate max-w-[200px]">
                      {st.studentName}
                    </td>

                    {data.dates.map((d) => {
                      const status = st.dayStatuses[d.dateKey] || '—';
                      let chip = (
                        <span className="text-slate-300 font-normal select-none">—</span>
                      );
                      if (status === 'PRESENT') {
                        chip = (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">
                            P
                          </span>
                        );
                      } else if (status === 'ABSENT') {
                        chip = (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-rose-500 text-white font-black text-[10px] shadow-sm">
                            A
                          </span>
                        );
                      } else if (status === 'LATE') {
                        chip = (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px]">
                            L
                          </span>
                        );
                      } else if (status === 'LEAVE') {
                        chip = (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[9px]">
                            LV
                          </span>
                        );
                      }

                      return (
                        <td
                          key={d.dateKey}
                          className="py-1 px-1 text-center border-r border-slate-100"
                        >
                          {chip}
                        </td>
                      );
                    })}

                    <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">
                      {st.totalPresent}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50/30">
                      {st.totalAbsent}
                    </td>
                    <td
                      className={`py-2 px-2 text-center font-black ${
                        st.percentage >= 75
                          ? 'text-emerald-700'
                          : st.percentage >= 60
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {st.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ───────────────────────────────────────────────────────────────────────────
           * DAILY ABSENTEE HISTORY VIEW
           * ─────────────────────────────────────────────────────────────────────────── */
          <div className="p-5 space-y-4">
            {filteredDailyAbsentees.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm font-medium">
                No absentee records matching your filter.
              </div>
            ) : (
              filteredDailyAbsentees.map((day) => {
                const dateObj = new Date(day.dateKey + 'T00:00:00');
                const dateHeading = dateObj.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });

                const isNoAbsents = day.absentCount === 0;

                return (
                  <div
                    key={day.dateKey}
                    className={`rounded-2xl border transition-all ${
                      isNoAbsents
                        ? 'border-slate-200/80 bg-slate-50/40 p-4'
                        : 'border-rose-200 bg-rose-50/20 p-5 shadow-sm'
                    }`}
                  >
                    {/* Header Row for Day */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold ${
                            isNoAbsents
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800">{dateHeading}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Class: Std {standard}-{division} ({medium})
                          </span>
                        </div>
                      </div>

                      {isNoAbsents ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" /> 100% Present · No Absentees
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="h-3.5 w-3.5" />
                          {day.absentCount} Student{day.absentCount > 1 ? 's' : ''} Absent
                        </span>
                      )}
                    </div>

                    {/* Absent Students List */}
                    {!isNoAbsents && (
                      <div className="mt-3 overflow-x-auto bg-white rounded-xl border border-rose-100">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-rose-50/50 border-b border-rose-100 text-rose-900 font-bold">
                              <th className="py-2.5 px-3 w-12 text-center">#</th>
                              <th className="py-2.5 px-3">Student Name</th>
                              <th className="py-2.5 px-3">Roll No</th>
                              <th className="py-2.5 px-3">Parent Contact</th>
                              <th className="py-2.5 px-3">Remarks / Reason</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {day.absents.map((a, idx) => (
                              <tr key={a.studentId} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-800">
                                  {a.studentName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-mono">
                                  {a.rollNo ?? '—'}
                                </td>
                                <td className="py-2.5 px-3">
                                  {a.parentPhone ? (
                                    <a
                                      href={`tel:${a.parentPhone}`}
                                      className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      <Phone className="h-3 w-3" />
                                      {a.parentPhone}
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic">No phone saved</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 italic">
                                  {a.remarks || 'No remarks provided'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                    ABSENT
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
