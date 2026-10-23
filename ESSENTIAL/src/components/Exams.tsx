import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import {
  ClipboardList,
  Plus,
  Search,
  Zap,
  Layers,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from './icons';
import { getActiveStandards } from '../utils/standardUtils';
import { CreateExamModal } from './exams/CreateExamModal';
import { ExamOverviewTab } from './exams/ExamOverviewTab';
import { MarksEntryTab } from './exams/MarksEntryTab';
import { parseExamRoute, updateExamRoute } from '../utils/examRouteUtils';

export const Exams: React.FC = () => {
  const { academicYears, currentUser, authFetch, feeStructures, setScreen } = useApp();

  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];
  const isAdmin = currentUser?.role === 'ADMIN';

  // Permissions
  const canSchedule = isAdmin || currentUser?.permissions?.includes('SCHEDULE_EXAM');
  const canEnterMarks = isAdmin || currentUser?.permissions?.includes('ENTER_MARKS') || currentUser?.role === 'TEACHER';
  const hasAccess = canSchedule || canEnterMarks;

  // Exams State
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left List Filter State (No Subject Filter on Exams List)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'WEEKLY' | 'FINAL'>('ALL');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('English');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'MARKS_ENTRY' | 'READY' | 'PUBLISHED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Exam & Active Tab State (Workspace tabs = Overview + Marks Entry)
  const [activeExamId, setActiveExamId] = useState<string | null>(() => parseExamRoute().examId);
  const [activeTab, setActiveTab] = useState<'overview' | 'marks'>(() => {
    const route = parseExamRoute();
    return route.tab === 'marks' ? 'marks' : 'overview';
  });

  // Marks Entry Selection
  const [marksDivision, setMarksDivision] = useState('');
  const [marksSubjectId, setMarksSubjectId] = useState('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeStandards = useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, selectedMedium);
  }, [feeStructures, activeYear?.name, selectedMedium]);

  // Synchronize URL with active state
  useEffect(() => {
    if (activeExamId) {
      updateExamRoute('exams', activeExamId, activeTab);
    } else {
      updateExamRoute('exams');
    }
  }, [activeExamId, activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseExamRoute();
      if (route.screen === 'exams') {
        if (route.examId) setActiveExamId(route.examId);
        if (route.tab === 'marks' || route.tab === 'overview') {
          setActiveTab(route.tab as any);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchExams = async () => {
    if (!activeYear) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedStandard) params.append('standard', selectedStandard);
      if (selectedMedium) params.append('medium', selectedMedium);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await authFetch(`/api/v1/erp/exams?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setExams(list);

        // Keep active exam selected or select from URL / first
        if (list.length > 0) {
          const route = parseExamRoute();
          const found = route.examId && list.some((e: any) => e._id === route.examId);
          if (found) {
            setActiveExamId(route.examId);
          } else if (!activeExamId || !list.some((e: any) => e._id === activeExamId)) {
            setActiveExamId(list[0]._id);
          }
        } else {
          setActiveExamId(null);
        }
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to load exams');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [selectedStandard, selectedMedium, typeFilter, statusFilter, activeYear]);

  const activeExam = useMemo(() => {
    return exams.find(e => e._id === activeExamId) || null;
  }, [exams, activeExamId]);

  useEffect(() => {
    if (activeExam) {
      const defaultDiv = activeExam.divisions?.[0] || 'A';
      setMarksDivision(defaultDiv);
      // Default to "All Subjects" ("") or first subject if preselected
      setMarksSubjectId('');
    }
  }, [activeExam?._id]);

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return exams;
    const q = searchQuery.toLowerCase();
    return exams.filter(e =>
      e.examName.toLowerCase().includes(q) ||
      e.standard.toLowerCase().includes(q)
    );
  }, [exams, searchQuery]);

  const handleUpdateExam = async (updatedFields: any) => {
    if (!activeExamId) return;
    try {
      const res = await authFetch(`/api/v1/erp/exams/${activeExamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update exam');
      }
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteExam = async (examId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this scheduled exam?')) return;

    try {
      const res = await authFetch(`/api/v1/erp/exams/${examId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete exam');
      }
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Cross-link: READY exam card -> Results Publish tab
  const handleNavigateToPublish = (examId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateExamRoute('results', examId, 'publish');
    setScreen('results');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">Published</span>;
      case 'READY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">Ready</span>;
      case 'MARKS_ENTRY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">Marks Entry</span>;
      case 'LOCKED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">Locked</span>;
      case 'SCHEDULED':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">Scheduled</span>;
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h3 className="font-extrabold text-slate-800 text-lg">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          You do not have permission to view or manage Examinations. Please contact your school administrator to grant <code className="text-indigo-600 font-bold">SCHEDULE_EXAM</code> or <code className="text-indigo-600 font-bold">ENTER_MARKS</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto min-h-[calc(100vh-2rem)] space-y-6">
      
      {/* Header with Create/Schedule Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-indigo-600" />
            Examinations
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Schedule academic tests, manage timetables, and record student marks
          </p>
        </div>

        {canSchedule && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all self-start sm:self-center"
          >
            <Plus className="w-4 h-4" /> Schedule New Exam
          </button>
        )}
      </div>

      {/* Master-Detail Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column: Exams List Panel (Subject Filter Removed) */}
        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
          
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            {/* Type Tabs: All | Weekly | Final */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('WEEKLY')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 ${
                  typeFilter === 'WEEKLY' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-500" /> Weekly
              </button>
              <button
                onClick={() => setTypeFilter('FINAL')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  typeFilter === 'FINAL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Final/Term
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Standard & Medium Dropdowns (Subject filter removed from list) */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedStandard}
                onChange={e => setSelectedStandard(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Standards</option>
                {activeStandards.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                value={selectedMedium}
                onChange={e => setSelectedMedium(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="English">English</option>
                <option value="Gujarati">Gujarati</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="MARKS_ENTRY">Marks Entry</option>
                <option value="READY">Ready to Publish</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>

          {/* Exams List Scrollable Column */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-18rem)] pr-1">
            {loading && exams.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs animate-pulse space-y-2.5">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="bg-white p-5 rounded-2xl border border-rose-100 text-center space-y-2">
                <p className="text-xs font-bold text-rose-600">{error}</p>
                <button
                  onClick={fetchExams}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                >
                  Retry
                </button>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2 shadow-xs">
                <ClipboardList className="w-10 h-10 text-slate-200 mx-auto" />
                <p className="font-bold text-xs text-slate-700">No exams found</p>
                <p className="text-[11px] text-slate-400">Try adjusting filters or schedule a new exam.</p>
              </div>
            ) : (
              filteredExams.map(exam => {
                const isSelected = activeExamId === exam._id;
                const isWeekly = exam.type === 'WEEKLY';
                const isReady = exam.status === 'READY';
                const isPublished = exam.status === 'PUBLISHED';

                return (
                  <div
                    key={exam._id}
                    onClick={() => setActiveExamId(exam._id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-50/90 to-white border-indigo-400 shadow-md shadow-indigo-100/60 ring-1 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className={`font-extrabold text-sm leading-tight ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                        {exam.examName}
                      </h4>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isWeekly ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800">
                            Weekly
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">
                            Final
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 mb-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                        Std {exam.standard}
                      </span>
                      <span>{exam.medium}</span>
                      <span>•</span>
                      <span>{exam.subjects?.length || 0} Subjects</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/70 text-[10px]">
                      {getStatusBadge(exam.status)}

                      {/* Cross-Link: Ready exam -> Go to Publish */}
                      {(isReady || isPublished) ? (
                        <button
                          onClick={e => handleNavigateToPublish(exam._id, e)}
                          title="Open Publish tab in Results module"
                          className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1 transition-all"
                        >
                          Go to Publish <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        isAdmin && (
                          <button
                            onClick={e => handleDeleteExam(exam._id, e)}
                            title="Delete Exam"
                            className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Workspace (Overview + Marks Entry) */}
        <div className="flex-1 w-full min-w-0">
          {activeExam ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[640px] overflow-hidden">
              
              {/* Workspace Header Tabs: Overview + Marks Entry Only */}
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 pt-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-3 px-4 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                      activeTab === 'overview'
                        ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="w-4 h-4" /> Overview
                  </button>

                  <button
                    onClick={() => setActiveTab('marks')}
                    className={`py-3 px-4 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                      activeTab === 'marks'
                        ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" /> Marks Entry
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {/* Cross-Link button inside header */}
                  {(activeExam.status === 'READY' || activeExam.status === 'PUBLISHED') && (
                    <button
                      onClick={e => handleNavigateToPublish(activeExam._id, e)}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      Publish Results <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={fetchExams}
                    title="Refresh Exam"
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Workspace Content */}
              <div className="p-6 flex-1">
                {activeTab === 'overview' && (
                  <ExamOverviewTab
                    exam={activeExam}
                    isAdmin={isAdmin}
                    onUpdateExam={handleUpdateExam}
                    onNavigateToMarksEntry={subId => {
                      if (subId) setMarksSubjectId(subId);
                      setActiveTab('marks');
                    }}
                  />
                )}

                {activeTab === 'marks' && (
                  <MarksEntryTab
                    exam={activeExam}
                    selectedDivision={marksDivision}
                    onDivisionChange={setMarksDivision}
                    selectedSubjectId={marksSubjectId}
                    onSubjectChange={setMarksSubjectId}
                    onRefreshExam={fetchExams}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 border-dashed min-h-[640px] flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <ClipboardList className="w-16 h-16 text-slate-200 mb-2" />
              <h3 className="font-extrabold text-slate-700 text-base">Select an Exam to Begin</h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Choose an examination from the list on the left to review its subject timetable schedule and enter student marks.
              </p>
              {canSchedule && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
                >
                  + Schedule New Exam
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Exam Wizard / Quick Weekly Modal */}
      <CreateExamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onExamCreated={fetchExams}
      />
    </div>
  );
};
