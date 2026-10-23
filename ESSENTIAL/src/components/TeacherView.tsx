import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Save, Loader2, CheckCircle2, Clock,
  Users, UserCheck, AlertCircle, RefreshCw, AlertTriangle
} from './icons';
import { useApp } from '../store';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTodayDayName = (): string => {
  const d = new Date();
  const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday...
  if (dayIndex === 0) return 'Monday'; // Sunday defaults to Monday schedule
  return DAYS_OF_WEEK[dayIndex - 1] || 'Monday';
};

interface StudentAttendanceRow {
  studentId: string;
  studentName: string;
  rollNo?: number | null;
  gender?: 'Male' | 'Female' | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
  remarks: string;
}

export const TeacherView: React.FC = () => {
  const {
    currentUser,
    students,
    classTeacherAllocations,
    academicYears,
    fetchAttendance,
    saveAttendance,
    authFetch,
    currentScreen,
    setScreen,
  } = useApp();

  const activeTeacher = currentUser;

  // Active academic year
  const activeYear = useMemo(() => academicYears.find((y) => y.isActive), [academicYears]);

  // Active teacher's assigned class(es)
  const assignedClasses = useMemo(() => {
    if (!activeTeacher) return [];
    const tId = (activeTeacher as any)._id || (activeTeacher as any).id;
    return classTeacherAllocations.filter((a) => {
      const allocTid = typeof a.teacherId === 'object' && a.teacherId !== null
        ? (a.teacherId as any)._id || (a.teacherId as any).id
        : a.teacherId;
      return allocTid === tId || (typeof a.teacherId === 'object' && (a.teacherId as any)?.email === activeTeacher.email);
    });
  }, [classTeacherAllocations, activeTeacher]);

  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const currentAssignedClass = assignedClasses[selectedClassIndex] || assignedClasses[0] || null;

  // Active tab: 'attendance' or 'timetable'
  const activeTab: 'attendance' | 'timetable' = currentScreen === 'teacher-timetable' ? 'timetable' : 'attendance';

  // ── Attendance State ──
  const [attendanceDate, setAttendanceDate] = useState<string>(todayKey());
  const [attendanceRows, setAttendanceRows] = useState<StudentAttendanceRow[]>([]);
  const [sheetStatus, setSheetStatus] = useState<'NOT_SUBMITTED' | 'SUBMITTED' | 'CONFIRMED'>('NOT_SUBMITTED');
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);

  // Filter students belonging to this assigned class
  const classStudents = useMemo(() => {
    if (!currentAssignedClass) return [];
    return students
      .filter((s) =>
        s.standard === currentAssignedClass.standard &&
        s.division === currentAssignedClass.division &&
        s.medium === currentAssignedClass.medium &&
        s.isActive !== false
      )
      .sort((a, b) => ((a.rollNo ?? 9999) - (b.rollNo ?? 9999)) || a.studentName.localeCompare(b.studentName));
  }, [students, currentAssignedClass]);

  // Load attendance sheet for active class & date
  const loadAttendance = useCallback(async () => {
    if (!currentAssignedClass) {
      setAttendanceRows([]);
      return;
    }
    setLoadingAttendance(true);
    setAttendanceSuccessMsg(null);
    try {
      const data = await fetchAttendance(
        attendanceDate,
        currentAssignedClass.standard,
        currentAssignedClass.division,
        currentAssignedClass.medium
      );

      if (data && data.status) {
        setSheetStatus(data.status);
      } else {
        setSheetStatus('NOT_SUBMITTED');
      }

      const rows: StudentAttendanceRow[] = classStudents.map((s) => {
        const sid = s._id || s.id;
        const existing = data?.records?.find((r: any) => (r.studentId?._id || r.studentId?.id || r.studentId) === sid);
        return {
          studentId: sid,
          studentName: s.studentName,
          rollNo: s.rollNo,
          gender: s.gender,
          status: (existing?.status as any) || 'PRESENT',
          remarks: existing?.remarks || '',
        };
      });
      setAttendanceRows(rows);
    } catch (err) {
      console.error('Failed to load class attendance', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, [currentAssignedClass, attendanceDate, classStudents, fetchAttendance]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance();
    }
  }, [activeTab, loadAttendance]);

  const setStudentStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE') => {
    if (sheetStatus === 'CONFIRMED') return;
    setAttendanceRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const setStudentRemarks = (studentId: string, remarks: string) => {
    if (sheetStatus === 'CONFIRMED') return;
    setAttendanceRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    );
  };

  const markAllStatus = (status: 'PRESENT' | 'ABSENT') => {
    if (sheetStatus === 'CONFIRMED') return;
    setAttendanceRows((prev) => prev.map((r) => ({ ...r, status })));
  };

  const handleSubmitAttendance = async () => {
    if (!currentAssignedClass) return;
    setSavingAttendance(true);
    setAttendanceSuccessMsg(null);
    try {
      const result = await saveAttendance(
        attendanceDate,
        currentAssignedClass.standard,
        currentAssignedClass.division,
        currentAssignedClass.medium,
        attendanceRows.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          remarks: r.remarks,
        }))
      );

      if (result.success) {
        setSheetStatus('SUBMITTED');
        setAttendanceSuccessMsg(
          `Attendance submitted successfully for ${currentAssignedClass.standard}-${currentAssignedClass.division} on ${attendanceDate}!`
        );
        setTimeout(() => setAttendanceSuccessMsg(null), 6000);
      } else {
        alert(result.error || 'Failed to submit attendance.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving.');
    } finally {
      setSavingAttendance(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: attendanceRows.length,
      present: attendanceRows.filter((r) => r.status === 'PRESENT').length,
      absent: attendanceRows.filter((r) => r.status === 'ABSENT').length,
      late: attendanceRows.filter((r) => r.status === 'LATE').length,
      leave: attendanceRows.filter((r) => r.status === 'LEAVE').length,
    };
  }, [attendanceRows]);

  // ── Timetable State ──
  const [selectedDay, setSelectedDay] = useState<string>(getTodayDayName());
  const [timetablePeriods, setTimetablePeriods] = useState<any[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);

  const fetchTeacherTimetable = useCallback(async () => {
    const tId = activeTeacher ? (activeTeacher as any)._id || (activeTeacher as any).id : '';
    if (!tId) return;
    setLoadingTimetable(true);
    try {
      const params = new URLSearchParams();
      params.append('teacherId', tId);
      if (activeYear) params.append('academicYearId', activeYear._id);

      const res = await authFetch(`/api/v1/erp/timetable?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTimetablePeriods(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load teacher timetable', err);
    } finally {
      setLoadingTimetable(false);
    }
  }, [activeTeacher, activeYear, authFetch]);

  useEffect(() => {
    if (activeTab === 'timetable') {
      fetchTeacherTimetable();
    }
  }, [activeTab, fetchTeacherTimetable]);

  const dayPeriods = useMemo(() => {
    return timetablePeriods
      .filter((p) => p.dayOfWeek === selectedDay)
      .sort((a, b) => (a.periodNumber || 0) - (b.periodNumber || 0));
  }, [timetablePeriods, selectedDay]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Main Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Teacher Workspace</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Essential
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Welcome back, <strong className="text-slate-800">{activeTeacher?.name || 'Teacher'}</strong> · Daily class roll call & timetable schedule
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center p-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScreen('teacher-attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Class Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => setScreen('teacher-timetable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'timetable'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>My Timetable</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLASS ATTENDANCE                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Assigned Class Selector / Header */}
          {assignedClasses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Class Assigned Yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1.5">
                You have not been assigned as a Class Teacher for the active academic year. Please contact your school administration office.
              </p>
            </div>
          ) : (
            <>
              {/* Class Controls Bar */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Class badge or dropdown if multiple classes */}
                    {assignedClasses.length > 1 ? (
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                          Select Assigned Class
                        </label>
                        <select
                          value={selectedClassIndex}
                          onChange={(e) => setSelectedClassIndex(Number(e.target.value))}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {assignedClasses.map((cls, idx) => (
                            <option key={cls._id || idx} value={idx}>
                              Class {cls.standard}-{cls.division} ({cls.medium})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-black">
                          {currentAssignedClass?.standard}
                        </span>
                        <div>
                          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Class Teacher Of</p>
                          <p className="text-base font-black text-slate-900">
                            Grade {currentAssignedClass?.standard} - Division {currentAssignedClass?.division}
                            <span className="ml-2 text-xs font-semibold text-slate-500">
                              ({currentAssignedClass?.medium} Medium)
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Date Picker */}
                    <div className="flex items-center gap-2 pl-0 sm:pl-4 sm:border-l sm:border-slate-200">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                          Date
                        </label>
                        <input
                          type="date"
                          value={attendanceDate}
                          onChange={(e) => setAttendanceDate(e.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    {sheetStatus === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Confirmed by Office
                      </span>
                    ) : sheetStatus === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Submitted · Awaiting Admin Confirmation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        Not Submitted Today
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={loadAttendance}
                      title="Reload"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingAttendance ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Quick Roll Call Counters & Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                      Total: {stats.total}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 font-bold text-emerald-700 border border-emerald-200">
                      Present: {stats.present}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 font-bold text-rose-700 border border-rose-200">
                      Absent: {stats.absent}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 font-bold text-amber-700 border border-amber-200">
                      Late: {stats.late}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 font-bold text-purple-700 border border-purple-200">
                      Leave: {stats.leave}
                    </span>
                  </div>

                  {/* Mark All Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={sheetStatus === 'CONFIRMED'}
                      onClick={() => markAllStatus('PRESENT')}
                      className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Mark All Present
                    </button>
                    <button
                      type="button"
                      disabled={sheetStatus === 'CONFIRMED'}
                      onClick={() => markAllStatus('ABSENT')}
                      className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      Mark All Absent
                    </button>
                  </div>
                </div>
              </div>

              {/* Success Notification Banner */}
              {attendanceSuccessMsg && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{attendanceSuccessMsg}</span>
                </div>
              )}

              {/* Lock notification if confirmed */}
              {sheetStatus === 'CONFIRMED' && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-semibold text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    This attendance sheet has been confirmed and locked by the school office. Please contact the administrator if any adjustment is needed.
                  </span>
                </div>
              )}

              {/* Student Attendance List */}
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                {loadingAttendance ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    <p className="text-xs font-bold">Loading student roll call...</p>
                  </div>
                ) : attendanceRows.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No active students found in this class.</p>
                    <p className="text-xs text-slate-500 mt-1">Make sure students are enrolled in Grade {currentAssignedClass.standard}-{currentAssignedClass.division}.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4 w-16">Roll</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4 w-72 text-center">Attendance Status</th>
                          <th className="py-3 px-4">Remarks (Optional)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceRows.map((r, i) => (
                          <tr key={r.studentId} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-black text-slate-600">
                              {r.rollNo ?? i + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  {r.studentName.slice(0, 1).toUpperCase()}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-800">{r.studentName}</p>
                                  {r.gender && (
                                    <p className="text-[10px] text-slate-400 capitalize">{r.gender}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={sheetStatus === 'CONFIRMED'}
                                  onClick={() => setStudentStatus(r.studentId, 'PRESENT')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                                    r.status === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  disabled={sheetStatus === 'CONFIRMED'}
                                  onClick={() => setStudentStatus(r.studentId, 'ABSENT')}
                                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                                    r.status === 'ABSENT'
                                      ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  type="button"
                                  disabled={sheetStatus === 'CONFIRMED'}
                                  onClick={() => setStudentStatus(r.studentId, 'LATE')}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                                    r.status === 'LATE'
                                      ? 'bg-amber-500 text-white shadow-xs font-extrabold'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Late
                                </button>
                                <button
                                  type="button"
                                  disabled={sheetStatus === 'CONFIRMED'}
                                  onClick={() => setStudentStatus(r.studentId, 'LEAVE')}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                                    r.status === 'LEAVE'
                                      ? 'bg-purple-600 text-white shadow-xs font-extrabold'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Leave
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                disabled={sheetStatus === 'CONFIRMED'}
                                value={r.remarks}
                                onChange={(e) => setStudentRemarks(r.studentId, e.target.value)}
                                placeholder="Add note (e.g. sick, doctor note)..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer Save / Submit Action */}
                {attendanceRows.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Summary: <strong className="text-emerald-700">{stats.present} Present</strong> ·{' '}
                      <strong className="text-rose-700">{stats.absent} Absent</strong> ·{' '}
                      <strong className="text-amber-700">{stats.late} Late</strong> ·{' '}
                      <strong className="text-purple-700">{stats.leave} Leave</strong>
                    </p>
                    <button
                      type="button"
                      disabled={savingAttendance || sheetStatus === 'CONFIRMED'}
                      onClick={handleSubmitAttendance}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
                    >
                      {savingAttendance ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving Attendance...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save & Submit Attendance</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEACHER TIMETABLE                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'timetable' && (
        <div className="space-y-5">
          {/* Day Selector */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isCurrent = day === selectedDay;
                  const isToday = day === getTodayDayName();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{day}</span>
                      {isToday && (
                        <span
                          className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                            isCurrent ? 'bg-white' : 'bg-emerald-600'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={fetchTeacherTimetable}
                title="Reload Timetable"
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500"
              >
                <RefreshCw className={`h-4 w-4 ${loadingTimetable ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Timetable Period Schedule Cards */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedDay}&apos;s Schedule</h3>
                <p className="text-xs text-slate-500">
                  {dayPeriods.length} {dayPeriods.length === 1 ? 'class period' : 'class periods'} assigned for {selectedDay}
                </p>
              </div>
            </div>

            {loadingTimetable ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-xs font-bold">Loading timetable...</p>
              </div>
            ) : dayPeriods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No classes scheduled for {selectedDay}</p>
                <p className="text-xs text-slate-500 mt-1">Enjoy your free time or prepare for upcoming lectures.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dayPeriods.map((period, idx) => (
                  <div
                    key={period._id || idx}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-emerald-300 hover:bg-white hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                          Period {period.periodNumber || idx + 1}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {period.startTime} - {period.endTime}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900">
                        {period.subjectId?.subjectName || period.subject || 'Subject'}
                      </h4>
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                        Class {period.standard}-{period.division} ({period.medium})
                      </p>
                    </div>

                    {period.room && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] font-medium text-slate-500">
                        Room: <strong className="text-slate-700">{period.room}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
