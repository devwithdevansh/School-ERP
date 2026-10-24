import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { CalendarDays, Plus, Trash2, Clock, MapPin } from './icons';
import { getActiveStandards } from '../utils/standardUtils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The backend stores times as "H:MM AM/PM" strings; <input type="time"> needs
// 24-hour "HH:MM". These convert between the two so the picker can't produce
// a string the backend's time-parsing regex fails to understand.
const to24Hour = (display: string): string => {
  const match = display.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '';
  let h = parseInt(match[1], 10);
  const m = match[2];
  const mod = match[3].toUpperCase();
  if (h === 12 && mod === 'AM') h = 0;
  if (h !== 12 && mod === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m}`;
};

const to12Hour = (value24: string): string => {
  const [hStr, m] = value24.split(':');
  let h = parseInt(hStr, 10);
  const mod = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${mod}`;
};

export const Timetable: React.FC = () => {
  const { 
    academicYears, 
    curriculums,
    users, // Teachers
    currentUser,
    authFetch,
    feeStructures,
    teacherAllocations = [],
    subjects: allMasterSubjects = []
  } = useApp();

  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];

  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeStandards = React.useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, undefined); // Medium can change, we might just pass selectedMedium if we want, or leave undefined to get all
  }, [feeStructures, activeYear?.name]);

  // Filters
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('English');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [viewMode, setViewMode] = useState<'CLASS' | 'TEACHER'>('CLASS');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    dayOfWeek: 'Monday',
    periodName: 'Period 1',
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectId: '',
    teacherId: ''
  });

  const fetchTimetable = async () => {
    if (!activeYear) return;
    if (viewMode === 'CLASS' && (!selectedStandard || !selectedDivision)) return;
    if (viewMode === 'TEACHER' && !selectedTeacher && currentUser?.role !== 'TEACHER') return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewMode === 'CLASS') {
        params.append('standard', selectedStandard);
        params.append('division', selectedDivision);
        params.append('medium', selectedMedium);
      } else {
        if (currentUser?.role === 'TEACHER') {
          // It will automatically use req.user._id
        } else {
          params.append('teacherId', selectedTeacher);
        }
      }

      const res = await authFetch(`/api/v1/erp/timetable?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPeriods(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [selectedStandard, selectedDivision, selectedMedium, selectedTeacher, viewMode, activeYear]);

  const teachers = users.filter(u => u.role === 'TEACHER');

  // Allocations for the selected class (Standard, Division, Medium)
  const classAllocations = React.useMemo(() => {
    if (!activeYear || !selectedStandard || !selectedMedium) return [];
    return teacherAllocations.filter(a => {
      const isDivMatch = !selectedDivision || a.division?.toUpperCase() === selectedDivision.toUpperCase();
      return (
        a.academicYearId === activeYear._id &&
        a.standard === selectedStandard &&
        a.medium === selectedMedium &&
        isDivMatch
      );
    });
  }, [activeYear, teacherAllocations, selectedStandard, selectedDivision, selectedMedium]);

  // Derived subjects for the form:
  // Combines: 1. Subjects allocated to this class in teacherAllocations
  //           2. Subjects in curriculum mapping
  //           3. All master subjects (if unmapped, so user never has to write manually!)
  const formSubjects = React.useMemo(() => {
    if (!activeYear || !selectedStandard || !selectedMedium) return [];
    const map = new Map<string, any>();

    // 1. Subjects that have been allocated to teachers for this class
    classAllocations.forEach(a => {
      const sObj = typeof a.subjectId === 'object' ? a.subjectId : allMasterSubjects?.find((s: any) => s._id === a.subjectId);
      if (sObj && sObj._id) {
        map.set(sObj._id, sObj);
      }
    });

    // 2. Subjects from curriculum mapping
    const curr = curriculums.find(c => 
      c.academicYearId === activeYear._id && 
      c.standard === selectedStandard && 
      c.medium === selectedMedium
    );
    (curr?.subjects || []).forEach((s: any) => {
      if (s && s._id && !map.has(s._id)) {
        map.set(s._id, s);
      }
    });

    // 3. Fallback to all master subjects if none mapped
    if (map.size === 0 && allMasterSubjects && allMasterSubjects.length > 0) {
      allMasterSubjects.forEach((s: any) => {
        if (s && s._id) map.set(s._id, s);
      });
    }

    return Array.from(map.values());
  }, [activeYear, selectedStandard, selectedDivision, selectedMedium, classAllocations, curriculums, allMasterSubjects]);

  const getAllocatedTeacherForSubject = (subjectId: string) => {
    if (!subjectId) return null;
    const alloc = classAllocations.find(a => {
      const sId = typeof a.subjectId === 'object' ? a.subjectId?._id : a.subjectId;
      return sId === subjectId;
    });
    if (!alloc) return null;
    return typeof alloc.teacherId === 'object' ? alloc.teacherId : teachers.find(t => t._id === alloc.teacherId);
  };

  const handleSubjectChange = (subjectId: string) => {
    if (!subjectId) {
      setNewPeriod(prev => ({ ...prev, subjectId: '', teacherId: '' }));
      return;
    }
    const allocated = getAllocatedTeacherForSubject(subjectId);
    setNewPeriod(prev => ({
      ...prev,
      subjectId,
      // Auto-populate teacher if allocated!
      teacherId: allocated?._id || prev.teacherId
    }));
  };

  const handleTeacherChange = (teacherId: string) => {
    setNewPeriod(prev => ({ ...prev, teacherId }));
    if (teacherId) {
      // Find what subject(s) this teacher is allocated to in this class
      const teacherAllocs = classAllocations.filter(a => {
        const tId = typeof a.teacherId === 'object' ? a.teacherId?._id : a.teacherId;
        return tId === teacherId;
      });
      // If this teacher is allocated to 1 subject in this class, auto-select that subject!
      if (teacherAllocs.length === 1) {
        const sId = typeof teacherAllocs[0].subjectId === 'object'
          ? teacherAllocs[0].subjectId?._id
          : teacherAllocs[0].subjectId;
        if (sId) {
          setNewPeriod(prev => ({ ...prev, teacherId, subjectId: sId }));
        }
      }
    }
  };

  const handleCreate = async () => {
    if (!selectedStandard || !selectedDivision || !selectedMedium) {
      alert('Please select Standard, Division, and Medium first.');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        standard: selectedStandard,
        division: selectedDivision,
        medium: selectedMedium,
        ...newPeriod,
        subjectId: newPeriod.subjectId || null,
        teacherId: newPeriod.teacherId || null
      };
      
      const res = await authFetch('/api/v1/erp/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to schedule period');
      }

      setShowForm(false);
      fetchTimetable();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this period?')) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/erp/timetable/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete period');
      }
      setPeriods(prev => prev.filter(p => p._id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group periods by day for the grid
  const periodsByDay = DAYS.map(day => ({
    day,
    periods: periods.filter(p => p.dayOfWeek === day).sort((a, b) => {
      // Simple string compare works if HH:MM AM/PM is formatted carefully, 
      // but ideally we'd parse it. Let's do a simple parse:
      const parseTime = (t: string) => {
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if(!match) return 0;
        let h = parseInt(match[1]);
        if(h === 12 && match[3].toUpperCase() === 'AM') h = 0;
        if(h !== 12 && match[3].toUpperCase() === 'PM') h += 12;
        return h * 60 + parseInt(match[2]);
      }
      return parseTime(a.startTime) - parseTime(b.startTime);
    })
  }));

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto bg-slate-50/50 min-h-[calc(100vh-2rem)] animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-indigo-500" />
            Timetable Builder
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage class schedules and teacher assignments</p>
        </div>
        {currentUser?.role === 'ADMIN' && viewMode === 'CLASS' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            {showForm ? 'Close Form' : <><Plus className="w-4 h-4" /> Add Period</>}
          </button>
        )}
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setViewMode('CLASS')}
             className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${viewMode === 'CLASS' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Class Timetable
           </button>
           <button 
             onClick={() => setViewMode('TEACHER')}
             className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${viewMode === 'TEACHER' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Teacher Timetable
           </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {viewMode === 'CLASS' ? (
            <>
              <select 
                value={selectedStandard} 
                onChange={e => {
                  const val = e.target.value;
                  setSelectedStandard(val);
                  if (val && !selectedDivision) setSelectedDivision('A');
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">Select Std</option>
                {activeStandards.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={selectedDivision}
                onChange={e => setSelectedDivision(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">Div</option>
                {['A', 'B', 'C', 'D'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                value={selectedMedium} 
                onChange={e => setSelectedMedium(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="English">English</option>
                <option value="Gujarati">Gujarati</option>
              </select>
            </>
          ) : (
             currentUser?.role === 'ADMIN' ? (
               <select 
                 value={selectedTeacher} 
                 onChange={e => setSelectedTeacher(e.target.value)}
                 className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
               >
                 <option value="">Select Teacher</option>
                 {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
               </select>
             ) : (
               <div className="text-sm font-bold text-slate-700 px-3 py-2">My Timetable</div>
             )
          )}
        </div>
      </div>

      {/* Add Period Form */}
      {showForm && viewMode === 'CLASS' && (
        <div className="bg-blue-50/60 p-6 rounded-3xl border border-blue-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Day</label>
              <select 
                value={newPeriod.dayOfWeek} 
                onChange={e => setNewPeriod({ ...newPeriod, dayOfWeek: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
              <input 
                type="text" 
                value={newPeriod.periodName} 
                onChange={e => setNewPeriod({ ...newPeriod, periodName: e.target.value })}
                placeholder="Period 1"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start</label>
              <input
                type="time"
                value={to24Hour(newPeriod.startTime)}
                onChange={e => setNewPeriod({ ...newPeriod, startTime: to12Hour(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End</label>
              <input
                type="time"
                value={to24Hour(newPeriod.endTime)}
                onChange={e => setNewPeriod({ ...newPeriod, endTime: to12Hour(e.target.value) })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Subject & Teacher</label>
                {newPeriod.subjectId && getAllocatedTeacherForSubject(newPeriod.subjectId) && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Auto-allocated: {getAllocatedTeacherForSubject(newPeriod.subjectId)?.name}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <select 
                  value={newPeriod.subjectId} 
                  onChange={e => handleSubjectChange(e.target.value)}
                  className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">Recess / Free</option>
                  {formSubjects.map((s: any) => {
                    const allocated = getAllocatedTeacherForSubject(s._id);
                    return (
                      <option key={s._id} value={s._id}>
                        {s.subjectName} {allocated ? `(${allocated.name})` : ''}
                      </option>
                    );
                  })}
                </select>
                <select 
                  value={newPeriod.teacherId} 
                  onChange={e => handleTeacherChange(e.target.value)}
                  className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">None (Free / Recess)</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleCreate}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors"
            >
              {saving ? 'Saving...' : 'Add to Timetable'}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 font-medium">Loading timetable...</div>
        ) : periods.length === 0 ? (
          <div className="p-10 text-center text-slate-400 font-medium">No periods scheduled for this selection.</div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {periodsByDay.map(({ day, periods: dayPeriods }) => dayPeriods.length > 0 && (
              <div key={day} className="flex flex-col md:flex-row">
                <div className="bg-slate-50 w-full md:w-32 p-4 flex items-center justify-center border-r border-slate-100 shrink-0">
                  <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">{day.substring(0,3)}</span>
                </div>
                <div className="flex-1 p-4 flex gap-4 overflow-x-auto">
                  {dayPeriods.map(p => (
                    <div key={p._id} className={`shrink-0 w-48 rounded-xl border p-3 relative group
                      ${!p.subjectId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-blue-300'}
                    `}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{p.periodName}</span>
                        {currentUser?.role === 'ADMIN' && (
                          <button 
                            onClick={() => handleDelete(p._id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-sm font-bold text-slate-800 mb-1 truncate">
                        {p.subjectId ? p.subjectId.subjectName : 'Recess / Free'}
                      </div>
                      
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-3.5 h-3.5" /> {p.startTime} - {p.endTime}
                      </div>
                      
                      {p.teacherId && viewMode === 'CLASS' && (
                        <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg inline-block">
                          {p.teacherId.name}
                        </div>
                      )}
                      
                      {viewMode === 'TEACHER' && (
                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Std {p.standard}-{p.division}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
