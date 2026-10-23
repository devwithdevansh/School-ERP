import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../store';
import { usePlan } from '../context/PlanContext';
import {
  Calendar, Check, X, Clock, FileSpreadsheet, Send, Printer, RotateCcw,
  Search, ShieldCheck, UserCheck, AlertCircle, Filter, ChevronDown, CheckCircle2
} from './icons';

interface AttendanceRecord {
  studentId: string;
  rollNo?: number | string;
  grNo?: string;
  studentName: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  remarks: string;
}

export const TeacherSimpleAttendance: React.FC = () => {
  const { students, fetchAttendance, saveAttendance, confirmAttendance, currentUser } = useApp();
  const { demoRole, isBasic } = usePlan();

  // Active filters
  const [standard, setStandard] = useState<string>('5');
  const [division, setDivision] = useState<string>('A');
  const [medium, setMedium] = useState<string>('English');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LEAVE'>('ALL');

  // Attendance state
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedToAdmin, setSubmittedToAdmin] = useState(false);
  const [submittedTime, setSubmittedTime] = useState<string | null>(null);
  const [isConfirmedByAdmin, setIsConfirmedByAdmin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Available options from students data
  const standards = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.standard && set.add(String(s.standard)));
    const arr = Array.from(set).sort((a, b) => {
      const na = Number(a), nb = Number(b);
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    });
    return arr.length > 0 ? arr : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  }, [students]);

  const divisions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.division && set.add(s.division));
    const arr = Array.from(set).sort();
    return arr.length > 0 ? arr : ['A', 'B', 'C'];
  }, [students]);

  const mediums = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.medium && set.add(s.medium));
    const arr = Array.from(set).sort();
    return arr.length > 0 ? arr : ['English', 'Gujarati'];
  }, [students]);

  // Load students for chosen standard, division, medium
  const classStudents = useMemo(() => {
    return students
      .filter((s) =>
        String(s.standard) === String(standard) &&
        (!division || s.division === division) &&
        (!medium || s.medium === medium) &&
        s.isActive !== false
      )
      .sort((a, b) => (a.rollNo || 0) - (b.rollNo || 0) || a.studentName.localeCompare(b.studentName));
  }, [students, standard, division, medium]);

  // Fetch or initialize attendance records
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAttendance(date, standard, division, medium);
        if (!isMounted) return;

        if (data && data.records && data.records.length > 0) {
          if (data._id || data.id) setAttendanceId(data._id || data.id);
          const mapped: AttendanceRecord[] = classStudents.map((st, idx) => {
            const found = data.records.find((r: any) => String(r.studentId) === String(st._id || st.id));
            return {
              studentId: String(st._id || st.id),
              rollNo: st.rollNo || idx + 1,
              grNo: st.grNo || '',
              studentName: st.studentName,
              status: (found?.status as any) || 'PRESENT',
              remarks: found?.remarks || '',
            };
          });
          setRecords(mapped);
          setSubmittedToAdmin(data.status === 'SUBMITTED' || data.status === 'CONFIRMED');
          setIsConfirmedByAdmin(data.status === 'CONFIRMED');
          setSubmittedTime(data.submittedAt ? new Date(data.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null);
        } else {
          setAttendanceId(data?._id || data?.id || null);
          // Default all to PRESENT
          const init: AttendanceRecord[] = classStudents.map((st, idx) => ({
            studentId: String(st._id || st.id),
            rollNo: st.rollNo || idx + 1,
            grNo: st.grNo || '',
            studentName: st.studentName,
            status: 'PRESENT',
            remarks: '',
          }));
          setRecords(init);
          setSubmittedToAdmin(false);
          setIsConfirmedByAdmin(false);
          setSubmittedTime(null);
        }
      } catch (err) {
        console.error('Failed to load attendance', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [date, standard, division, medium, classStudents.length, fetchAttendance]);

  // Quick stats
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const leave = records.filter((r) => r.status === 'LEAVE').length;
    return { total, present, absent, leave };
  }, [records]);

  // Filtered list for display
  const displayRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !search ||
        r.studentName.toLowerCase().includes(search.toLowerCase()) ||
        String(r.rollNo).includes(search) ||
        (r.grNo && r.grNo.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  // Record actions
  const setSingleStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LEAVE') => {
    if (isConfirmedByAdmin && demoRole === 'TEACHER') return;
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const setSingleRemark = (studentId: string, remarks: string) => {
    if (isConfirmedByAdmin && demoRole === 'TEACHER') return;
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    );
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    if (isConfirmedByAdmin && demoRole === 'TEACHER') return;
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    showToast(`Marked all ${status.toLowerCase()}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Submit to Admin
  const handleSubmitToAdmin = async () => {
    if (records.length === 0) return;
    setSubmitting(true);
    try {
      const result = await saveAttendance(
        date,
        standard,
        division,
        medium,
        records.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remarks: r.remarks,
        }))
      );
      if (result.error) throw new Error(result.error);
      const updated = await fetchAttendance(date, standard, division, medium);
      if (updated && (updated._id || updated.id)) setAttendanceId(updated._id || updated.id);
      setSubmittedToAdmin(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSubmittedTime(timeStr);
      showToast(`Class attendance submitted to School Admin successfully at ${timeStr}!`);
    } catch (e: any) {
      showToast(e.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin 1-Click Confirm
  const handleAdminConfirm = async () => {
    setSubmitting(true);
    try {
      if (attendanceId) {
        const result = await confirmAttendance(attendanceId);
        if (result.error) throw new Error(result.error);
      } else {
        await saveAttendance(
          date,
          standard,
          division,
          medium,
          records.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            remarks: r.remarks,
          }))
        );
        const updated = await fetchAttendance(date, standard, division, medium);
        const targetId = updated?._id || updated?.id;
        if (targetId) {
          const result = await confirmAttendance(targetId);
          if (result.error) throw new Error(result.error);
          setAttendanceId(targetId);
        }
      }
      setIsConfirmedByAdmin(true);
      setSubmittedToAdmin(true);
      showToast(`Attendance confirmed and officially locked by Administrator!`);
    } catch (e: any) {
      showToast(e.message || 'Failed to confirm attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast('No students to export');
      return;
    }

    const excelData = records.map((r, i) => ({
      'Roll No': r.rollNo || i + 1,
      'GR No': r.grNo || '-',
      'Student Name': r.studentName,
      'Attendance Status': r.status,
      'Remarks / Reason': r.remarks || '',
      'Date': date,
      'Class': `Std ${standard}-${division} (${medium})`,
      'Submitted By': currentUser?.name || 'Class Teacher',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 28 },
      { wch: 18 },
      { wch: 25 },
      { wch: 14 },
      { wch: 20 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Attendance Std ${standard}-${division}`);
    const fileName = `Class_Attendance_Std_${standard}_${division}_${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast(`Excel file downloaded: ${fileName}`);
  };

  return (
    <div className="flex-1 space-y-5 p-4 sm:p-6 bg-slate-50/70 min-h-screen text-slate-800 text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Plan & Role Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-400/20 px-2 py-0.5 text-[10px] font-black tracking-wider uppercase text-teal-200 ring-1 ring-teal-300/30">
                Basic Plan · Teacher Mode
              </span>
              {submittedToAdmin && (
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  isConfirmedByAdmin ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'
                }`}>
                  {isConfirmedByAdmin ? '✓ Confirmed by Admin' : '● Submitted to Admin'}
                </span>
              )}
            </div>
            <h2 className="font-display text-lg font-bold">Class Teacher Attendance Sheet</h2>
            <p className="text-xs text-teal-100/80">
              Quick 1-page class attendance. Fill student status and submit directly to Admin or export Excel.
            </p>
          </div>
        </div>

        {/* Status Callout */}
        <div className="flex items-center gap-3">
          {demoRole === 'ADMIN' && submittedToAdmin && !isConfirmedByAdmin && (
            <button
              onClick={handleAdminConfirm}
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition active:scale-95"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>1-Click Confirm & Lock</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur transition border border-white/10"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Class Selector & Date Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Standard (Class)
          </label>
          <select
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {standards.map((std) => (
              <option key={std} value={std}>Standard {std}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Division / Section
          </label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {divisions.map((div) => (
              <option key={div} value={div}>Division {div}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Medium
          </label>
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {mediums.map((med) => (
              <option key={med} value={med}>{med} Medium</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Attendance Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Real-time Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total In Class</p>
          <p className="mt-1 text-2xl font-black text-slate-800">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Present</p>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-1.5 py-0.5 rounded">
              {stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-700">{stats.present}</p>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/60 p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Absent</p>
          <p className="mt-1 text-2xl font-black text-red-700">{stats.absent}</p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">On Leave</p>
          <p className="mt-1 text-2xl font-black text-amber-700">{stats.leave}</p>
        </div>
      </div>

      {/* Action Controls & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          {/* Quick Mark All Buttons */}
          <button
            type="button"
            onClick={() => markAll('PRESENT')}
            disabled={isConfirmedByAdmin && demoRole === 'TEACHER'}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition active:scale-95 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Mark All Present</span>
          </button>

          <button
            type="button"
            onClick={() => markAll('ABSENT')}
            disabled={isConfirmedByAdmin && demoRole === 'TEACHER'}
            className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition active:scale-95 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            <span>Mark All Absent</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name / roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present Only</option>
            <option value="ABSENT">Absent Only</option>
            <option value="LEAVE">Leave Only</option>
          </select>
        </div>
      </div>

      {/* Student Attendance List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-400">
            Loading class students...
          </div>
        ) : displayRecords.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold text-slate-600">No students found matching current filters.</p>
            <p className="text-xs text-slate-400 mt-1">Check Standard, Division, or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 w-16">Roll</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 w-28 hidden sm:table-cell">GR No</th>
                  <th className="py-3 px-4 w-72 text-center">Attendance Status</th>
                  <th className="py-3 px-4">Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRecords.map((st) => (
                  <tr
                    key={st.studentId}
                    className={`transition-colors hover:bg-slate-50/60 ${
                      st.status === 'ABSENT'
                        ? 'bg-red-50/20'
                        : st.status === 'LEAVE'
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-600">
                      {st.rollNo}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{st.studentName}</div>
                      <div className="text-[10px] text-slate-400 sm:hidden">GR: {st.grNo || '-'}</div>
                    </td>

                    <td className="py-3 px-4 text-xs font-mono text-slate-500 hidden sm:table-cell">
                      {st.grNo || '-'}
                    </td>

                    {/* Status Pill Selector */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1 bg-slate-100/80 p-1 rounded-xl max-w-fit mx-auto border border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setSingleStatus(st.studentId, 'PRESENT')}
                          disabled={isConfirmedByAdmin && demoRole === 'TEACHER'}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            st.status === 'PRESENT'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>P</span>
                          <span className="hidden md:inline font-normal text-[10px]">Present</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSingleStatus(st.studentId, 'ABSENT')}
                          disabled={isConfirmedByAdmin && demoRole === 'TEACHER'}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            st.status === 'ABSENT'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-red-700 hover:bg-red-50'
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>A</span>
                          <span className="hidden md:inline font-normal text-[10px]">Absent</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSingleStatus(st.studentId, 'LEAVE')}
                          disabled={isConfirmedByAdmin && demoRole === 'TEACHER'}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            st.status === 'LEAVE'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>L</span>
                          <span className="hidden md:inline font-normal text-[10px]">Leave</span>
                        </button>
                      </div>
                    </td>

                    {/* Remarks Input */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Optional reason..."
                        value={st.remarks}
                        disabled={isConfirmedByAdmin && demoRole === 'TEACHER'}
                        onChange={(e) => setSingleRemark(st.studentId, e.target.value)}
                        className="w-full max-w-xs rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Submission Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {submittedTime ? (
              <span className="flex items-center gap-1.5 text-teal-700 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <span>Last submitted to Admin at {submittedTime}</span>
              </span>
            ) : (
              <span>Not submitted to Admin office yet for today.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Download Excel for Admin</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitToAdmin}
              disabled={submitting || (isConfirmedByAdmin && demoRole === 'TEACHER')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Submitting...' : submittedToAdmin ? 'Re-Submit to Admin' : 'Submit to Admin Office'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
