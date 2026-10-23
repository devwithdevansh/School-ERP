import React, { useState } from 'react';
import { useApp } from '../store';
import { BookOpen, Plus, X, Save, Trash2, Library, BookMarked } from './icons';
import { getActiveStandards } from '../utils/standardUtils';

export const Subjects: React.FC = () => {
  const { subjects, curriculums, academicYears, authFetch, refreshData, feeStructures } = useApp();
  
  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];

  const activeStandards = React.useMemo(() => {
    // English is the default medium state unless changed, but curriculum form uses Capitalized medium, actually "ENGLISH". 
    // We can just use the mapped value from activeStandards.
    return getActiveStandards(feeStructures, activeYear?.name, undefined); 
  }, [feeStructures, activeYear?.name]);
  
  const [activeTab, setActiveTab] = useState<'MASTER' | 'CURRICULUM'>('MASTER');
  
  // Subject Master State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ subjectName: '', subjectCode: '', type: 'Theory', gradingSystem: 'Marks' });
  
  // Curriculum Mapping State
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [curriculumForm, setCurriculumForm] = useState({ standard: '', medium: 'English', subjects: [] as string[] });
  
  const [saving, setSaving] = useState(false);

  // --- Handlers for Subject Master ---
  const handleSaveSubject = async () => {
    if (!subjectForm.subjectName) {
      alert('Subject name is required');
      return;
    }
    
    setSaving(true);
    try {
      const res = await authFetch('/api/v1/academic-master/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save subject');
      }
      await refreshData();
      setShowSubjectModal(false);
      setSubjectForm({ subjectName: '', subjectCode: '', type: 'Theory', gradingSystem: 'Marks' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      const res = await authFetch(`/api/v1/academic-master/subjects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete');
      }
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Handlers for Curriculum ---
  const handleSaveCurriculum = async () => {
    if (!curriculumForm.standard || curriculumForm.subjects.length === 0) {
      alert('Please select standard and at least one subject');
      return;
    }
    
    if (!activeYear) {
      alert('No active academic year found');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/v1/academic-master/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYearId: activeYear._id,
          standard: curriculumForm.standard,
          medium: curriculumForm.medium,
          subjects: curriculumForm.subjects
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save curriculum');
      }
      
      await refreshData();
      setShowCurriculumModal(false);
      setCurriculumForm({ standard: '', medium: 'English', subjects: [] });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-slate-50/50 min-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-500" />
              Curriculum & Subjects
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-2">Manage global subjects and map them to standards for {activeYear?.name}</p>
          </div>
        </div>
        
        {/* Tabs - Premium Segmented Control */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit shadow-inner">
          <button 
            onClick={() => setActiveTab('MASTER')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'MASTER' ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-100' : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
            }`}
          >
            <Library className="w-4 h-4" />
            Subject Master
          </button>
          <button 
            onClick={() => setActiveTab('CURRICULUM')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'CURRICULUM' ? 'bg-white text-indigo-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-100' : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            Curriculum Mapping
          </button>
        </div>

        {/* Tab: Subject Master */}
        {activeTab === 'MASTER' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl">Global Subjects</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Define core subjects for the entire school</p>
              </div>
              <button 
                onClick={() => setShowSubjectModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] w-full md:w-auto justify-center"
              >
                <Plus className="w-5 h-5" /> Add Subject
              </button>
            </div>
            
            <div className="overflow-x-auto p-4 md:p-8 pt-0">
              <table className="w-full text-left border-collapse mt-4">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest w-16">No.</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Subject Name</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Code</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Grading</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <Library className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="font-bold text-lg text-slate-600">No subjects created yet.</p>
                          <p className="text-sm mt-1 font-medium">Create subjects here before mapping them to classes.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    subjects.map((sub, index) => (
                      <tr key={sub._id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-5 text-sm font-bold text-slate-300">{String(index + 1).padStart(2, '0')}</td>
                        <td className="px-6 py-5 font-black text-slate-800 text-lg">{sub.subjectName}</td>
                        <td className="px-6 py-5 font-bold text-slate-500">{sub.subjectCode || '—'}</td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                            {sub.type}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${sub.gradingSystem === 'Grades' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {sub.gradingSystem}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => handleDeleteSubject(sub._id)}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Curriculum Mapping */}
        {activeTab === 'CURRICULUM' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300">
            <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xl">Class Curriculums ({activeYear?.name})</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Map subjects to specific standards</p>
              </div>
              <button 
                onClick={() => {
                  setCurriculumForm({ standard: '', medium: 'English', subjects: [] });
                  setShowCurriculumModal(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] w-full md:w-auto justify-center"
              >
                <Plus className="w-5 h-5" /> Map Subjects
              </button>
            </div>
            
            <div className="overflow-x-auto p-4 md:p-8 pt-0">
              <table className="w-full text-left border-collapse mt-4">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest w-1/4">Standard / Medium</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Mapped Subjects</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {curriculums.filter(c => c.academicYearId === activeYear?._id).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <BookMarked className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="font-bold text-lg text-slate-600">No curriculums mapped yet.</p>
                          <p className="text-sm mt-1 font-medium">Define which subjects are taught in which standard.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    curriculums
                      .filter(c => c.academicYearId === activeYear?._id)
                      .map((curr) => (
                        <tr key={curr._id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-6">
                            <div className="font-black text-slate-800 text-lg">Standard {curr.standard}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{curr.medium} Medium</div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-wrap gap-2.5">
                              {curr.subjects.map((sub: any) => (
                                <span key={sub._id} className="px-3.5 py-1.5 bg-blue-50/50 text-blue-700 rounded-xl text-sm font-bold border border-blue-100 flex items-center gap-1.5 shadow-sm">
                                  <BookOpen className="w-3.5 h-3.5 opacity-50" />
                                  {sub.subjectName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <button 
                              onClick={() => {
                                setCurriculumForm({
                                  standard: curr.standard,
                                  medium: curr.medium,
                                  subjects: curr.subjects.map((s: any) => s._id)
                                });
                                setShowCurriculumModal(true);
                              }}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Edit Mapping
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: Create Subject */}
        {showSubjectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-200">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="font-extrabold text-slate-900 text-xl">Add New Subject</h3>
                <button onClick={() => setShowSubjectModal(false)} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Name</label>
                  <input 
                    type="text" 
                    value={subjectForm.subjectName}
                    onChange={e => setSubjectForm({ ...subjectForm, subjectName: e.target.value.toUpperCase() })}
                    placeholder="E.G. MATHEMATICS"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Code (Optional)</label>
                  <input 
                    type="text" 
                    value={subjectForm.subjectCode}
                    onChange={e => setSubjectForm({ ...subjectForm, subjectCode: e.target.value.toUpperCase() })}
                    placeholder="E.G. MAT"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300 uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Type</label>
                    <select 
                      value={subjectForm.type}
                      onChange={e => setSubjectForm({ ...subjectForm, type: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                    >
                      <option value="Theory">Theory</option>
                      <option value="Practical">Practical</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grading</label>
                    <select 
                      value={subjectForm.gradingSystem}
                      onChange={e => setSubjectForm({ ...subjectForm, gradingSystem: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                    >
                      <option value="Marks">Marks (out of 100)</option>
                      <option value="Grades">Grades (A, B, C)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setShowSubjectModal(false)}
                  className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSubject}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] flex items-center gap-2"
                >
                  {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Map Curriculum */}
        {showCurriculumModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="font-extrabold text-slate-900 text-xl">Map Curriculum</h3>
                <button onClick={() => setShowCurriculumModal(false)} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Standard</label>
                    <select
                      value={curriculumForm.standard}
                      onChange={e => setCurriculumForm({ ...curriculumForm, standard: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors uppercase"
                    >
                      <option value="">SELECT STANDARD...</option>
                      {activeStandards.map(s => (
                        <option key={s} value={s.toUpperCase()}>{s.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Medium</label>
                    <select
                      value={curriculumForm.medium}
                      onChange={e => setCurriculumForm({ ...curriculumForm, medium: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors uppercase"
                    >
                      <option value="ENGLISH">ENGLISH</option>
                      <option value="GUJARATI">GUJARATI</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Select Subjects for this Class</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects.map(sub => (
                      <label key={sub._id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${curriculumForm.subjects.includes(sub._id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}>
                        <div className="pt-0.5">
                          <input 
                            type="checkbox"
                            checked={curriculumForm.subjects.includes(sub._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCurriculumForm({ ...curriculumForm, subjects: [...curriculumForm.subjects, sub._id] });
                              } else {
                                setCurriculumForm({ ...curriculumForm, subjects: curriculumForm.subjects.filter(id => id !== sub._id) });
                              }
                            }}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-extrabold ${curriculumForm.subjects.includes(sub._id) ? 'text-blue-900' : 'text-slate-700'}`}>{sub.subjectName}</div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{sub.type} • {sub.gradingSystem}</div>
                        </div>
                      </label>
                    ))}
                    {subjects.length === 0 && (
                      <div className="col-span-2 text-center py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <Library className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-semibold">No subjects available.</p>
                        <p className="text-xs text-slate-400 mt-1">Please create subjects in the Master tab first.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setShowCurriculumModal(false)}
                  className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCurriculum}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] flex items-center gap-2"
                >
                  {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Mapping</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
