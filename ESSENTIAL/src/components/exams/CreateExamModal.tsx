import React, { useState, useMemo } from 'react';
import { useApp } from '../../store';
import { Plus, X, Zap, Calendar, ClipboardList, Check, Layers, AlertCircle } from '../icons';
import { getActiveStandards } from '../../utils/standardUtils';

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCreated: () => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({ isOpen, onClose, onExamCreated }) => {
  const { academicYears, curriculums, authFetch, feeStructures, teacherAllocations = [], subjects: masterSubjects = [] } = useApp();
  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];

  const [mode, setMode] = useState<'FINAL' | 'WEEKLY'>('FINAL');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [examName, setExamName] = useState('');
  const [standard, setStandard] = useState('');
  const [medium, setMedium] = useState('English');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(['A']);
  const [allowTeacherPublish, setAllowTeacherPublish] = useState(false);

  // Subjects for the exam
  const [subjects, setSubjects] = useState<Array<{
    subjectId: string;
    examDate: string;
    startTime: string;
    endTime: string;
    maxMarks: number;
    passingMarks: number;
    gradingSystem: string;
  }>>([]);

  // Weekly Test quick fields
  const [weeklySubjectId, setWeeklySubjectId] = useState('');
  const [weeklyDate, setWeeklyDate] = useState(new Date().toISOString().split('T')[0]);
  const [weeklyMaxMarks, setWeeklyMaxMarks] = useState(25);
  const [weeklyPassingMarks, setWeeklyPassingMarks] = useState(9);

  const activeStandards = useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, medium);
  }, [feeStructures, activeYear?.name, medium]);

  const availableSubjects = useMemo(() => {
    if (!activeYear || !standard || !medium) return [];
    const map = new Map<string, any>();

    // 1. Allocated subjects for this standard/medium
    teacherAllocations.forEach(a => {
      if (a.academicYearId === activeYear._id && a.standard === standard && a.medium === medium && a.subjectId) {
        const sObj = typeof a.subjectId === 'object' ? a.subjectId : masterSubjects.find((s: any) => s._id === a.subjectId);
        if (sObj && sObj._id) map.set(sObj._id, sObj);
      }
    });

    // 2. Curriculum subjects
    const curr = curriculums.find(c =>
      c.academicYearId === activeYear._id &&
      c.standard === standard &&
      c.medium === medium
    );
    (curr?.subjects || []).forEach((s: any) => {
      const sObj = typeof s === 'object' ? s : masterSubjects.find((sub: any) => sub._id === s);
      if (sObj && sObj._id && !map.has(sObj._id)) map.set(sObj._id, sObj);
    });

    // 3. Fallback to all master subjects
    if (map.size === 0 && masterSubjects && masterSubjects.length > 0) {
      masterSubjects.forEach((s: any) => {
        if (s && s._id) map.set(s._id, s);
      });
    }

    return Array.from(map.values());
  }, [activeYear, curriculums, teacherAllocations, masterSubjects, standard, medium]);

  if (!isOpen) return null;

  const toggleDivision = (div: string) => {
    setSelectedDivisions(prev =>
      prev.includes(div) ? prev.filter(d => d !== div) : [...prev, div]
    );
  };

  const handleApplyAllMaxMarks = (max: number, pass: number) => {
    setSubjects(prev => prev.map(s => ({
      ...s,
      maxMarks: max,
      passingMarks: pass
    })));
  };

  const handleSubmit = async () => {
    if (!standard) {
      alert('Please select a standard.');
      return;
    }

    setSaving(true);
    try {
      let payload: any;

      if (mode === 'WEEKLY') {
        if (!weeklySubjectId) {
          throw new Error('Please select a subject for the weekly test.');
        }
        const subObj = availableSubjects.find((s: any) => s._id === weeklySubjectId);
        const name = examName.trim() || `Weekly Test - ${subObj?.subjectName || 'Test'}`;

        payload = {
          examName: name,
          standard,
          divisions: selectedDivisions,
          medium,
          type: 'WEEKLY',
          status: 'SCHEDULED',
          allowTeacherPublish,
          subjects: [{
            subjectId: weeklySubjectId,
            examDate: weeklyDate || undefined,
            maxMarks: weeklyMaxMarks,
            passingMarks: weeklyPassingMarks,
            gradingSystem: 'Marks'
          }]
        };
      } else {
        if (!examName.trim()) {
          throw new Error('Please enter an exam name.');
        }
        if (subjects.length === 0) {
          throw new Error('Please include at least one subject in the schedule.');
        }

        payload = {
          examName: examName.trim(),
          standard,
          divisions: selectedDivisions,
          medium,
          type: 'FINAL',
          status: 'SCHEDULED',
          allowTeacherPublish,
          subjects
        };
      }

      const res = await authFetch('/api/v1/erp/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create exam');
      }

      onExamCreated();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Schedule Examination
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Academic Year: <span className="text-slate-600">{activeYear?.name || 'Current'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector: Wizard vs Quick Weekly */}
        <div className="px-6 pt-4 pb-2 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setMode('FINAL'); setStep(1); }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              mode === 'FINAL'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            Term / Final Exam (Multi-Subject)
          </button>

          <button
            type="button"
            onClick={() => setMode('WEEKLY')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              mode === 'WEEKLY'
                ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Quick Weekly Test (10s)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {mode === 'WEEKLY' ? (
            /* Quick Weekly Mode */
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                <Zap className="w-4 h-4 shrink-0 text-amber-600" />
                Quick setup for weekly classroom assessments and topic quizzes.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Standard</label>
                  <select
                    value={standard}
                    onChange={e => { setStandard(e.target.value); setWeeklySubjectId(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="">Select Standard</option>
                    {activeStandards.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medium</label>
                  <select
                    value={medium}
                    onChange={e => { setMedium(e.target.value); setWeeklySubjectId(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="English">English</option>
                    <option value="Gujarati">Gujarati</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                <select
                  value={weeklySubjectId}
                  onChange={e => setWeeklySubjectId(e.target.value)}
                  disabled={!standard}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
                >
                  <option value="">{standard ? 'Select Subject' : 'Select Standard first'}</option>
                  {availableSubjects.map((sub: any) => (
                    <option key={sub._id} value={sub._id}>{sub.subjectName} ({sub.subjectCode || 'Sub'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Test Date</label>
                  <input
                    type="date"
                    value={weeklyDate}
                    onChange={e => setWeeklyDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Marks</label>
                  <input
                    type="number"
                    value={weeklyMaxMarks}
                    onChange={e => setWeeklyMaxMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Passing Marks</label>
                  <input
                    type="number"
                    value={weeklyPassingMarks}
                    onChange={e => setWeeklyPassingMarks(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Test Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Test #3 - Algebra"
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={allowTeacherPublish}
                    onChange={e => setAllowTeacherPublish(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Allow subject teacher to publish marks</div>
                    <div className="text-[11px] text-slate-500">If checked, the teacher can publish results once all marks are entered.</div>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            /* Full Wizard Mode */
            <>
              {/* Wizard Steps indicator */}
              <div className="flex items-center justify-between px-2">
                <div className={`flex items-center gap-2 text-xs font-extrabold ${step === 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-indigo-600 text-white' : step > 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  Basics
                </div>
                <div className="h-0.5 w-12 bg-slate-200" />
                <div className={`flex items-center gap-2 text-xs font-extrabold ${step === 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-indigo-600 text-white' : step > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {step > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                  </span>
                  Schedule & Marks
                </div>
                <div className="h-0.5 w-12 bg-slate-200" />
                <div className={`flex items-center gap-2 text-xs font-extrabold ${step === 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    3
                  </span>
                  Publish Settings
                </div>
              </div>

              {/* Step 1: Basics */}
              {step === 1 && (
                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Standard</label>
                      <select
                        value={standard}
                        onChange={e => { setStandard(e.target.value); setSubjects([]); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      >
                        <option value="">Select Standard</option>
                        {activeStandards.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medium</label>
                      <select
                        value={medium}
                        onChange={e => { setMedium(e.target.value); setSubjects([]); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      >
                        <option value="English">English</option>
                        <option value="Gujarati">Gujarati</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Exam Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Annual Examination 2026 / Mid Term"
                      value={examName}
                      onChange={e => setExamName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Divisions</label>
                    <div className="flex gap-2">
                      {['A', 'B', 'C', 'D'].map(div => {
                        const isSelected = selectedDivisions.includes(div);
                        return (
                          <button
                            key={div}
                            type="button"
                            onClick={() => toggleDivision(div)}
                            className={`w-10 h-10 rounded-xl font-bold text-xs transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {div}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Leaving all selected creates the exam for the entire standard.</p>
                  </div>
                </div>
              )}

              {/* Step 2: Subjects & Schedule */}
              {step === 2 && (
                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Select Subjects & Passing Criteria</h4>
                      <p className="text-xs text-slate-400">Configure date, maximum marks and passing threshold.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyAllMaxMarks(100, 35)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        All 100/35
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyAllMaxMarks(50, 18)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        All 50/18
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {availableSubjects.map((sub: any) => {
                      const isSelected = subjects.some(s => s.subjectId === sub._id);
                      const currentSubject = subjects.find(s => s.subjectId === sub._id);

                      return (
                        <div
                          key={sub._id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSubjects(prev => [
                                      ...prev,
                                      {
                                        subjectId: sub._id,
                                        examDate: '',
                                        startTime: '09:00 AM',
                                        endTime: '12:00 PM',
                                        maxMarks: 100,
                                        passingMarks: 35,
                                        gradingSystem: sub.gradingSystem || 'Marks'
                                      }
                                    ]);
                                  } else {
                                    setSubjects(prev => prev.filter(s => s.subjectId !== sub._id));
                                  }
                                }}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <span className={`text-sm font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>
                                {sub.subjectName}
                              </span>
                            </label>
                            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {sub.subjectCode || 'Sub'}
                            </span>
                          </div>

                          {isSelected && currentSubject && (
                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-indigo-100/60 mt-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Exam Date</label>
                                <input
                                  type="date"
                                  value={currentSubject.examDate}
                                  onChange={e => {
                                    setSubjects(prev => prev.map(s => s.subjectId === sub._id ? { ...s, examDate: e.target.value } : s));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Type</label>
                                <select
                                  value={currentSubject.gradingSystem}
                                  onChange={e => {
                                    setSubjects(prev => prev.map(s => s.subjectId === sub._id ? { ...s, gradingSystem: e.target.value } : s));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="Marks">Marks</option>
                                  <option value="Grades">Grades</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Max</label>
                                <input
                                  type="number"
                                  value={currentSubject.maxMarks}
                                  onChange={e => {
                                    setSubjects(prev => prev.map(s => s.subjectId === sub._id ? { ...s, maxMarks: Number(e.target.value) } : s));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-indigo-500 text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Pass</label>
                                <input
                                  type="number"
                                  value={currentSubject.passingMarks}
                                  onChange={e => {
                                    setSubjects(prev => prev.map(s => s.subjectId === sub._id ? { ...s, passingMarks: Number(e.target.value) } : s));
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-indigo-500 text-center"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {availableSubjects.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No subjects found in curriculum for Std {standard} ({medium}).
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Publish Settings */}
              {step === 3 && (
                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-150">
                  <h4 className="font-extrabold text-slate-800 text-sm">Exam Governance & Permissions</h4>

                  <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-extrabold text-slate-800">Allow Teacher to Publish Marks</div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          By default, only School Administrators can publish results live to students and parents.
                          When toggled On, teachers assigned to this class or subjects can publish directly once all students have marks or are marked Absent.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowTeacherPublish}
                        onChange={e => setAllowTeacherPublish(e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mt-1 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Summary preview */}
                  <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-xs space-y-1.5 text-indigo-900 font-medium">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                      <Check className="w-4 h-4 text-emerald-600" /> Exam Setup Summary:
                    </div>
                    <div>• Name: <span className="font-bold">{examName}</span></div>
                    <div>• Standard: <span className="font-bold">Std {standard} ({medium})</span> · Divisions: <span className="font-bold">{selectedDivisions.join(', ')}</span></div>
                    <div>• Subjects: <span className="font-bold">{subjects.length} subjects configured</span></div>
                    <div>• Teacher Publishing: <span className="font-bold">{allowTeacherPublish ? 'Enabled (Assigned teachers can publish)' : 'Disabled (Admin only)'}</span></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          {mode === 'FINAL' && step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}

          {mode === 'WEEKLY' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !standard || !weeklySubjectId}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {saving ? 'Creating...' : 'Create Weekly Test'}
            </button>
          ) : step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  if (!standard || !examName.trim()) {
                    alert('Please select a standard and enter exam name.');
                    return;
                  }
                  setStep(2);
                } else if (step === 2) {
                  if (subjects.length === 0) {
                    alert('Please select at least one subject.');
                    return;
                  }
                  setStep(3);
                }
              }}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || subjects.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Creating Schedule...' : 'Confirm & Schedule Exam'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
