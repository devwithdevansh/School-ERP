import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../store';
import { Save, CheckCircle2, Clock, AlertTriangle, AlertCircle, Filter, Loader2, Check } from '../icons';

interface MarksEntryTabProps {
  exam: any;
  selectedDivision: string;
  onDivisionChange: (division: string) => void;
  selectedSubjectId: string;
  onSubjectChange: (subjectId: string) => void;
  onRefreshExam: () => void;
}

export const MarksEntryTab: React.FC<MarksEntryTabProps> = ({
  exam,
  selectedDivision,
  onDivisionChange,
  selectedSubjectId,
  onSubjectChange,
  onRefreshExam,
}) => {
  const { students, authFetch, currentUser } = useApp();

  const [resultsData, setResultsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'DIRTY' | 'SAVING' | 'SAVED'>('IDLE');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MISSING' | 'ABSENT' | 'FAILED'>('ALL');
  const [submittingSubject, setSubmittingSubject] = useState(false);

  // Focus navigation refs
  const inputsRef = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const autosaveTimerRef = useRef<any>(null);

  const selectedSubject = useMemo(() => {
    return exam.subjects?.find((s: any) => (s.subjectId?._id || s.subjectId) === selectedSubjectId);
  }, [exam, selectedSubjectId]);

  const maxMarks = selectedSubject?.maxMarks ?? 100;
  const passingMarks = selectedSubject?.passingMarks ?? 35;
  const isGrades = selectedSubject?.gradingSystem === 'Grades';

  // Load and merge students with existing results
  useEffect(() => {
    const loadData = async () => {
      if (!exam?._id || !selectedSubjectId || !selectedDivision) {
        setResultsData([]);
        return;
      }

      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/erp/exams/${exam._id}/results?subjectId=${selectedSubjectId}&division=${selectedDivision}`);
        let fetched: any[] = [];
        if (res.ok) {
          const json = await res.json();
          fetched = json.data || [];
        }

        // Filter active migrated students in this class
        const classStudents = students
          .filter(s =>
            s.standard === exam.standard &&
            s.division === selectedDivision &&
            s.medium === exam.medium &&
            s.isActive !== false &&
            s.isMigrated === true
          )
          .sort((a, b) => {
            if (a.rollNo != null && b.rollNo != null) return a.rollNo - b.rollNo;
            return a.studentName.localeCompare(b.studentName);
          });

        const merged = classStudents.map(st => {
          const existing = fetched.find(r => (r.studentId?._id || r.studentId?.id || r.studentId) === (st._id || st.id));
          return {
            studentId: st._id || st.id,
            studentName: st.studentName,
            rollNo: st.rollNo,
            attendance: existing?.attendance || 'PRESENT',
            marksObtained: existing?.marksObtained != null ? existing.marksObtained : '',
            gradeObtained: existing?.gradeObtained || '',
            remarks: existing?.remarks || ''
          };
        });

        setResultsData(merged);
        setSaveStatus('IDLE');
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [exam?._id, selectedSubjectId, selectedDivision]);

  // Bulk save implementation
  const performSave = async (dataToSave = resultsData) => {
    if (!exam?._id || !selectedSubjectId || !selectedDivision || dataToSave.length === 0) return;

    setSaving(true);
    setSaveStatus('SAVING');
    try {
      const payload = {
        subjectId: selectedSubjectId,
        division: selectedDivision,
        results: dataToSave.map(r => ({
          studentId: r.studentId,
          attendance: r.attendance,
          marksObtained: r.attendance === 'PRESENT' && r.marksObtained !== '' ? Number(r.marksObtained) : null,
          gradeObtained: r.attendance === 'PRESENT' && r.gradeObtained ? r.gradeObtained : null,
          remarks: r.remarks
        }))
      };

      const res = await authFetch(`/api/v1/erp/exams/${exam._id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save marks');
      }

      setSaveStatus('SAVED');
      onRefreshExam();
    } catch (err: any) {
      alert(err.message);
      setSaveStatus('DIRTY');
    } finally {
      setSaving(false);
    }
  };

  // Debounced autosave
  const triggerDebouncedAutosave = (updated: any[]) => {
    setSaveStatus('DIRTY');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      performSave(updated);
    }, 1500);
  };

  const handleFieldChange = (studentId: string, field: string, value: any) => {
    setResultsData(prev => {
      const next = prev.map(r => {
        if (r.studentId === studentId) {
          return { ...r, [field]: value };
        }
        return r;
      });
      triggerDebouncedAutosave(next);
      return next;
    });
  };

  const handleToggleAbsent = (studentId: string, isAbsent: boolean) => {
    setResultsData(prev => {
      const next = prev.map(r => {
        if (r.studentId === studentId) {
          const attendance = isAbsent ? 'ABSENT' : 'PRESENT';
          return {
            ...r,
            attendance,
            marksObtained: isAbsent ? '' : r.marksObtained,
            gradeObtained: isAbsent ? '' : r.gradeObtained
          };
        }
        return r;
      });
      triggerDebouncedAutosave(next);
      return next;
    });
  };

  const handleSubmitSubject = async () => {
    if (!exam?._id || !selectedSubjectId) return;
    if (!window.confirm('Submit this subject? This marks evaluation as complete.')) return;

    setSubmittingSubject(true);
    try {
      await performSave();
      const res = await authFetch(`/api/v1/erp/exams/${exam._id}/subjects/${selectedSubjectId}/submit`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit subject');
      }
      alert('Subject marks submitted successfully!');
      onRefreshExam();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingSubject(false);
    }
  };

  // Keyboard navigation: Enter or Down moves to next student
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      const nextStudent = filteredData[nextIndex];
      if (nextStudent && inputsRef.current[nextStudent.studentId]) {
        inputsRef.current[nextStudent.studentId]?.focus();
        inputsRef.current[nextStudent.studentId]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevStudent = filteredData[prevIndex];
        if (prevStudent && inputsRef.current[prevStudent.studentId]) {
          inputsRef.current[prevStudent.studentId]?.focus();
          inputsRef.current[prevStudent.studentId]?.select();
        }
      }
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = resultsData.length;
    let filled = 0;
    let absent = 0;
    let missing = 0;
    let failed = 0;

    resultsData.forEach(r => {
      if (r.attendance === 'ABSENT') {
        absent++;
        filled++;
      } else if (r.attendance === 'EXEMPT') {
        filled++;
      } else if (r.marksObtained !== '' && r.marksObtained != null) {
        filled++;
        if (Number(r.marksObtained) < passingMarks) {
          failed++;
        }
      } else if (isGrades && r.gradeObtained) {
        filled++;
      } else {
        missing++;
      }
    });

    return { total, filled, absent, missing, failed };
  }, [resultsData, passingMarks, isGrades]);

  // Filtered view
  const filteredData = useMemo(() => {
    return resultsData.filter(r => {
      if (activeFilter === 'MISSING') {
        return r.attendance === 'PRESENT' && (r.marksObtained === '' || r.marksObtained == null);
      }
      if (activeFilter === 'ABSENT') {
        return r.attendance === 'ABSENT';
      }
      if (activeFilter === 'FAILED') {
        return r.attendance === 'PRESENT' && r.marksObtained !== '' && Number(r.marksObtained) < passingMarks;
      }
      return true;
    });
  }, [resultsData, activeFilter, passingMarks]);

  const isLocked = exam.status === 'LOCKED';
  const isPublished = exam.status === 'PUBLISHED';
  const canEdit = !isLocked && (!isPublished || currentUser?.role === 'ADMIN');

  return (
    <div className="space-y-4">
      {/* Top Filter & Subject Switcher Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Division</label>
            <select
              value={selectedDivision}
              onChange={e => onDivisionChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">Select Division</option>
              {(exam.divisions?.length ? exam.divisions : ['A', 'B', 'C', 'D']).map((d: string) => (
                <option key={d} value={d}>Division {d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={e => onSubjectChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="">All Subjects</option>
              {exam.subjects?.map((s: any) => {
                const subId = s.subjectId?._id || s.subjectId;
                const subName = s.subjectId?.subjectName || 'Subject';
                return <option key={subId} value={subId}>{subName} (Max: {s.maxMarks})</option>;
              })}
            </select>
          </div>

          {selectedSubject && (
            <div className="flex items-center gap-2 pt-4">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Max Marks: {maxMarks}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Passing: {passingMarks}
              </span>
            </div>
          )}
        </div>

        {/* Save Status & Actions */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-xs font-bold">
            {saveStatus === 'SAVING' ? (
              <span className="text-amber-600 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</span>
            ) : saveStatus === 'SAVED' ? (
              <span className="text-emerald-600 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved</span>
            ) : saveStatus === 'DIRTY' ? (
              <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Unsaved edits</span>
            ) : null}
          </div>

          {canEdit && selectedSubjectId && (
            <button
              onClick={() => performSave()}
              disabled={saving || !selectedSubjectId || !selectedDivision}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          )}

          {canEdit && selectedSubject?.entryStatus !== 'SUBMITTED' && selectedSubjectId && (
            <button
              onClick={handleSubmitSubject}
              disabled={submittingSubject || !selectedSubjectId || !selectedDivision || metrics.missing > 0}
              title={metrics.missing > 0 ? 'Fill all missing marks before submitting' : 'Submit subject'}
              className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Submit Subject
            </button>
          )}
        </div>
      </div>

      {/* Progress & Quick Filter Chips */}
      {selectedSubjectId && selectedDivision && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Filter:</span>
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${activeFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setActiveFilter('MISSING')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${activeFilter === 'MISSING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
            >
              Missing ({metrics.missing})
            </button>
            <button
              onClick={() => setActiveFilter('ABSENT')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${activeFilter === 'ABSENT' ? 'bg-rose-500 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
            >
              Absent ({metrics.absent})
            </button>
            <button
              onClick={() => setActiveFilter('FAILED')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${activeFilter === 'FAILED' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
            >
              Below Passing ({metrics.failed})
            </button>
          </div>

          <div className="text-slate-500 font-semibold flex items-center gap-3">
            <span>Filled: <strong className="text-slate-800">{metrics.filled}</strong> / {metrics.total}</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">
              {metrics.total > 0 ? Math.round((metrics.filled / metrics.total) * 100) : 0}% Complete
            </span>
          </div>
        </div>
      )}

      {/* Spreadsheet Marks Table / All Subjects Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {!selectedDivision ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <Filter className="w-12 h-12 text-slate-200" />
            <p className="font-bold text-sm text-slate-600">Select Division</p>
            <p className="text-xs text-slate-400">Choose a division to load student subjects</p>
          </div>
        ) : !selectedSubjectId ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">All Subjects · Std {exam.standard}-{selectedDivision}</h4>
                <p className="text-xs text-slate-400">Select a subject below to enter or edit marks in spreadsheet view</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(exam.subjects || []).map((s: any) => {
                const subId = s.subjectId?._id || s.subjectId;
                const subName = s.subjectId?.subjectName || 'Subject';
                const subCode = s.subjectId?.subjectCode || '';
                const isSubmitted = s.entryStatus === 'SUBMITTED';

                return (
                  <div
                    key={subId}
                    onClick={() => onSubjectChange(subId)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all bg-white flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h5 className="font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {subName}
                        </h5>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {s.entryStatus || 'PENDING'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        {subCode && <div>Code: <strong>{subCode}</strong></div>}
                        <div>Max Marks: <strong className="text-slate-800">{s.maxMarks}</strong> · Pass: <strong className="text-slate-800">{s.passingMarks}</strong></div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between text-xs font-bold text-indigo-600">
                      <span>Enter Marks</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-bold text-slate-500">Loading student marks grid...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 text-slate-200" />
            <p className="font-bold text-sm text-slate-600">No students match current filter</p>
            <p className="text-xs text-slate-400">Try switching to 'All' or verify student admission/migration records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Roll</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 w-28 text-center">Absent?</th>
                  <th className="py-3 px-4 w-44 text-center">Marks (Max: {maxMarks})</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((row, idx) => {
                  const isAbsent = row.attendance === 'ABSENT';
                  const marksNum = row.marksObtained !== '' ? Number(row.marksObtained) : null;
                  const isExceeded = marksNum != null && marksNum > maxMarks;
                  const isNegative = marksNum != null && marksNum < 0;
                  const isFail = marksNum != null && marksNum < passingMarks && !isAbsent;
                  const isMissing = !isAbsent && (row.marksObtained === '' || row.marksObtained == null);

                  return (
                    <tr
                      key={row.studentId}
                      className={`transition-colors ${
                        isMissing
                          ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-400'
                          : isAbsent
                          ? 'bg-slate-50/60 hover:bg-slate-50'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {row.rollNo ?? '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-bold text-sm ${isAbsent ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {row.studentName}
                        </div>
                      </td>

                      {/* Absent Toggle */}
                      <td className="py-3 px-4 text-center">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAbsent}
                            disabled={!canEdit}
                            onChange={e => handleToggleAbsent(row.studentId, e.target.checked)}
                            className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                          />
                          <span className={`text-[11px] font-bold ${isAbsent ? 'text-rose-600' : 'text-slate-400'}`}>
                            Absent
                          </span>
                        </label>
                      </td>

                      {/* Marks / Grade Input */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center">
                          {isGrades ? (
                            <input
                              type="text"
                              disabled={!canEdit || isAbsent}
                              value={row.gradeObtained}
                              onChange={e => handleFieldChange(row.studentId, 'gradeObtained', e.target.value.toUpperCase())}
                              placeholder={isAbsent ? 'ABS' : 'A+'}
                              className={`w-28 py-1.5 px-3 rounded-xl text-center font-black text-sm uppercase outline-none border transition-all ${
                                isAbsent
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800'
                              }`}
                            />
                          ) : (
                            <div className="relative w-28">
                              <input
                                ref={el => { inputsRef.current[row.studentId] = el; }}
                                type="number"
                                disabled={!canEdit || isAbsent}
                                value={row.marksObtained}
                                onKeyDown={e => handleKeyDown(e, idx)}
                                onChange={e => handleFieldChange(row.studentId, 'marksObtained', e.target.value)}
                                placeholder={isAbsent ? 'ABS' : '0'}
                                className={`w-full py-1.5 px-3 rounded-xl text-center font-black text-sm outline-none border transition-all ${
                                  isAbsent
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : isExceeded || isNegative
                                    ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-200'
                                    : isFail
                                    ? 'bg-purple-50/60 border-purple-300 text-purple-700'
                                    : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800'
                                }`}
                              />
                              {(isExceeded || isNegative) && (
                                <div className="text-[10px] text-rose-600 font-bold text-center mt-0.5 flex items-center justify-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Max {maxMarks}
                                </div>
                              )}
                              {isFail && !isExceeded && !isNegative && (
                                <div className="text-[9px] text-purple-600 font-extrabold text-center mt-0.5">
                                  Fail (&lt; {passingMarks})
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={row.remarks}
                          onChange={e => handleFieldChange(row.studentId, 'remarks', e.target.value)}
                          placeholder="Optional remarks..."
                          className="w-full bg-transparent hover:bg-slate-50 focus:bg-white border-b border-transparent hover:border-slate-200 focus:border-indigo-500 px-2 py-1 text-xs outline-none transition-all text-slate-700"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
