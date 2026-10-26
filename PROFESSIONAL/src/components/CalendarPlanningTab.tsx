import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import type { CalendarEventData } from '../store';
import {
  Calendar,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Info,
  Loader2,
  CheckCircle,
} from './icons';

interface CalendarPlanningTabProps {
  initialYearId?: string;
}

export const CalendarPlanningTab: React.FC<CalendarPlanningTabProps> = ({ initialYearId }) => {
  const {
    academicYears,
    calendarEvents,
    fetchCalendarEvents,
    fetchCalendarSuggestions,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    bulkApplyCalendarEvents,
  } = useApp();

  // Active or selected batch
  const activeYear = academicYears.find((y) => y.isActive) || academicYears[0];
  const [selectedAYId, setSelectedAYId] = useState<string>(
    initialYearId || activeYear?._id || ''
  );

  useEffect(() => {
    if (!selectedAYId && activeYear?._id) {
      setSelectedAYId(activeYear._id);
    }
  }, [activeYear, selectedAYId]);

  const selectedAY = academicYears.find((y) => y._id === selectedAYId) || activeYear;

  // Local events state
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Load events when selected batch changes
  useEffect(() => {
    if (selectedAYId) {
      setLoading(true);
      fetchCalendarEvents({ academicYearId: selectedAYId }).finally(() => setLoading(false));
    }
  }, [selectedAYId]);

  // Filtered list for current batch
  const batchEvents = useMemo(() => {
    return calendarEvents
      .filter((ev) => ev.academicYearId === selectedAYId || ev.academicYear === selectedAY?.name)
      .filter((ev) => {
        if (filterType !== 'ALL' && ev.type !== filterType) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return ev.title.toLowerCase().includes(q) || (ev.description || '').toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [calendarEvents, selectedAYId, selectedAY, filterType, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const list = calendarEvents.filter(
      (ev) => ev.academicYearId === selectedAYId || ev.academicYear === selectedAY?.name
    );
    const holidays = list.filter((e) => e.type === 'HOLIDAY');
    const vacations = list.filter((e) => e.type === 'VACATION');
    const exams = list.filter((e) => e.type === 'EXAM');
    const events = list.filter((e) => e.type === 'EVENT' || e.type === 'ACADEMIC_MILESTONE' || e.type === 'PTM');

    // Total days of school closure
    let totalClosedDays = 0;
    list
      .filter((e) => e.isSchoolClosed)
      .forEach((e) => {
        const start = new Date(e.startDate);
        const end = new Date(e.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        totalClosedDays += diffDays;
      });

    return {
      holidaysCount: holidays.length,
      vacationsCount: vacations.length,
      examsCount: exams.length,
      eventsCount: events.length,
      totalClosedDays,
    };
  }, [calendarEvents, selectedAYId, selectedAY]);

  // ── Suggestions Wizard Modal State ──
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStateCode, setWizardStateCode] = useState('ALL');
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestionIdxs, setSelectedSuggestionIdxs] = useState<Record<number, boolean>>({});
  const [clearPresets, setClearPresets] = useState(true);
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [wizardCategoryFilter, setWizardCategoryFilter] = useState<string>('ALL');

  // Launch wizard
  const handleOpenWizard = async () => {
    if (!selectedAY) return;
    setShowWizard(true);
    await loadSuggestions(wizardStateCode);
  };

  const loadSuggestions = async (stateCode: string) => {
    if (!selectedAY) return;
    setFetchingSuggestions(true);
    const res = await fetchCalendarSuggestions(selectedAY.name, selectedAY._id, stateCode);
    setSuggestions(res);
    // Select all by default
    const map: Record<number, boolean> = {};
    res.forEach((_, idx) => {
      map[idx] = true;
    });
    setSelectedSuggestionIdxs(map);
    setFetchingSuggestions(false);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const map: Record<number, boolean> = {};
    if (checked) {
      filteredSuggestions.forEach(({ originalIdx }) => {
        map[originalIdx] = true;
      });
    }
    setSelectedSuggestionIdxs((prev) => ({ ...prev, ...map }));
  };

  const filteredSuggestions = useMemo(() => {
    return suggestions
      .map((item, originalIdx) => ({ item, originalIdx }))
      .filter(({ item }) => {
        if (wizardCategoryFilter === 'ALL') return true;
        if (wizardCategoryFilter === 'HOLIDAYS') return item.type === 'HOLIDAY';
        if (wizardCategoryFilter === 'VACATIONS') return item.type === 'VACATION';
        if (wizardCategoryFilter === 'MILESTONES')
          return item.type === 'EXAM' || item.type === 'ACADEMIC_MILESTONE' || item.type === 'PTM';
        return true;
      });
  }, [suggestions, wizardCategoryFilter]);

  const selectedCount = useMemo(() => {
    return Object.values(selectedSuggestionIdxs).filter(Boolean).length;
  }, [selectedSuggestionIdxs]);

  const handleApplySuggestions = async () => {
    if (!selectedAY) return;
    const toApply = suggestions.filter((_, idx) => selectedSuggestionIdxs[idx]);
    if (toApply.length === 0) {
      alert('Please select at least one holiday or event to apply.');
      return;
    }

    setApplyingBulk(true);
    const res = await bulkApplyCalendarEvents(
      selectedAY._id,
      selectedAY.name,
      toApply,
      clearPresets
    );
    setApplyingBulk(false);

    if (res.success) {
      setShowWizard(false);
      fetchCalendarEvents({ academicYearId: selectedAY._id });
    } else {
      alert(`Failed to apply suggestions: ${res.error || 'Unknown error'}`);
    }
  };

  // ── Custom Event Modal State ──
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventData | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    type: 'HOLIDAY',
    category: 'SCHOOL_HOLIDAY',
    startDate: '',
    endDate: '',
    isSchoolClosed: true,
    color: '#10B981',
    isRoadmapMilestone: false,
    quarter: 'NONE',
    term: 'NONE',
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingEvent(null);
    const today = new Date().toISOString().split('T')[0];
    setEventForm({
      title: '',
      description: '',
      type: 'HOLIDAY',
      category: 'SCHOOL_HOLIDAY',
      startDate: today,
      endDate: today,
      isSchoolClosed: true,
      color: '#10B981',
      isRoadmapMilestone: false,
      quarter: 'NONE',
      term: 'NONE',
    });
    setFormError('');
    setShowEventModal(true);
  };

  const openEditModal = (ev: CalendarEventData) => {
    setEditingEvent(ev);
    const sDate = ev.startDate ? new Date(ev.startDate).toISOString().split('T')[0] : '';
    const eDate = ev.endDate ? new Date(ev.endDate).toISOString().split('T')[0] : '';
    setEventForm({
      title: ev.title,
      description: ev.description || '',
      type: ev.type,
      category: ev.category,
      startDate: sDate,
      endDate: eDate,
      isSchoolClosed: ev.isSchoolClosed,
      color: ev.color || '#10B981',
      isRoadmapMilestone: ev.roadmap?.isRoadmapMilestone || false,
      quarter: ev.roadmap?.quarter || 'NONE',
      term: ev.roadmap?.term || 'NONE',
    });
    setFormError('');
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.startDate || !eventForm.endDate) {
      setFormError('Title, start date, and end date are required.');
      return;
    }
    if (new Date(eventForm.startDate) > new Date(eventForm.endDate)) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    setSavingEvent(true);
    setFormError('');

    const payload: Partial<CalendarEventData> = {
      academicYearId: selectedAY._id,
      academicYear: selectedAY.name,
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      type: eventForm.type as any,
      category: eventForm.category,
      startDate: eventForm.startDate,
      endDate: eventForm.endDate,
      isSchoolClosed: eventForm.isSchoolClosed,
      color: eventForm.color,
      roadmap: {
        isRoadmapMilestone: eventForm.isRoadmapMilestone,
        quarter: eventForm.quarter as any,
        term: eventForm.term as any,
      },
    };

    let ok = false;
    if (editingEvent && editingEvent._id) {
      ok = await updateCalendarEvent(editingEvent._id, payload);
    } else {
      ok = await createCalendarEvent(payload);
    }

    setSavingEvent(false);
    if (ok) {
      setShowEventModal(false);
      fetchCalendarEvents({ academicYearId: selectedAY._id });
    } else {
      setFormError('Failed to save event. Please check inputs.');
    }
  };

  const handleDeleteEvent = async (ev: CalendarEventData) => {
    if (!ev._id) return;
    if (window.confirm(`Are you sure you want to remove "${ev.title}"?`)) {
      const ok = await deleteCalendarEvent(ev._id);
      if (ok) {
        fetchCalendarEvents({ academicYearId: selectedAY._id });
      }
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'HOLIDAY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VACATION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EXAM':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PTM':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ACADEMIC_MILESTONE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'EVENT':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Batch Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              School Calendar & Planning
              {selectedAY?.isActive && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active Session
                </span>
              )}
            </h3>
            <p className="text-xs font-semibold text-slate-400">
              Configure holidays, festivals, vacations, and roadmap milestones for any session batch
            </p>
          </div>
        </div>

        {/* Academic Session Switcher */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Session Batch:</label>
          <select
            className="border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none transition-all shadow-sm"
            value={selectedAYId}
            onChange={(e) => setSelectedAYId(e.target.value)}
          >
            {academicYears.map((ay) => (
              <option key={ay._id} value={ay._id}>
                {ay.name} {ay.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>

          {/* Wizard Launcher Button */}
          <button
            onClick={handleOpenWizard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-sm">✨</span> Auto-Suggest Planner
          </button>

          {/* Add Custom Event */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Holidays</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600">{stats.holidaysCount}</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Declared
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vacation Blocks</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-600">{stats.vacationsCount}</span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Breaks</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Exams</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-600">{stats.examsCount}</span>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">Evaluations</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Events & PTMs</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-indigo-600">{stats.eventsCount}</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">Activities</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Closed Days</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{stats.totalClosedDays}</span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Total Days</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'HOLIDAY', 'VACATION', 'EXAM', 'EVENT', 'ACADEMIC_MILESTONE', 'PTM'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filterType === t
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL' ? 'All Items' : t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search holiday or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-teal-500"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-teal-600 mb-2" />
            <span className="text-xs font-bold">Loading session calendar...</span>
          </div>
        ) : batchEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
              <Calendar className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">No Holidays or Events Configured</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
              No calendar entries found for batch &quot;{selectedAY?.name}&quot;. Click the Auto-Suggest Planner to
              dynamically fetch national holidays, Diwali, Eid, and vacation breaks for this year.
            </p>
            <button
              onClick={handleOpenWizard}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md transition-all"
            >
              <span className="text-sm">✨</span> Launch Auto-Suggest Planner
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Title & Description</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">School Closed</th>
                  <th className="py-3.5 px-4 text-center">Roadmap</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {batchEvents.map((ev) => {
                  const s = new Date(ev.startDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const e = new Date(ev.endDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const isSingleDay = ev.startDate.split('T')[0] === ev.endDate.split('T')[0];

                  return (
                    <tr key={ev._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{s}</span>
                        {!isSingleDay && (
                          <span className="block text-[11px] text-slate-400 font-normal">to {e}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-bold text-slate-900 block truncate">{ev.title}</span>
                        {ev.description && (
                          <span className="text-[11px] text-slate-400 block truncate">{ev.description}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${getBadgeColor(
                            ev.type
                          )}`}
                        >
                          {ev.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-600 font-medium">
                          {ev.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ev.isSchoolClosed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ev.roadmap?.isRoadmapMilestone ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {ev.roadmap.quarter !== 'NONE' ? ev.roadmap.quarter : 'Yes'}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(ev)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Auto-Suggest Planner Wizard Modal ── */}
      {showWizard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowWizard(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-300">
                  Universal Smart Suggestions Engine
                </span>
                <h3 className="font-black text-xl tracking-tight mt-0.5 flex items-center gap-2">
                  <span>✨</span> Auto-Suggest Holidays & Milestones for {selectedAY?.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Dynamically calculated from Google Calendar & astronomical festival rules (Diwali, Eid, Holi, etc.)
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
              {/* State Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Region / State:</span>
                <select
                  value={wizardStateCode}
                  onChange={(e) => {
                    setWizardStateCode(e.target.value);
                    loadSuggestions(e.target.value);
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-teal-500 shadow-sm"
                >
                  <option value="ALL">All-India (National & Major)</option>
                  <option value="DL">Delhi (NCT)</option>
                  <option value="MH">Maharashtra</option>
                  <option value="UP">Uttar Pradesh</option>
                  <option value="BR">Bihar</option>
                  <option value="KA">Karnataka</option>
                  <option value="TN">Tamil Nadu</option>
                  <option value="WB">West Bengal</option>
                  <option value="GJ">Gujarat</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'HOLIDAYS', label: 'Festivals & Holidays' },
                  { id: 'VACATIONS', label: 'Vacations' },
                  { id: 'MILESTONES', label: 'Exams & Roadmap' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setWizardCategoryFilter(c.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      wizardCategoryFilter === c.id
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestions Checklist Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {fetchingSuggestions ? (
                <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
                  <span className="text-xs font-bold">Querying Google Calendar and calculating astronomical dates...</span>
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <div className="text-center p-12 text-slate-400 text-xs font-semibold">
                  No suggestions matching filter.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10">
                          <input
                            type="checkbox"
                            checked={
                              filteredSuggestions.length > 0 &&
                              filteredSuggestions.every(({ originalIdx }) => selectedSuggestionIdxs[originalIdx])
                            }
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Dates</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSuggestions.map(({ item, originalIdx }) => {
                        const isChecked = !!selectedSuggestionIdxs[originalIdx];
                        return (
                          <tr
                            key={originalIdx}
                            className={`transition-colors cursor-pointer ${
                              isChecked ? 'bg-teal-50/30' : 'hover:bg-slate-50'
                            }`}
                            onClick={() =>
                              setSelectedSuggestionIdxs((prev) => ({
                                ...prev,
                                [originalIdx]: !prev[originalIdx],
                              }))
                            }
                          >
                            <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  setSelectedSuggestionIdxs((prev) => ({
                                    ...prev,
                                    [originalIdx]: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              <span>{item.title}</span>
                              {item.description && (
                                <span className="block text-[10px] text-slate-400 font-normal truncate max-w-sm">
                                  {item.description}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-semibold whitespace-nowrap">
                              {item.startDate === item.endDate
                                ? item.startDate
                                : `${item.startDate} to ${item.endDate}`}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getBadgeColor(
                                  item.type
                                )}`}
                              >
                                {item.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase">
                              {item.source === 'GOOGLE_CALENDAR'
                                ? 'Google Cal'
                                : item.source === 'ASTRONOMICAL_ENGINE'
                                ? 'Astronomical'
                                : 'Academic'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearPresets}
                  onChange={(e) => setClearPresets(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <span className="text-xs font-semibold text-slate-600">
                  Replace previously auto-suggested events for this batch
                </span>
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowWizard(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySuggestions}
                  disabled={applyingBulk || selectedCount === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {applyingBulk ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Applying...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Apply ({selectedCount}) Events to {selectedAY?.name}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Event Modal ── */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-900 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                  {editingEvent ? 'Modify Entry' : 'New Calendar Entry'}
                </span>
                <h3 className="font-extrabold text-base tracking-tight mt-0.5">
                  {editingEvent ? 'Edit Holiday / Event' : `Add to Session: ${selectedAY?.name}`}
                </h3>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual Sports Meet / Diwali Vacation"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Event Type
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="HOLIDAY">Holiday</option>
                    <option value="VACATION">Vacation Break</option>
                    <option value="EXAM">Examination</option>
                    <option value="EVENT">School Event</option>
                    <option value="ACADEMIC_MILESTONE">Academic Milestone</option>
                    <option value="PTM">Parent-Teacher Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Category
                  </label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="SCHOOL_HOLIDAY">School Holiday</option>
                    <option value="FESTIVAL">Religious Festival</option>
                    <option value="NATIONAL_HOLIDAY">National Holiday</option>
                    <option value="VACATION">Vacation</option>
                    <option value="SPORTS">Sports</option>
                    <option value="CULTURAL">Cultural</option>
                    <option value="ACADEMIC_EXAM">Academic / Exam</option>
                    <option value="PTM">PTM</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes for students, staff, or parents..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={eventForm.isSchoolClosed}
                    onChange={(e) => setEventForm({ ...eventForm, isSchoolClosed: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-700">School Closed (Disables Attendance)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={eventForm.isRoadmapMilestone}
                    onChange={(e) => setEventForm({ ...eventForm, isRoadmapMilestone: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Display on Roadmap</span>
                </label>
              </div>

              {eventForm.isRoadmapMilestone && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Quarter
                    </label>
                    <select
                      value={eventForm.quarter}
                      onChange={(e) => setEventForm({ ...eventForm, quarter: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700"
                    >
                      <option value="NONE">Auto (By Date)</option>
                      <option value="Q1">Q1 (Apr - Jun)</option>
                      <option value="Q2">Q2 (Jul - Sep)</option>
                      <option value="Q3">Q3 (Oct - Dec)</option>
                      <option value="Q4">Q4 (Jan - Mar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Term
                    </label>
                    <select
                      value={eventForm.term}
                      onChange={(e) => setEventForm({ ...eventForm, term: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700"
                    >
                      <option value="NONE">None</option>
                      <option value="TERM_1">Term 1</option>
                      <option value="TERM_2">Term 2</option>
                      <option value="ANNUAL">Annual</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={savingEvent}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all"
              >
                {savingEvent ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPlanningTab;
