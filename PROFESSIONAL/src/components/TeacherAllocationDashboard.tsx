import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store';
import { Users, Plus, Zap } from './icons';
import { getActiveStandards } from '../utils/standardUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    feeStructures,
    subjects: allMasterSubjects
  } = useApp();

  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];
  const teachers = users.filter(u => u.role === 'TEACHER');

  const [standard, setStandard] = useState('');
  const [medium, setMedium] = useState('English');
  const [saving, setSaving] = useState(false);
  const [fetchedMasterSubjects, setFetchedMasterSubjects] = useState<any[]>([]);

  // Direct fetch fallback in case store subjects list is empty or pending
  useEffect(() => {
    if (allMasterSubjects && allMasterSubjects.length > 0) {
      setFetchedMasterSubjects(allMasterSubjects);
      return;
    }
    let isMounted = true;
    authFetch('/api/v1/academic-master/subjects')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (isMounted && json?.data) {
          setFetchedMasterSubjects(json.data);
        }
      })
      .catch(err => console.error('Failed to fetch subjects directly in TeacherAllocation:', err));
    return () => { isMounted = false; };
  }, [allMasterSubjects, authFetch]);

  const masterList = useMemo(() => {
    return (allMasterSubjects && allMasterSubjects.length > 0) ? allMasterSubjects : fetchedMasterSubjects;
  }, [allMasterSubjects, fetchedMasterSubjects]);
  
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
  
  // Combine: 1. Existing allocated subjects for this class
  //          2. Curriculum mapped subjects for this class
  //          3. ALL Master Subjects from Subject Master (so teachers can be allocated immediately!)
  const subjects = useMemo(() => {
    if (!standard || !medium) return [];
    const map = new Map<string, any>();

    // A. Any subject that already has an allocation in this class
    teacherAllocations.forEach(a => {
      if (a.academicYearId === activeYear?._id && a.standard === standard && a.medium === medium && a.subjectId) {
        const sId = typeof a.subjectId === 'object' ? a.subjectId._id : a.subjectId;
        const sObj = typeof a.subjectId === 'object' && a.subjectId.subjectName
          ? a.subjectId
          : masterList.find((s: any) => s._id === sId) || { _id: sId, subjectName: 'Unknown Subject', type: 'Theory' };
        if (sObj && sObj._id && !map.has(sObj._id)) {
          map.set(sObj._id, sObj);
        }
      }
    });

    // B. Curriculum mapped subjects
    if (classCurriculum?.subjects && classCurriculum.subjects.length > 0) {
      classCurriculum.subjects.forEach((s: any) => {
        const sId = typeof s === 'object' ? s._id : s;
        const sObj = typeof s === 'object' && s.subjectName
          ? s
          : masterList.find((m: any) => m._id === sId);
        if (sObj && sObj._id && !map.has(sObj._id)) {
          map.set(sObj._id, sObj);
        }
      });
    }

    // C. Always include ALL master subjects so every subject can be allocated to teachers directly!
    if (masterList && masterList.length > 0) {
      masterList.forEach((s: any) => {
        if (s && s._id && !map.has(s._id)) {
          map.set(s._id, s);
        }
      });
    }

    return Array.from(map.values());
  }, [classCurriculum, teacherAllocations, masterList, activeYear?._id, standard, medium]);

  // 2. Derive existing divisions (default to 'A' if empty)
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

    // Default to 'A' if none found so teacher can be assigned immediately
    if (divSet.size === 0) {
      divSet.add('A');
    }

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

  const handleAddTeacherToSubject = async (
    division: string, 
    subjectId: string, 
    newTeacherId: string, 
    existingAllocationId?: string, 
    currentTeacherIds: string[] = []
  ) => {
    if (!activeYear || !standard || !medium || !newTeacherId) return;
    const updatedIds = [...new Set([...currentTeacherIds, newTeacherId])];
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/erp/allocations/subject-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYearId: activeYear._id,
          standard,
          division,
          medium,
          subjectId,
          teacherIds: updatedIds
        })
      });
      if (!res.ok) throw new Error('Failed to assign teacher');
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeacherFromSubject = async (
    division: string, 
    subjectId: string, 
    removeTeacherId: string, 
    existingAllocationId?: string, 
    currentTeacherIds: string[] = []
  ) => {
    if (!activeYear || !standard || !medium) return;
    const updatedIds = currentTeacherIds.filter(id => id !== removeTeacherId);
    setSaving(true);
    try {
      if (updatedIds.length === 0) {
        if (existingAllocationId) {
          const res = await authFetch(`/api/v1/erp/allocations/subject-teacher/${existingAllocationId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to remove allocation');
        }
      } else {
        const res = await authFetch('/api/v1/erp/allocations/subject-teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            academicYearId: activeYear._id,
            standard,
            division,
            medium,
            subjectId,
            teacherIds: updatedIds
          })
        });
        if (!res.ok) throw new Error('Failed to update teacher allocation');
      }
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 min-h-[calc(100vh-2rem)] p-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Users className="size-7 text-primary" />
            Teacher Allocation (Grid)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Quickly assign teachers across all divisions for {activeYear?.name}</p>
        </div>
      </div>

      {/* Selectors */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="w-[140px] space-y-1.5">
            <Label>Standard</Label>
            <NativeSelect
              value={standard}
              onChange={e => {
                setStandard(e.target.value);
                setManualDivisions([]); // reset manual divs when switching classes
              }}
              className="w-full"
            >
              <option value="">Select Std...</option>
              {activeStandards.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="w-[140px] space-y-1.5">
            <Label>Medium</Label>
            <NativeSelect value={medium} onChange={e => setMedium(e.target.value)} className="w-full">
              <option value="English">English</option>
              <option value="Gujarati">Gujarati</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {standard && medium && (
        <>
          {subjects.length > 0 && (!classCurriculum || !classCurriculum.subjects || classCurriculum.subjects.length === 0) && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl text-xs font-semibold shadow-xs">
              <Zap className="h-4 w-4 text-blue-600 shrink-0" />
              <span>All Master Subjects are automatically available. Assigning a teacher will automatically link the subject to this curriculum!</span>
            </div>
          )}
          <Card className="p-0 gap-0">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="px-5 sticky left-0 z-10 w-48 border-r bg-card">
                  Subject \ Division
                </TableHead>
                {divisions.map(div => (
                  <TableHead key={div} className="px-4 text-center border-r min-w-[180px]">
                    <Badge variant="secondary" className="size-9 rounded-lg text-sm font-bold">{div}</Badge>
                  </TableHead>
                ))}
                <TableHead className="px-4 text-center min-w-[140px]">
                  <Button variant="ghost" size="sm" onClick={handleAddDivision}>
                    <Plus /> Add Div
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* HOMEROOM ROW */}
              <TableRow>
                <TableCell className="px-5 py-4 sticky left-0 z-10 border-r bg-card">
                  <div className="font-bold">Homeroom Teacher</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Class Teacher</div>
                </TableCell>
                {divisions.map(div => {
                  const alloc = classTeacherAllocations.find(a =>
                    a.academicYearId === activeYear?._id && a.standard === standard && a.medium === medium && a.division?.toUpperCase() === div
                  );
                  return (
                    <TableCell key={`homeroom-${div}`} className="px-4 py-3 border-r align-top">
                      <NativeSelect
                        value={alloc?.teacherId?._id || ''}
                        onChange={e => handleAssignClassTeacher(div, e.target.value, alloc?._id)}
                        disabled={saving}
                        className={`w-full ${alloc ? 'font-bold bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                      >
                        <option value="">Unassigned</option>
                        {teachers.map(t => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </NativeSelect>
                    </TableCell>
                  );
                })}
                <TableCell />
              </TableRow>

              {/* SUBJECT ROWS */}
              {subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={divisions.length + 2} className="px-6 py-12 text-center text-muted-foreground whitespace-normal">
                    <p className="font-semibold">No subjects created yet.</p>
                    <p className="text-sm mt-1">Please add subjects in 'Curriculum & Subjects' first so you can allocate teachers to them.</p>
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map(sub => (
                  <TableRow key={sub._id}>
                    <TableCell className="px-5 py-4 sticky left-0 z-10 border-r bg-card">
                      <div className="font-bold">{sub.subjectName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{sub.type}</div>
                    </TableCell>
                    {divisions.map(div => {
                      const alloc = teacherAllocations.find(a => {
                        const sId = a.subjectId && typeof a.subjectId === 'object' ? a.subjectId._id : a.subjectId;
                        return a.academicYearId === activeYear?._id && a.standard === standard && a.medium === medium && a.division?.toUpperCase() === div && sId === sub._id;
                      });

                      // Extract all allocated teachers (handling both teacherIds array and legacy single teacherId)
                      const assignedTeachers: any[] = [];
                      const rawTeacherIds = (alloc as any)?.teacherIds;
                      if (Array.isArray(rawTeacherIds) && rawTeacherIds.length > 0) {
                        rawTeacherIds.forEach((t: any) => {
                          const tObj = typeof t === 'object' ? t : teachers.find(u => u._id === t);
                          if (tObj && !assignedTeachers.some(x => x._id === tObj._id)) assignedTeachers.push(tObj);
                        });
                      } else if (alloc?.teacherId) {
                        const tObj = typeof alloc.teacherId === 'object' ? alloc.teacherId : teachers.find(u => u._id === alloc.teacherId);
                        if (tObj) assignedTeachers.push(tObj);
                      }

                      const assignedIds = assignedTeachers.map(t => t._id);

                      return (
                        <TableCell key={`sub-${sub._id}-${div}`} className="px-4 py-3 border-r align-top">
                          {assignedTeachers.length > 0 ? (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap gap-1">
                                {assignedTeachers.map((t, idx) => (
                                  <span
                                    key={t._id}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                                  >
                                    <span>{t.name}</span>
                                    {assignedTeachers.length > 1 && (
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1 rounded">
                                        T{idx + 1}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => handleRemoveTeacherFromSubject(div, sub._id, t._id, alloc?._id, assignedIds)}
                                      className="text-emerald-700 hover:text-red-600 hover:bg-emerald-200/60 rounded size-3.5 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Remove teacher"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <NativeSelect
                                value=""
                                onChange={e => {
                                  if (e.target.value) {
                                    handleAddTeacherToSubject(div, sub._id, e.target.value, alloc?._id, assignedIds);
                                  }
                                }}
                                disabled={saving}
                                className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
                              >
                                <option value="">+ Add Teacher...</option>
                                {teachers
                                  .filter(t => !assignedIds.includes(t._id))
                                  .map(t => (
                                    <option key={t._id} value={t._id}>{t.name}</option>
                                  ))}
                              </NativeSelect>
                            </div>
                          ) : (
                            <NativeSelect
                              value=""
                              onChange={e => {
                                if (e.target.value) {
                                  handleAddTeacherToSubject(div, sub._id, e.target.value, alloc?._id, []);
                                }
                              }}
                              disabled={saving}
                              className="w-full text-muted-foreground"
                            >
                              <option value="">Assign Teacher...</option>
                              {teachers.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                              ))}
                            </NativeSelect>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
        </>
      )}
    </div>
  );
};
