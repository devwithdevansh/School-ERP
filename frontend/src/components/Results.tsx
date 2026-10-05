import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { ClipboardList, Plus, Edit3, Save, Trash2 } from './icons';
import { getActiveStandards } from '../utils/standardUtils';

export const Results: React.FC = () => {
  const { 
    academicYears, 
    curriculums,
    currentUser,
    authFetch,
    feeStructures
  } = useApp();

  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);


  // Filters for Exams List
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('English');

  // Exam Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExam, setNewExam] = useState({
    standard: '',
    divisions: [] as string[],
    medium: 'English',
    examName: '',
    subjects: [] as { subjectId: string, examDate: string, maxMarks: number, passingMarks: number, gradingSystem: string }[]
  });

  const activeStandardsFilter = React.useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, selectedMedium);
  }, [feeStructures, activeYear?.name, selectedMedium]);

  const activeStandardsModal = React.useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, newExam.medium);
  }, [feeStructures, activeYear?.name, newExam.medium]);

  // Results Entry State
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [resultsDivision, setResultsDivision] = useState('');
  const [resultsSubject, setResultsSubject] = useState('');
  const [resultsData, setResultsData] = useState<any[]>([]); // holds the students and their marks

  const fetchExams = async () => {
    if (!activeYear) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStandard) params.append('standard', selectedStandard);
      if (selectedMedium) params.append('medium', selectedMedium);

      const res = await authFetch(`/api/v1/erp/exams?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExams(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [selectedStandard, selectedMedium, activeYear]);

  // Derived subjects for the create form based on selected standard/medium
  const formSubjects = React.useMemo(() => {
    if (!activeYear || !newExam.standard || !newExam.medium) return [];
    const curr = curriculums.find(c => 
      c.academicYearId === activeYear._id && 
      c.standard === newExam.standard && 
      c.medium === newExam.medium
    );
    return curr?.subjects || [];
  }, [activeYear, curriculums, newExam.standard, newExam.medium]);

  const handleCreateExam = async () => {
    if (!newExam.standard || !newExam.examName || newExam.subjects.length === 0) {
      alert('Please fill required fields and add at least one subject.');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/erp/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExam)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create exam');
      }
      setShowCreateModal(false);
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };



  const { students } = useApp();
  
  // Merge students with fetched results
  useEffect(() => {
    const loadAndMerge = async () => {
      if (!activeExamId || !resultsSubject || !resultsDivision) {
        setResultsData([]);
        return;
      }
      
      const activeExam = exams.find(e => e._id === activeExamId);
      if (!activeExam) return;

      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/erp/exams/${activeExamId}/results?subjectId=${resultsSubject}&division=${resultsDivision}`);
        let fetchedResults: any[] = [];
        if (res.ok) {
          const json = await res.json();
          fetchedResults = json.data || [];
        } else {
           const err = await res.json();
           if(res.status === 403) {
             throw new Error(err.message || 'Unauthorized');
           }
        }

        // Get all students for this class from store
        const classStudents = students.filter(s => 
          s.standard === activeExam.standard &&
          s.division === resultsDivision &&
          s.medium === activeExam.medium &&
          s.isActive !== false &&
          s.isMigrated === true
        ).sort((a, b) => a.studentName.localeCompare(b.studentName));

        const merged = classStudents.map(student => {
          const existing = fetchedResults.find(r => r.studentId?._id === student._id || r.studentId?._id === student.id);
          return {
            studentId: student._id || student.id,
            studentName: student.studentName,
            rollNo: (student as any).rollNo,
            marksObtained: existing?.marksObtained || '',
            gradeObtained: existing?.gradeObtained || '',
            remarks: existing?.remarks || ''
          };
        });

        setResultsData(merged);
      } catch (err: any) {
        alert(err.message);
        setResultsData([]); // Clear on error (e.g. 403 Forbidden)
      } finally {
        setLoading(false);
      }
    };

    loadAndMerge();
  }, [activeExamId, resultsSubject, resultsDivision]);

  const handleSaveResults = async () => {
    if (!activeExamId || !resultsSubject || !resultsDivision) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/erp/exams/${activeExamId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: resultsSubject,
          division: resultsDivision,
          results: resultsData.map(r => ({
            ...r,
            marksObtained: r.marksObtained === '' ? null : Number(r.marksObtained),
            gradeObtained: r.gradeObtained === '' ? null : r.gradeObtained
          }))
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save results');
      }
      alert('Results saved successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResultChange = (studentId: string, field: string, value: string | number) => {
    setResultsData(prev => prev.map(r => 
      r.studentId === studentId ? { ...r, [field]: value } : r
    ));
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto bg-slate-50/50 min-h-[calc(100vh-2rem)] animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-indigo-500" />
            Examinations & Results
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Manage exam schedules and enter student marks</p>
        </div>
        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Create Exam
          </button>
        )}
      </div>

      {/* Main Layout: Split into Exam List (Left) and Results Entry (Right) */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: Exams List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col gap-3">
            <h3 className="font-bold text-slate-800 text-sm">Filter Exams</h3>
            <div className="flex gap-2">
              <select 
                value={selectedStandard} 
                onChange={e => setSelectedStandard(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Stds</option>
                {activeStandardsFilter.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select 
                value={selectedMedium} 
                onChange={e => setSelectedMedium(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="English">English</option>
                <option value="Gujarati">Gujarati</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
            {loading && !activeExamId ? (
               <div className="text-center py-4 text-slate-400 font-medium text-sm">Loading exams...</div>
            ) : exams.length === 0 ? (
               <div className="text-center py-10 bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-slate-500 font-medium text-sm">
                 No exams found.
               </div>
            ) : exams.map(exam => (
              <div 
                key={exam._id} 
                onClick={() => { setActiveExamId(exam._id); setResultsSubject(''); setResultsDivision(''); setResultsData([]); }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${activeExamId === exam._id ? 'bg-indigo-50 border-indigo-300 shadow-md' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-bold ${activeExamId === exam._id ? 'text-indigo-900' : 'text-slate-800'}`}>{exam.examName}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${exam.type === 'MARKS' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {exam.type}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mb-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Std {exam.standard}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{exam.medium}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {exam.subjects.length} Subjects
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Results Entry */}
        <div className="w-full lg:w-2/3">
          {activeExamId ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col h-full min-h-[600px]">
              {/* Results Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Enter Results</h3>
                  <p className="text-xs text-slate-500">Select Division & Subject to fetch students</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={resultsDivision}
                    onChange={e => setResultsDivision(e.target.value)}
                    className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  >
                    <option value="">Division</option>
                    {(exams.find(e => e._id === activeExamId)?.divisions || []).map((d: string) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    value={resultsSubject}
                    onChange={e => setResultsSubject(e.target.value)}
                    className="w-40 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Subject</option>
                    {exams.find(e => e._id === activeExamId)?.subjects.map((s: any) => (
                      <option key={s.subjectId?._id} value={s.subjectId?._id}>{s.subjectId?.subjectName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results Grid */}
              <div className="flex-1 overflow-auto p-5">
                {!resultsSubject || !resultsDivision ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <Edit3 className="w-12 h-12 text-slate-200" />
                    <p className="font-medium text-sm">Select a Division and Subject to begin</p>
                  </div>
                ) : loading ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Loading students...</div>
                ) : resultsData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 text-center max-w-sm mx-auto">
                    <p className="font-medium text-sm">No students to show for Std {exams.find(e => e._id === activeExamId)?.standard}-{resultsDivision}.</p>
                    <p className="text-xs text-slate-400">This can mean there are no active students in this division yet, or none have been migrated into the ERP module (Students → Migrate). If you expected students here and are not an admin, you may not have subject-teacher access to this class.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">Roll</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">
                          {exams.find(e => e._id === activeExamId)?.type === 'MARKS' ? 'Marks' : 'Grade'}
                        </th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultsData.map((record) => (
                        <tr key={record.studentId} className="hover:bg-slate-50/50">
                          <td className="py-2 px-4 text-sm font-bold text-slate-400">{record.rollNo || '-'}</td>
                          <td className="py-2 px-4">
                            <div className="text-sm font-bold text-slate-800">{record.studentName}</div>
                          </td>
                          <td className="py-2 px-4">
                            {exams.find(e => e._id === activeExamId)?.type === 'MARKS' ? (
                              <input 
                                type="number" 
                                value={record.marksObtained} 
                                onChange={e => handleResultChange(record.studentId, 'marksObtained', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm font-bold outline-none focus:border-indigo-500 text-center"
                                placeholder="0"
                              />
                            ) : (
                              <input 
                                type="text" 
                                value={record.gradeObtained} 
                                onChange={e => handleResultChange(record.studentId, 'gradeObtained', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm font-bold outline-none focus:border-indigo-500 text-center uppercase"
                                placeholder="A+"
                              />
                            )}
                          </td>
                          <td className="py-2 px-4">
                            <input 
                              type="text" 
                              value={record.remarks} 
                              onChange={e => handleResultChange(record.studentId, 'remarks', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 px-2 py-1 text-sm outline-none transition-colors"
                              placeholder="Add remark..."
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Results Footer */}
              {resultsData.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end">
                  <button 
                    onClick={handleSaveResults}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Results'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed h-full min-h-[600px] flex flex-col items-center justify-center text-slate-400">
              <ClipboardList className="w-16 h-16 text-slate-200 mb-4" />
              <p className="font-semibold text-lg text-slate-500">Select an Exam</p>
              <p className="text-sm mt-1">Choose an exam from the list to view or enter results</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl z-10 sticky top-0">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Schedule New Exam
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                 <Trash2 className="w-5 h-5 opacity-0 absolute" /> {/* Placeholder for consistent sizing */}
                 <span className="font-bold text-xl leading-none block w-5 text-center">&times;</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Standard</label>
                    <select 
                      value={newExam.standard} 
                      onChange={e => setNewExam({ ...newExam, standard: e.target.value, subjects: [] })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Std</option>
                      {activeStandardsModal.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Medium</label>
                    <select 
                      value={newExam.medium} 
                      onChange={e => setNewExam({ ...newExam, medium: e.target.value, subjects: [] })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="English">English</option>
                      <option value="Gujarati">Gujarati</option>
                    </select>
                 </div>
                 <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Exam Name</label>
                    <input 
                      type="text" 
                      value={newExam.examName} 
                      onChange={e => setNewExam({ ...newExam, examName: e.target.value })}
                      placeholder="e.g. Mid Term Exam 2026"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                 </div>
               </div>

               {/* Subjects Selection */}
               {newExam.standard && (
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-800 text-sm mb-3">Include Subjects in this Exam</h4>
                    <div className="space-y-2">
                      {formSubjects.map((sub: any) => {
                        const isSelected = newExam.subjects.some(s => s.subjectId === sub._id);
                        return (
                          <label key={sub._id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewExam(prev => ({ ...prev, subjects: [...prev.subjects, { subjectId: sub._id, examDate: '', gradingSystem: sub.gradingSystem || 'Marks', maxMarks: 100, passingMarks: 35 }] }));
                                  } else {
                                    setNewExam(prev => ({ ...prev, subjects: prev.subjects.filter(s => s.subjectId !== sub._id) }));
                                  }
                                }}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                              />
                              <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{sub.subjectName}</span>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="date"
                                  value={newExam.subjects.find(s => s.subjectId === sub._id)?.examDate?.split('T')[0] || ''}
                                  onChange={(e) => {
                                    setNewExam(prev => ({
                                      ...prev,
                                      subjects: prev.subjects.map(s => s.subjectId === sub._id ? { ...s, examDate: e.target.value } : s)
                                    }))
                                  }}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
                                />
                                <select
                                  value={newExam.subjects.find(s => s.subjectId === sub._id)?.gradingSystem || 'Marks'}
                                  onChange={(e) => {
                                    setNewExam(prev => ({
                                      ...prev,
                                      subjects: prev.subjects.map(s => s.subjectId === sub._id ? { ...s, gradingSystem: e.target.value } : s)
                                    }))
                                  }}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-bold"
                                >
                                  <option value="Marks">Marks</option>
                                  <option value="Grades">Grades</option>
                                </select>
                                {newExam.subjects.find(s => s.subjectId === sub._id)?.gradingSystem === 'Marks' && (
                                  <>
                                    <input
                                      type="number"
                                      placeholder="Max"
                                      value={newExam.subjects.find(s => s.subjectId === sub._id)?.maxMarks || ''}
                                      onChange={(e) => {
                                        setNewExam(prev => ({
                                          ...prev,
                                          subjects: prev.subjects.map(s => s.subjectId === sub._id ? { ...s, maxMarks: Number(e.target.value) } : s)
                                        }))
                                      }}
                                      className="w-14 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Pass"
                                      value={newExam.subjects.find(s => s.subjectId === sub._id)?.passingMarks || ''}
                                      onChange={(e) => {
                                        setNewExam(prev => ({
                                          ...prev,
                                          subjects: prev.subjects.map(s => s.subjectId === sub._id ? { ...s, passingMarks: Number(e.target.value) } : s)
                                        }))
                                      }}
                                      className="w-14 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
                                    />
                                  </>
                                )}
                              </div>
                            )}
                          </label>
                        )
                      })}
                      {formSubjects.length === 0 && (
                        <div className="text-xs text-slate-500 text-center py-2">No subjects found in curriculum for this Std/Medium.</div>
                      )}
                    </div>
                 </div>
               )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-3 sticky bottom-0">
               <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 font-bold text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
               <button 
                 onClick={handleCreateExam}
                 disabled={saving || newExam.subjects.length === 0}
                 className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm"
               >
                 {saving ? 'Creating...' : 'Create Exam'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
