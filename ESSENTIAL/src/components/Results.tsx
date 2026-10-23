import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Printer,
} from './icons';
import { getActiveStandards } from '../utils/standardUtils';
import { PublishTab } from './exams/PublishTab';
import { ResultsAnalyticsTab } from './exams/ResultsAnalyticsTab';
import { ReportCardsTab } from './exams/ReportCardsTab';
import { parseExamRoute, updateExamRoute } from '../utils/examRouteUtils';

export const Results: React.FC = () => {
  const { academicYears, currentUser, authFetch, feeStructures, setScreen } = useApp();

  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];
  const isAdmin = currentUser?.role === 'ADMIN';

  // Permissions for Results Module
  const canGenerateResult = isAdmin || currentUser?.permissions?.includes('GENERATE_RESULT');
  const canViewReports = isAdmin || currentUser?.permissions?.includes('VIEW_SINGLE_REPORT') || currentUser?.role === 'TEACHER';
  const hasAccess = canGenerateResult || canViewReports;

  // Exams State
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left List Filter State: Default to showing READY or PUBLISHED, plus "PENDING" filter for blocked exams
  const [statusFilter, setStatusFilter] = useState<'READY_PUBLISHED' | 'PENDING' | 'ALL'>('READY_PUBLISHED');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('English');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Exam & Active Tab State: Publish + Rankings & Analytics + Report Cards
  const [activeExamId, setActiveExamId] = useState<string | null>(() => parseExamRoute().examId);
  const [activeTab, setActiveTab] = useState<'publish' | 'results' | 'report-cards'>(() => {
    const route = parseExamRoute();
    if (route.tab === 'results' || route.tab === 'report-cards') {
      return route.tab;
    }
    return 'publish';
  });

  const activeStandards = useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, selectedMedium);
  }, [feeStructures, activeYear?.name, selectedMedium]);

  // Synchronize URL with active state
  useEffect(() => {
    if (activeExamId) {
      updateExamRoute('results', activeExamId, activeTab);
    } else {
      updateExamRoute('results');
    }
  }, [activeExamId, activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = parseExamRoute();
      if (route.screen === 'results') {
        if (route.examId) setActiveExamId(route.examId);
        if (route.tab === 'publish' || route.tab === 'results' || route.tab === 'report-cards') {
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

      const res = await authFetch(`/api/v1/erp/exams?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setExams(list);

        // Keep active exam selected or select from URL / first filtered
        if (list.length > 0) {
          const route = parseExamRoute();
          const found = route.examId && list.some((e: any) => e._id === route.examId);
          if (found) {
            setActiveExamId(route.examId);
          } else if (!activeExamId || !list.some((e: any) => e._id === activeExamId)) {
            // Find first exam matching default filter (READY or PUBLISHED)
            const firstReady = list.find((e: any) => e.status === 'READY' || e.status === 'PUBLISHED');
            setActiveExamId(firstReady ? firstReady._id : list[0]._id);
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
  }, [selectedStandard, selectedMedium, activeYear]);

  // Filtered exams according to requirement: READY or PUBLISHED by default, or PENDING for blocked
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      // Status filter
      if (statusFilter === 'READY_PUBLISHED') {
        if (e.status !== 'READY' && e.status !== 'PUBLISHED') return false;
      } else if (statusFilter === 'PENDING') {
        if (e.status === 'READY' || e.status === 'PUBLISHED') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!e.examName.toLowerCase().includes(q) && !e.standard.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [exams, statusFilter, searchQuery]);

  const activeExam = useMemo(() => {
    return exams.find(e => e._id === activeExamId) || null;
  }, [exams, activeExamId]);

  // Teachers with allowTeacherPublish can open Publish for that exam only.
  // Admins and users with GENERATE_RESULT can always open Publish.
  const canPublishThisExam = isAdmin || canGenerateResult || (currentUser?.role === 'TEACHER' && !!activeExam?.allowTeacherPublish);

  useEffect(() => {
    if (activeExam && !canPublishThisExam && activeTab === 'publish') {
      setActiveTab('results');
    }
  }, [activeExam?._id, canPublishThisExam, activeTab]);

  // Cross-link: Blocked exam -> Go to Marks Entry in Exams module
  const handleNavigateToMarksEntry = (examId: string, subjectId?: string) => {
    updateExamRoute('exams', examId, 'marks');
    setScreen('exams');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">Published</span>;
      case 'READY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">Ready</span>;
      case 'MARKS_ENTRY':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">Pending Marks</span>;
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
          You do not have permission to view Results or publish report cards. Please contact your school administrator to grant <code className="text-indigo-600 font-bold">GENERATE_RESULT</code> or <code className="text-indigo-600 font-bold">VIEW_SINGLE_REPORT</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto min-h-[calc(100vh-2rem)] space-y-6">
      
      {/* Header without Create Button (as requested) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Award className="w-8 h-8 text-indigo-600" />
            Academic Results
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Review completed exam readiness, publish results to parents and students, and generate printable report cards
          </p>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column: Results Exam List (Ready & Published by default, plus Pending filter) */}
        <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
          
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            {/* Status Pills Filter: Ready/Published vs Pending Blocked */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setStatusFilter('READY_PUBLISHED')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  statusFilter === 'READY_PUBLISHED' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ready / Live
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  statusFilter === 'PENDING' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Blocked
              </button>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
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

            {/* Standard & Medium Dropdowns */}
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
                <Award className="w-10 h-10 text-slate-200 mx-auto" />
                <p className="font-bold text-xs text-slate-700">No exams in this filter</p>
                <p className="text-[11px] text-slate-400">
                  {statusFilter === 'READY_PUBLISHED'
                    ? 'Check "Pending Blocked" to see in-progress exams.'
                    : 'All exams are complete or no exams match filters.'}
                </p>
              </div>
            ) : (
              filteredExams.map(exam => {
                const isSelected = activeExamId === exam._id;
                const isWeekly = exam.type === 'WEEKLY';
                const isBlocked = exam.status !== 'READY' && exam.status !== 'PUBLISHED';

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
                      <div className="shrink-0">
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

                      {/* Cross-Link: Blocked Exam -> Open Marks Entry */}
                      {isBlocked && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleNavigateToMarksEntry(exam._id);
                          }}
                          title="Open Marks Entry tab in Exams module"
                          className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-amber-800 bg-amber-50 hover:bg-amber-100 flex items-center gap-1 transition-all"
                        >
                          Open Marks Entry <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Workspace (Publish + Rankings & Analytics + Report Cards) */}
        <div className="flex-1 w-full min-w-0">
          {activeExam ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[640px] overflow-hidden">
              
              {/* Workspace Header Tabs: Publish + Rankings & Analytics + Report Cards */}
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 pt-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {canPublishThisExam && (
                    <button
                      onClick={() => setActiveTab('publish')}
                      className={`py-3 px-4 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                        activeTab === 'publish'
                          ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" /> Publish & Readiness
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('results')}
                    className={`py-3 px-4 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                      activeTab === 'results'
                        ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Award className="w-4 h-4" /> Rankings & Analytics
                  </button>

                  <button
                    onClick={() => setActiveTab('report-cards')}
                    className={`py-3 px-4 text-xs font-black rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                      activeTab === 'report-cards'
                        ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Printer className="w-4 h-4" /> Report Cards
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {/* Cross-Link button inside header */}
                  {activeExam.status !== 'READY' && activeExam.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => handleNavigateToMarksEntry(activeExam._id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-extrabold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      Enter Missing Marks <ArrowRight className="w-3.5 h-3.5" />
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
                {activeTab === 'publish' && (
                  canPublishThisExam ? (
                    <PublishTab
                      exam={activeExam}
                      isAdmin={isAdmin}
                      onRefreshExam={fetchExams}
                      onNavigateToMarksEntry={subId => handleNavigateToMarksEntry(activeExam._id, subId)}
                    />
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                      <h4 className="font-bold text-slate-800">Publishing Restricted</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Only administrators or teachers with explicit publishing permission enabled for this exam can access the Publish workspace.
                      </p>
                    </div>
                  )
                )}

                {activeTab === 'results' && (
                  <ResultsAnalyticsTab
                    exam={activeExam}
                  />
                )}

                {activeTab === 'report-cards' && (
                  <ReportCardsTab
                    exam={activeExam}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 border-dashed min-h-[640px] flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <Award className="w-16 h-16 text-slate-200 mb-2" />
              <h3 className="font-extrabold text-slate-700 text-base">Select an Exam to View Results</h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Choose an examination from the list on the left to verify publishing readiness, inspect merit rankings, and print student report cards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
