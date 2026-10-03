import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Users, Plus } from 'lucide-react';
import { getActiveStandards } from '../utils/standardUtils';

export const TeacherAllocationDashboard: React.FC = () => {
  const { 
    academicYears, 
    curriculums, 
    teacherAllocations, 
    classTeacherAllocations, 
    students,
    users, 
    authFetch, 
    refreshData,
    feeStructures
  } = useApp();

  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];
  const teachers = users.filter(u => u.role === 'TEACHER');

  const [standard, setStandard] = useState('');
  const [medium, setMedium] = useState('English');
  const [saving, setSaving] = useState(false);
  
  // Local state to track manually added divisions (e.g. before any student or teacher is added)
  const [manualDivisions, setManualDivisions] = useState<string[]>([]);

  const activeStandards = useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, medium);
  }, [feeStructures, activeYear?.name, medium]);

  // 1. Get Curriculum Subjects for selected class
  const classCurriculum = curriculums.find(c => 
    c.academicYearId === activeYear?._id && 
    c.standard === standard && 
    c.medium === medium
  );
  const subjects = classCurriculum?.subjects || [];

  // 2. Derive existing divisions
  const divisions = useMemo(() => {
    if (!activeYear || !standard) return [];
    
    const divSet = new Set<string>();
    
    // From Students
    students.forEach(s => {
      if (s.standard === standard && s.medium === medium && s.division) {
        divSet.add(s.division.toUpperCase());
      }
    });

    // From Class Teacher Allocations
    classTeacherAllocations.forEach(a => {
      if (a.academicYearId === activeYear._id && a.standard === standard && a.medium === medium && a.division) {
        divSet.add(a.division.toUpperCase());
      }
    });

    // From Subject Teacher Allocations
    teacherAllocations.forEach(a => {
      if (a.academicYearId === activeYear._id && a.standard === standard && a.medium === medium && a.division) {
        divSet.add(a.division.toUpperCase());
      }
    });

    // Add manual divisions
    manualDivisions.forEach(d => divSet.add(d.toUpperCase()));

    return Array.from(divSet).sort();
  }, [activeYear, standard, medium, students, classTeacherAllocations, teacherAllocations, manualDivisions]);

  const handleAddDivision = () => {
    const div = prompt("Enter new division (e.g., A, B, C):");
    if (div && div.trim() !== '') {
      const formatted = div.trim().toUpperCase();
      if (!divisions.includes(formatted)) {
        setManualDivisions(prev => [...prev, formatted]);
      }
    }
  };

  // --- Handlers ---
  const handleAssignClassTeacher = async (division: string, teacherId: string, existingAllocationId?: string) => {
    if (!activeYear || !standard || !medium) return;
    setSaving(true);
    try {
      if (!teacherId) {
        if (existingAllocationId) {
          const res = await authFetch(`/api/v1/erp/allocations/class-teacher/${existingAllocationId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to remove class teacher allocation');
        }
      } else {
        const res = await authFetch('/api/v1/erp/allocations/class-teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ academicYearId: activeYear._id, standard, division, medium, teacherId })
        });
        if (!res.ok) throw new Error('Failed to assign class teacher');
      }
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSubjectTeacher = async (division: string, subjectId: string, teacherId: string, existingAllocationId?: string) => {
    if (!activeYear || !standard || !medium) return;
    setSaving(true);
    try {
      if (!teacherId) {
        if (existingAllocationId) {
          const res = await authFetch(`/api/v1/erp/allocations/subject-teacher/${existingAllocationId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to remove subject allocation');
        }
      } else {
        const res = await authFetch('/api/v1/erp/allocations/subject-teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ academicYearId: activeYear._id, standard, division, medium, subjectId, teacherId })
        });
        if (!res.ok) throw new Error('Failed to assign subject teacher');
      }
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50/50 min-h-[calc(100vh-2rem)] p-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-500" />
            Teacher Allocation (Grid)
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Quickly assign teachers across all divisions for {activeYear?.name}</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-wrap gap-4 items-end">
        <div className="w-[140px]">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Standard</label>
          <select 
            value={standard} 
            onChange={e => {
              setStandard(e.target.value);
              setManualDivisions([]); // reset manual divs when switching classes
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value="">Select Std...</option>
            {activeStandards.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="w-[140px]">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Medium</label>
          <select 
            value={medium} 
            onChange={e => setMedium(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          >
            <option value="English">English</option>
            <option value="Gujarati">Gujarati</option>
          </select>
        </div>
      </div>

      {standard && medium && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 sticky left-0 z-10 w-48 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Subject \ Division
                  </th>
                  {divisions.map(div => (
                    <th key={div} className="px-4 py-4 text-center border-r border-slate-100 min-w-[180px]">
                      <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-800 text-sm font-bold w-10 h-10 rounded-xl">
                        {div}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center min-w-[140px]">
                    <button 
                      onClick={handleAddDivision}
                      className="text-indigo-600 hover:text-indigo-700 font-bold text-sm flex items-center gap-1.5 justify-center w-full"
                    >
                      <Plus className="w-4 h-4" /> Add Div
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* HOMEROOM ROW */}
                <tr className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-5 py-4 bg-white sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="font-bold text-indigo-600">Homeroom Teacher</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Class Teacher</div>
                  </td>
                  {divisions.map(div => {
                    const alloc = classTeacherAllocations.find(a =>
                      a.academicYearId === activeYear?._id && a.standard === standard && a.medium === medium && a.division?.toUpperCase() === div
                    );
                    return (
                      <td key={`homeroom-${div}`} className="px-4 py-3 border-r border-slate-100 align-top">
                        <select 
                          value={alloc?.teacherId?._id || ''}
                          onChange={e => handleAssignClassTeacher(div, e.target.value, alloc?._id)}
                          disabled={saving}
                          className={`w-full text-sm rounded-lg px-3 py-2 outline-none border transition-colors ${
                            alloc ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500 focus:ring-2 focus:ring-indigo-500'
                          }`}
                        >
                          <option value="">Unassigned</option>
                          {teachers.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                  <td></td>
                </tr>

                {/* SUBJECT ROWS */}
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={divisions.length + 2} className="px-6 py-12 text-center text-slate-500">
                      <p className="font-semibold">No subjects mapped in curriculum.</p>
                      <p className="text-sm mt-1">Please go to 'Curriculum & Subjects' and map subjects to this class first.</p>
                    </td>
                  </tr>
                ) : (
                  subjects.map(sub => (
                    <tr key={sub._id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-5 py-4 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] transition-colors">
                        <div className="font-bold text-slate-800">{sub.subjectName}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{sub.type}</div>
                      </td>
                      {divisions.map(div => {
                        const alloc = teacherAllocations.find(a => {
                          const sId = a.subjectId && typeof a.subjectId === 'object' ? a.subjectId._id : a.subjectId;
                          return a.academicYearId === activeYear?._id && a.standard === standard && a.medium === medium && a.division?.toUpperCase() === div && sId === sub._id;
                        });
                        return (
                          <td key={`sub-${sub._id}-${div}`} className="px-4 py-3 border-r border-slate-100 align-top">
                            <select 
                              value={alloc?.teacherId?._id || ''}
                              onChange={e => handleAssignSubjectTeacher(div, sub._id, e.target.value, alloc?._id)}
                              disabled={saving}
                              className={`w-full text-sm rounded-lg px-3 py-2 outline-none border transition-colors ${
                                alloc ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-500 focus:ring-2 focus:ring-emerald-500'
                              }`}
                            >
                              <option value="">Unassigned</option>
                              {teachers.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                      <td></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
