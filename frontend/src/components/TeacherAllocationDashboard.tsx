import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Users, Plus } from './icons';
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
                    <p className="font-semibold">No subjects mapped in curriculum.</p>
                    <p className="text-sm mt-1">Please go to 'Curriculum & Subjects' and map subjects to this class first.</p>
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
                      return (
                        <TableCell key={`sub-${sub._id}-${div}`} className="px-4 py-3 border-r align-top">
                          <NativeSelect
                            value={alloc?.teacherId?._id || ''}
                            onChange={e => handleAssignSubjectTeacher(div, sub._id, e.target.value, alloc?._id)}
                            disabled={saving}
                            className={`w-full ${alloc ? 'font-semibold bg-success-soft text-success-soft-foreground' : 'text-muted-foreground'}`}
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
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
