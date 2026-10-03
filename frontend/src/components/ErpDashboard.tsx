import React, { useEffect, useState } from 'react';
import { useApp } from '../store';
import {
  Users,
  CalendarDays,
  Clock,
  BookOpen,
  UserPlus,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { BrandedLoader } from './BrandedLoader';
import { brand } from '../config/brand';

const ErpDashboardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50/50 min-h-[calc(100vh-2rem)]">
      <BrandedLoader />
    </div>
  );
};

export const ErpDashboard: React.FC = () => {
  const { students, authFetch, setScreen, isScreenLoading } = useApp();

  // Real Data
  const erpStudents = students.filter(s => s.isActive !== false && s.isMigrated === true);
  const activeCount = erpStudents.length;

  const [pendingLeaves, setPendingLeaves] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch('/api/v1/erp/leave?status=PENDING')
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (!cancelled) setPendingLeaves(json?.data?.length ?? 0); })
      .catch(() => { if (!cancelled) setPendingLeaves(null); });
    return () => { cancelled = true; };
  }, [authFetch]);

  if (isScreenLoading) {
    return <ErpDashboardSkeleton />;
  }

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-50/50 min-h-[calc(100vh-2rem)] animate-in fade-in duration-500 overflow-y-auto">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">ERP Dashboard</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">{brand.schoolName}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setScreen('admission')}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" /> New Admission
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total ERP Students</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800">{activeCount.toLocaleString()}</div>
          <p className="text-xs text-slate-500 font-semibold mt-2">Active enrollments in ERP</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow border-t-4 border-t-amber-500 cursor-pointer" onClick={() => setScreen('student-leave')}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Leave Requests</h3>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><CalendarDays className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800">{pendingLeaves ?? '—'}</div>
          <p className="text-xs text-amber-600 font-semibold mt-2 flex items-center gap-1">
            {pendingLeaves === null ? 'Unable to load' : pendingLeaves === 0 ? 'All caught up' : 'Awaiting review'} <ArrowRight className="h-3 w-3" />
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow border-t-4 border-t-emerald-500 opacity-70">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Avg Attendance</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Clock className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-black text-slate-400">—</div>
          <p className="text-xs text-slate-400 font-semibold mt-2">Analytics pending integration</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow border-t-4 border-t-purple-500 opacity-70">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Active Subjects</h3>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><BookOpen className="w-5 h-5" /></div>
          </div>
          <div className="text-3xl font-black text-slate-400">—</div>
          <p className="text-xs text-slate-400 font-semibold mt-2">Curriculum mapping required</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-lg">Recent Admissions</h3>
            <button onClick={() => setScreen('admission')} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-6">
             {activeCount > 0 ? (
                <div className="space-y-4">
                  {erpStudents.slice(0, 4).map(student => (
                    <div key={student._id || student.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {student.studentName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{student.studentName}</h4>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{student.medium} · Std {student.standard} {student.division}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
                  <GraduationCap className="h-12 w-12 mb-3 text-slate-300" />
                  <p className="text-sm font-bold">No students enrolled yet</p>
                  <p className="text-xs font-medium mt-1">Start by adding a new admission.</p>
                </div>
             )}
          </div>
        </div>

        {/* Right Column: Quick Links */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-lg">Quick Modules</h3>
          </div>
          <div className="p-3">
             <button onClick={() => setScreen('attendance')} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors text-left group">
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><Clock className="h-5 w-5" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Mark Attendance</h4>
                  <p className="text-xs font-medium text-slate-500">Daily student presence</p>
                </div>
             </button>
             <button onClick={() => setScreen('timetable')} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors text-left group mt-1">
                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Class Timetable</h4>
                  <p className="text-xs font-medium text-slate-500">Manage periods & subjects</p>
                </div>
             </button>
             <button onClick={() => setScreen('subjects')} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors text-left group mt-1">
                <div className="bg-cyan-50 text-cyan-600 p-3 rounded-xl group-hover:scale-110 transition-transform"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Curriculum Mapping</h4>
                  <p className="text-xs font-medium text-slate-500">Global subjects & mapping</p>
                </div>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
