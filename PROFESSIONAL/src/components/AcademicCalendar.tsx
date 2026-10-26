import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import type { CalendarEventData } from '../store';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Info,
  Loader2,
  Share2,
} from './icons';
import { CalendarPlanningTab } from './CalendarPlanningTab';

export const AcademicCalendar: React.FC = () => {
  const {
    academicYears,
    calendarEvents,
    fetchCalendarEvents,
    deleteCalendarEvent,
    fetchAcademicRoadmap,
  } = useApp();

  const activeAY = academicYears.find((y) => y.isActive) || academicYears[0];
  const [selectedAYId, setSelectedAYId] = useState<string>(activeAY?._id || '');

  useEffect(() => {
    if (!selectedAYId && activeAY?._id) {
      setSelectedAYId(activeAY._id);
    }
  }, [activeAY, selectedAYId]);

  const selectedAY = academicYears.find((y) => y._id === selectedAYId) || activeAY;

  // View Mode: 'calendar' | 'agenda' | 'roadmap' | 'setup'
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda' | 'roadmap' | 'setup'>('calendar');

  // Month navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  // Roadmap data
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

  // Selected Day Details Modal
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: Date; events: CalendarEventData[] } | null>(null);

  // Load calendar events
  useEffect(() => {
    if (selectedAYId) {
      setLoading(true);
      fetchCalendarEvents({ academicYearId: selectedAYId }).finally(() => setLoading(false));
    }
  }, [selectedAYId]);

  // Load roadmap when roadmap tab is selected
  useEffect(() => {
    if (viewMode === 'roadmap' && selectedAY) {
      setLoadingRoadmap(true);
      fetchAcademicRoadmap(selectedAY._id, selectedAY.name)
        .then((data) => setRoadmapData(data))
        .finally(() => setLoadingRoadmap(false));
    }
  }, [viewMode, selectedAY]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in current month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Filter events for the session
  const currentSessionEvents = useMemo(() => {
    return calendarEvents.filter(
      (ev) => ev.academicYearId === selectedAYId || ev.academicYear === selectedAY?.name
    );
  }, [calendarEvents, selectedAYId, selectedAY]);

  // Map events to day number in current month
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEventData[]> = {};

    currentSessionEvents.forEach((ev) => {
      const s = new Date(ev.startDate);
      const e = new Date(ev.endDate);

      // Iterate through each day of the month and check if event overlaps
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const d = new Date(year, month, day);
        // Normalize to midnight UTC/local
        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const sTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
        const eTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();

        if (dTime >= sTime && dTime <= eTime) {
          if (!map[day]) map[day] = [];
          map[day].push(ev);
        }
      }
    });

    return map;
  }, [currentSessionEvents, year, month, totalDaysInMonth]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'HOLIDAY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'VACATION':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EXAM':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PTM':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ACADEMIC_MILESTONE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'EVENT':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Academic Calendar & Roadmap</h2>
            {selectedAY?.isActive && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Active Session
              </span>
            )}
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Annual schedule, school holidays, festival breaks, and academic progress milestones
          </p>
        </div>

        {/* Batch Selector & Navigation Mode Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Batch Selector */}
          <select
            className="border border-slate-200 bg-white focus:border-teal-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none transition-all shadow-sm"
            value={selectedAYId}
            onChange={(e) => setSelectedAYId(e.target.value)}
          >
            {academicYears.map((ay) => (
              <option key={ay._id} value={ay._id}>
                Session: {ay.name} {ay.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Month Grid
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Agenda List
            </button>
            <button
              onClick={() => setViewMode('roadmap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'roadmap'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🧭 Annual Roadmap
            </button>
            <button
              onClick={() => setViewMode('setup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'setup'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚙️ Manage & Suggestions
            </button>
          </div>
        </div>
      </div>

      {/* ── View 1: Month Grid View ── */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          {/* Month Controller Bar */}
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {monthNames[month]} {year}
              </h3>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-2xs"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center font-extrabold text-[11px] text-slate-500 uppercase tracking-wider py-2.5">
            {daysOfWeek.map((d, idx) => (
              <div key={d} className={idx === 0 ? 'text-rose-500' : ''}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 text-slate-800">
            {/* Empty slots for previous month offset */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/30 p-2 opacity-30" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dayEvents = eventsByDay[day] || [];
              const todayActive = isToday(day);
              const hasHoliday = dayEvents.some((e) => e.isSchoolClosed);

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => {
                    if (dayEvents.length > 0) {
                      setSelectedDayEvents({
                        date: new Date(year, month, day),
                        events: dayEvents,
                      });
                    }
                  }}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-all group cursor-pointer ${
                    todayActive ? 'bg-teal-50/20' : hasHoliday ? 'bg-emerald-50/20' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black ${
                        todayActive
                          ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30 ring-2 ring-teal-200'
                          : 'text-slate-700 group-hover:text-slate-900'
                      }`}
                    >
                      {day}
                    </span>
                    {hasHoliday && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" title="School Closed" />
                    )}
                  </div>

                  {/* Day Events Chips */}
                  <div className="space-y-1 mt-1.5 flex-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev._id || ev.title}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md truncate border ${getEventBadgeClass(
                          ev.type
                        )} shadow-2xs`}
                        title={`${ev.title} (${ev.type})`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] font-extrabold text-slate-400 pl-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── View 2: Agenda / Chronological List View ── */}
      {viewMode === 'agenda' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">Chronological Academic Agenda</h3>
              <p className="text-xs text-slate-400">All planned holidays, examinations, and events across the session</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
              {currentSessionEvents.length} Total Entries
            </span>
          </div>

          {currentSessionEvents.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs font-bold">
              No calendar entries for this session yet. Switch to &quot;Manage &amp; Suggestions&quot; to auto-populate.
            </div>
          ) : (
            <div className="space-y-3">
              {currentSessionEvents
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .map((ev) => {
                  const s = new Date(ev.startDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const e = new Date(ev.endDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const isSingle = ev.startDate.split('T')[0] === ev.endDate.split('T')[0];

                  return (
                    <div
                      key={ev._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all gap-3"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`px-3 py-2 rounded-xl text-center font-black uppercase text-[10px] border ${getEventBadgeClass(
                            ev.type
                          )} shrink-0`}
                        >
                          {ev.type}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800">{ev.title}</h4>
                          <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                            {isSingle ? s : `${s} — ${e}`}
                          </span>
                          {ev.description && (
                            <p className="text-xs text-slate-500 mt-1 max-w-xl">{ev.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {ev.isSchoolClosed ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            School Closed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600">
                            Regular Day
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── View 3: Annual Academic Roadmap (Quarterly Gantt / Timeline) ── */}
      {viewMode === 'roadmap' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-300">
              Strategic Progression Timeline
            </span>
            <h3 className="text-xl font-black mt-1">Annual Academic Roadmap: {selectedAY?.name}</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Track session kickoff, syllabus evaluations, sports meets, vacations, and final examinations across all 4
              quarters.
            </p>
          </div>

          {loadingRoadmap ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-3" />
              <span className="text-xs font-bold">Assembling quarterly milestone roadmap...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Q1', 'Q2', 'Q3', 'Q4'].map((qKey) => {
                const quarterData = roadmapData?.quarters?.[qKey] || {
                  name: qKey,
                  items: [],
                };
                const items: any[] = quarterData.items || [];

                return (
                  <div
                    key={qKey}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Quarter Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-teal-600 tracking-wider">
                            {qKey} Term
                          </span>
                          <h4 className="font-black text-sm text-slate-800">{quarterData.name}</h4>
                        </div>
                        <span className="h-6 px-2 rounded-full bg-slate-100 text-slate-600 font-extrabold text-[10px] flex items-center justify-center">
                          {items.length} Milestones
                        </span>
                      </div>

                      {/* Milestones in this Quarter */}
                      {items.length === 0 ? (
                        <div className="py-8 text-center text-slate-300 text-xs font-semibold">
                          No milestones recorded
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {items.map((m: any) => (
                            <div
                              key={m._id}
                              className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-extrabold text-xs text-slate-800 leading-snug">
                                  {m.title}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide shrink-0 ${
                                    m.status === 'COMPLETED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : m.status === 'IN_PROGRESS'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-slate-400 block mt-1">
                                {new Date(m.startDate).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── View 4: Embedded Setup & Suggestions View ── */}
      {viewMode === 'setup' && (
        <CalendarPlanningTab initialYearId={selectedAYId} />
      )}

      {/* ── Day Details Modal ── */}
      {selectedDayEvents && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300">
                  Day Schedule
                </span>
                <h3 className="font-black text-base tracking-tight mt-0.5">
                  {selectedDayEvents.date.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedDayEvents.events.map((ev) => (
                <div
                  key={ev._id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getEventBadgeClass(
                        ev.type
                      )}`}
                    >
                      {ev.type}
                    </span>
                    {ev.isSchoolClosed && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        School Closed
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-sm text-slate-800">{ev.title}</h4>
                  {ev.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{ev.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
              <button
                onClick={() => {
                  const titles = selectedDayEvents.events.map((e) => e.title).join(', ');
                  const msg = `Notice from School: ${selectedDayEvents.date.toLocaleDateString()}: ${titles}. Please take note.`;
                  navigator.clipboard.writeText(msg);
                  alert('Holiday announcement text copied to clipboard! You can paste it into WhatsApp or SMS.');
                }}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> Copy Announcement
              </button>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicCalendar;
