import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Save, Loader2, CheckCircle2, XCircle, Clock, BellRing, ArrowLeft,
  ShieldCheck, Users, UserCheck, ClipboardX, Send,
} from 'lucide-react';
import { useApp } from '../store';

type SheetStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'CONFIRMED';

interface ClassCard {
  standard: string;
  division: string;
  medium: string;
  studentCount: number;
  classTeacher: { id: string; name: string; mobile: string | null } | null;
  status: SheetStatus;
  attendanceId: string | null;
  present: number;
  absent: number;
  late: number;
  leave: number;
  submittedAt: string | null;
  confirmedAt: string | null;
  edited: boolean;
}

const STATUS_META: Record<SheetStatus, { label: string; chip: string; bar: string }> = {
  NOT_SUBMITTED: { label: 'Not submitted', chip: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-400' },
  SUBMITTED: { label: 'Awaiting confirmation', chip: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400' },
  CONFIRMED: { label: 'Confirmed', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const classLabel = (c: { standard: string; division: string }) =>
  `${isNaN(Number(c.standard)) ? c.standard : `Std ${c.standard}`}-${c.division}`;

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

/* ----------------------------------------------------------------------------
 * Sheet editor: admin edits a class's attendance and confirms it
 * -------------------------------------------------------------------------- */
const SheetEditor: React.FC<{
  card: ClassCard;
  date: string;
  onBack: () => void;
  onChanged: () => void;
}> = ({ card, date, onBack, onChanged }) => {
  const { students, fetchAttendance, saveAttendance, confirmAttendance } = useApp();
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dirty, setDirty] = useState(false);

  const classStudents = useMemo(() => students.filter(s =>
    s.standard === card.standard &&
    s.division === card.division &&
    s.medium === card.medium &&
    s.isActive !== false &&
    s.isMigrated === true
  ).sort((a, b) => a.studentName.localeCompare(b.studentName)),
  [students, card.standard, card.division, card.medium]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAttendance(date, card.standard, card.division, card.medium);
    setSheet(data);
    setAttendanceData(classStudents.map(student => {
      const existing = data?.records?.find((r: any) => r.studentId === student._id || r.studentId === student.id);
      return {
        studentId: student._id || student.id,
        studentName: student.studentName,
        status: existing ? existing.status : 'PRESENT',
        remarks: existing?.remarks || '',
      };
    }));
    setDirty(false);
    setLoading(false);
  }, [date, card.standard, card.division, card.medium, classStudents.length]);

  useEffect(() => { load(); }, [load]);

  const setStatus = (studentId: string, status: string) => {
    setAttendanceData(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
    setDirty(true);
  };
  const setRemarks = (studentId: string, remarks: string) => {
    setAttendanceData(prev => prev.map(r => r.studentId === studentId ? { ...r, remarks } : r));
    setDirty(true);
  };
  const markAll = (status: string) => {
    setAttendanceData(prev => prev.map(r => ({ ...r, status })));
    setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    const result = await saveAttendance(
      date, card.standard, card.division, card.medium,
      attendanceData.map(r => ({ studentId: r.studentId, status: r.status, remarks: r.remarks }))
    );
    setSaving(false);
    if (!result.success) {
      alert(result.error || 'Failed to save attendance.');
      return false;
    }
    await load();
    onChanged();
    return true;
  };

  const confirm = async () => {
    if (dirty && !(await save())) return;
    let id = sheet?._id;
    if (!id) {
      // Admin filled the sheet from scratch: fetch the id after saving.
      const fresh = await fetchAttendance(date, card.standard, card.division, card.medium);
      id = fresh?._id;
    }
    if (!id) { alert('Save the attendance first.'); return; }
    setConfirming(true);
    const result = await confirmAttendance(id);
    setConfirming(false);
    if (!result.success) { alert(result.error || 'Failed to confirm attendance.'); return; }
    alert(result.notified ? `Confirmed. ${result.notified} parent${result.notified > 1 ? 's' : ''} notified.` : 'Confirmed.');
    await load();
    onChanged();
  };

  const isConfirmed = sheet && sheet.status !== 'SUBMITTED';
  const counts = {
    present: attendanceData.filter(r => r.status === 'PRESENT').length,
    absent: attendanceData.filter(r => r.status === 'ABSENT').length,
    late: attendanceData.filter(r => r.status === 'LATE').length,
    leave: attendanceData.filter(r => r.status === 'LEAVE').length,
  };

  const statusButton = (r: any, value: string, label: React.ReactNode, active: string) => (
    <button
      onClick={() => setStatus(r.studentId, value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${r.status === value ? `${active} text-white shadow-sm` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">{classLabel(card)} · {card.medium}</h2>
            <p className="text-xs text-slate-500 font-medium">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}Class teacher: {card.classTeacher?.name || 'not assigned'}
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_META[sheet ? (isConfirmed ? 'CONFIRMED' : 'SUBMITTED') : 'NOT_SUBMITTED'].chip}`}>
          {STATUS_META[sheet ? (isConfirmed ? 'CONFIRMED' : 'SUBMITTED') : 'NOT_SUBMITTED'].label}
        </span>
      </div>

      {!sheet && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
          The teacher has not submitted attendance for this class yet. You can fill it in yourself below.
        </div>
      )}
      {sheet && !isConfirmed && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium rounded-xl px-4 py-3">
          Submitted by the class teacher{sheet.submittedAt ? ` at ${fmtTime(sheet.submittedAt)}` : ''}. Edit if needed, then confirm to notify parents of absent/late students.
        </div>
      )}
      {isConfirmed && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl px-4 py-3">
          Confirmed{sheet.confirmedAt ? ` at ${fmtTime(sheet.confirmedAt)}` : ''}. The teacher can no longer change it. If you edit now, parents of newly absent/late students are notified when you save.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="font-medium">Loading class attendance...</p>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">No active migrated students in this class.</div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="text-sm font-semibold text-slate-600">Students: <span className="text-slate-900">{classStudents.length}</span></div>
              <div className="flex gap-2">
                <button onClick={() => markAll('PRESENT')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50">Mark All Present</button>
                <button onClick={() => markAll('ABSENT')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/50">Mark All Absent</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12 text-center">#</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceData.map((r, i) => (
                    <tr key={r.studentId} className="hover:bg-slate-50/50 group">
                      <td className="py-3 px-4 text-sm font-medium text-slate-400 text-center">{i + 1}</td>
                      <td className="py-3 px-4 text-sm font-bold text-slate-800">{r.studentName}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {statusButton(r, 'PRESENT', <><CheckCircle2 className="h-3.5 w-3.5" />P</>, 'bg-emerald-500')}
                          {statusButton(r, 'ABSENT', <><XCircle className="h-3.5 w-3.5" />A</>, 'bg-red-500')}
                          {statusButton(r, 'LATE', <><Clock className="h-3.5 w-3.5" />L</>, 'bg-amber-500')}
                          {statusButton(r, 'LEAVE', <>LV</>, 'bg-blue-500')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Note..."
                          value={r.remarks}
                          onChange={(e) => setRemarks(r.studentId, e.target.value)}
                          className="w-full max-w-[220px] text-sm bg-transparent border-0 border-b border-transparent group-hover:border-slate-200 focus:border-blue-500 focus:ring-0 px-1 py-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-5 text-sm font-semibold text-slate-600">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Present {counts.present}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Absent {counts.absent}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Late {counts.late}</span>
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Leave {counts.leave}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={saving || confirming || !dirty}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : sheet ? 'Save changes' : 'Save attendance'}
                </button>
                {!isConfirmed && (
                  <button
                    onClick={confirm}
                    disabled={saving || confirming}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-emerald-500/20"
                  >
                    {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Confirm &amp; notify parents
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------------------
 * Overview: one card per class showing whether attendance is filled
 * -------------------------------------------------------------------------- */
export const Attendance: React.FC = () => {
  const { fetchAttendanceOverview, confirmAttendance, remindAttendanceTeacher } = useApp();
  const [date, setDate] = useState(todayKey());
  const [cards, setCards] = useState<ClassCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | SheetStatus>('ALL');
  const [medium, setMedium] = useState<'ALL' | 'English' | 'Gujarati'>('ALL');
  const [open, setOpen] = useState<ClassCard | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const keyOf = (c: ClassCard) => `${c.standard}|${c.division}|${c.medium}`;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setCards(await fetchAttendanceOverview(date));
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);
  // Teachers submit throughout the morning; keep the board fresh.
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const remind = async (c: ClassCard) => {
    setBusyKey(keyOf(c));
    const r = await remindAttendanceTeacher({ standard: c.standard, division: c.division, medium: c.medium, date });
    setBusyKey(null);
    flash(r.success ? `Reminder sent to ${c.classTeacher?.name || 'teacher'}` : (r.error || 'Could not send reminder'));
  };

  const quickConfirm = async (c: ClassCard) => {
    if (!c.attendanceId) return;
    setBusyKey(keyOf(c));
    const r = await confirmAttendance(c.attendanceId);
    setBusyKey(null);
    flash(r.success ? `${classLabel(c)} confirmed${r.notified ? ` · ${r.notified} parent(s) notified` : ''}` : (r.error || 'Could not confirm'));
    load(true);
  };

  const visible = useMemo(() => cards.filter(c =>
    (filter === 'ALL' || c.status === filter) && (medium === 'ALL' || c.medium === medium)
  ), [cards, filter, medium]);

  const totals = useMemo(() => ({
    all: cards.length,
    notSubmitted: cards.filter(c => c.status === 'NOT_SUBMITTED').length,
    submitted: cards.filter(c => c.status === 'SUBMITTED').length,
    confirmed: cards.filter(c => c.status === 'CONFIRMED').length,
  }), [cards]);

  const remindAll = async () => {
    const targets = cards.filter(c => c.status === 'NOT_SUBMITTED' && c.classTeacher);
    if (targets.length === 0) { flash('No pending classes with an assigned teacher.'); return; }
    setBulkBusy(true);
    let ok = 0;
    for (const c of targets) {
      const r = await remindAttendanceTeacher({ standard: c.standard, division: c.division, medium: c.medium, date });
      if (r.success) ok += 1;
    }
    setBulkBusy(false);
    flash(`Reminders sent to ${ok} of ${targets.length} teachers`);
  };

  const confirmAll = async () => {
    const targets = cards.filter(c => c.status === 'SUBMITTED' && c.attendanceId);
    if (targets.length === 0) return;
    if (!window.confirm(`Confirm ${targets.length} submitted sheet(s) and notify parents of absent/late students?`)) return;
    setBulkBusy(true);
    let parents = 0;
    for (const c of targets) {
      const r = await confirmAttendance(c.attendanceId!);
      parents += r.notified || 0;
    }
    setBulkBusy(false);
    flash(`${targets.length} sheet(s) confirmed · ${parents} parent(s) notified`);
    load(true);
  };

  if (open) {
    return (
      <div className="flex-1 p-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">
        <SheetEditor
          card={open}
          date={date}
          onBack={() => { setOpen(null); load(true); }}
          onChanged={() => load(true)}
        />
      </div>
    );
  }

  const summary = [
    { key: 'ALL' as const, label: 'All classes', value: totals.all, icon: Users, tone: 'text-slate-700 bg-white' },
    { key: 'NOT_SUBMITTED' as const, label: 'Not submitted', value: totals.notSubmitted, icon: ClipboardX, tone: 'text-red-700 bg-red-50' },
    { key: 'SUBMITTED' as const, label: 'Awaiting confirmation', value: totals.submitted, icon: Clock, tone: 'text-amber-700 bg-amber-50' },
    { key: 'CONFIRMED' as const, label: 'Confirmed', value: totals.confirmed, icon: UserCheck, tone: 'text-emerald-700 bg-emerald-50' },
  ];

  return (
    <div className="flex-1 p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Daily Attendance</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Teachers submit, you review and confirm — parents are notified only after confirmation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={date}
              max={todayKey()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <select
            value={medium}
            onChange={(e) => setMedium(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-sm font-semibold text-slate-700"
          >
            <option value="ALL">All mediums</option>
            <option value="English">English</option>
            <option value="Gujarati">Gujarati</option>
          </select>
          <button
            onClick={remindAll}
            disabled={bulkBusy || totals.notSubmitted === 0}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm"
          >
            <BellRing className="h-4 w-4" /> Remind pending
          </button>
          <button
            onClick={confirmAll}
            disabled={bulkBusy || totals.submitted === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm"
          >
            <ShieldCheck className="h-4 w-4" /> Confirm all submitted
          </button>
        </div>
      </div>

      {/* Summary filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`text-left rounded-2xl border p-4 transition-all ${s.tone} ${filter === s.key ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-100 hover:border-slate-300'}`}
          >
            <s.icon className="h-4 w-4 mb-2 opacity-70" />
            <div className="text-2xl font-extrabold leading-none">{s.value}</div>
            <div className="text-xs font-bold mt-1 opacity-80">{s.label}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="font-medium">Loading classes...</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-500 text-sm">
          No classes match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {visible.map(c => {
            const meta = STATUS_META[c.status];
            const busy = busyKey === keyOf(c);
            return (
              <div key={keyOf(c)} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className={`h-1.5 ${meta.bar}`} />
                <button onClick={() => setOpen(c)} className="text-left p-4 flex-1 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-extrabold text-slate-800">{classLabel(c)}</div>
                      <div className="text-xs font-semibold text-slate-500">{c.medium} · {c.studentCount} students</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${meta.chip}`}>{meta.label}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center">
                      {c.classTeacher ? c.classTeacher.name.charAt(0).toUpperCase() : '?'}
                    </span>
                    <span className={c.classTeacher ? 'font-semibold text-slate-700' : 'font-semibold text-red-500'}>
                      {c.classTeacher ? c.classTeacher.name : 'No class teacher assigned'}
                    </span>
                  </div>

                  {c.status === 'NOT_SUBMITTED' ? (
                    <p className="mt-3 text-xs text-slate-400 font-medium">Waiting for the class teacher to mark attendance.</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                      {[
                        { l: 'Present', v: c.present, t: 'text-emerald-600 bg-emerald-50' },
                        { l: 'Absent', v: c.absent, t: 'text-red-600 bg-red-50' },
                        { l: 'Late', v: c.late, t: 'text-amber-600 bg-amber-50' },
                        { l: 'Leave', v: c.leave, t: 'text-blue-600 bg-blue-50' },
                      ].map(x => (
                        <div key={x.l} className={`rounded-lg py-1.5 ${x.t}`}>
                          <div className="text-sm font-extrabold leading-none">{x.v}</div>
                          <div className="text-[9px] font-bold uppercase mt-0.5 opacity-80">{x.l}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.status !== 'NOT_SUBMITTED' && (
                    <p className="mt-2 text-[11px] text-slate-400 font-medium">
                      Submitted {fmtTime(c.submittedAt)}{c.edited ? ' · edited by admin' : ''}{c.confirmedAt ? ` · confirmed ${fmtTime(c.confirmedAt)}` : ''}
                    </p>
                  )}
                </button>

                <div className="px-4 pb-4 flex gap-2">
                  <button onClick={() => setOpen(c)} className="flex-1 text-xs font-bold py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                    {c.status === 'NOT_SUBMITTED' ? 'Fill' : 'Review / edit'}
                  </button>
                  {c.status === 'NOT_SUBMITTED' && c.classTeacher && (
                    <button
                      onClick={() => remind(c)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Notify teacher
                    </button>
                  )}
                  {c.status === 'SUBMITTED' && (
                    <button
                      onClick={() => quickConfirm(c)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Confirm
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
};
