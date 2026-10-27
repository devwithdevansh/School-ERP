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
} from './icons';
import { BrandedLoader } from './BrandedLoader';
import { brand } from '../config/brand';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';

const ErpDashboardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-2rem)]">
      <BrandedLoader />
    </div>
  );
};

const TONES = {
  primary: { border: 'border-t-primary', icon: 'bg-accent text-accent-foreground' },
  warning: { border: 'border-t-warning', icon: 'bg-warning-soft text-warning-soft-foreground' },
  success: { border: 'border-t-success', icon: 'bg-success-soft text-success-soft-foreground' },
  info: { border: 'border-t-info', icon: 'bg-info-soft text-info-soft-foreground' },
} as const;

const StatCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  caption: React.ReactNode;
  muted?: boolean;
  tone?: 'primary' | 'warning' | 'success' | 'info';
  onClick?: () => void;
}> = ({ title, icon, value, caption, muted, tone = 'primary', onClick }) => (
  <Card
    onClick={onClick}
    className={`border-t-4 ${TONES[tone].border} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${muted ? 'opacity-70' : ''}`}
  >
    <CardHeader>
      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      <CardAction><div className={`p-2 rounded-lg ${TONES[tone].icon}`}>{icon}</div></CardAction>
    </CardHeader>
    <CardContent>
      <div className={`text-3xl font-black ${muted ? 'text-muted-foreground' : ''}`}>{value}</div>
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">{caption}</p>
    </CardContent>
  </Card>
);

const QuickModule: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; tone: keyof typeof TONES; onClick: () => void }> = ({ icon, title, subtitle, tone, onClick }) => (
  <Button variant="ghost" onClick={onClick} className="w-full h-auto justify-start gap-4 p-3 text-left whitespace-normal">
    <div className={`p-2.5 rounded-lg ${TONES[tone].icon}`}>{icon}</div>
    <div>
      <h4 className="font-bold text-sm">{title}</h4>
      <p className="text-xs font-normal text-muted-foreground">{subtitle}</p>
    </div>
  </Button>
);

export const ErpDashboard: React.FC = () => {
  const { students, authFetch, setScreen, isScreenLoading, calendarEvents } = useApp();

  // Real Data
  const erpStudents = students.filter(s => s.isActive !== false && s.isMigrated === true);
  const activeCount = erpStudents.length;

  const upcomingEvents = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (calendarEvents || [])
      .filter(ev => new Date(ev.endDate).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [calendarEvents]);

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
    <div className="flex-1 p-6 space-y-6 min-h-[calc(100vh-2rem)] animate-in fade-in duration-500 overflow-y-auto">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">ERP Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">{brand.schoolName}</p>
        </div>
        <Button size="lg" onClick={() => setScreen('admission')} className="w-full md:w-auto">
          <UserPlus /> New Admission
        </Button>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total ERP Students"
          icon={<Users className="size-5" />}
          value={activeCount.toLocaleString()}
          caption="Active enrollments in ERP"
          tone="primary"
        />
        <StatCard
          title="Leave Requests"
          icon={<CalendarDays className="size-5" />}
          value={pendingLeaves ?? '—'}
          caption={<>{pendingLeaves === null ? 'Unable to load' : pendingLeaves === 0 ? 'All caught up' : 'Awaiting review'} <ArrowRight className="size-3" /></>}
          tone="warning"
          onClick={() => setScreen('student-leave')}
        />
        <StatCard
          title="Avg Attendance"
          icon={<Clock className="size-5" />}
          value="—"
          caption="Analytics pending integration"
          tone="success"
          muted
        />
        <StatCard
          title="Active Subjects"
          icon={<BookOpen className="size-5" />}
          value="—"
          caption="Curriculum mapping required"
          tone="info"
          muted
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-bold">Recent Admissions</CardTitle>
            <CardAction>
              <Button variant="link" size="sm" onClick={() => setScreen('admission')}>
                View All <ArrowRight />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {activeCount > 0 ? (
              <div className="space-y-3">
                {erpStudents.slice(0, 4).map(student => (
                  <div key={student._id || student.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {student.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{student.studentName}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{student.medium} · Std {student.standard} {student.division}</p>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-center">
                <GraduationCap className="size-12 mb-3 opacity-30" />
                <p className="text-sm font-bold">No students enrolled yet</p>
                <p className="text-xs mt-1">Start by adding a new admission.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Quick Links */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-bold">Quick Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <QuickModule icon={<Clock className="size-5" />} title="Mark Attendance" tone="primary" subtitle="Daily student presence" onClick={() => setScreen('attendance')} />
            <QuickModule icon={<CalendarDays className="size-5" />} title="Calendar & Roadmap" tone="success" subtitle="Holidays & academic milestones" onClick={() => setScreen('academic-calendar')} />
            <QuickModule icon={<CalendarDays className="size-5" />} title="Class Timetable" tone="warning" subtitle="Manage periods & subjects" onClick={() => setScreen('timetable')} />
            <QuickModule icon={<BookOpen className="size-5" />} title="Curriculum Mapping" tone="info" subtitle="Global subjects & mapping" onClick={() => setScreen('subjects')} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Holidays & Events Widget */}
      {upcomingEvents.length > 0 && (
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Upcoming Holidays & School Events</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Key dates scheduled in the official academic calendar</p>
            </div>
            <Button variant="link" size="sm" onClick={() => setScreen('academic-calendar')}>
              Open Calendar <ArrowRight className="ml-1 size-3" />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {upcomingEvents.map(ev => {
                const s = new Date(ev.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const e = new Date(ev.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                const isSingle = ev.startDate.split('T')[0] === ev.endDate.split('T')[0];
                return (
                  <div key={ev._id || ev.title} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          {ev.type}
                        </span>
                        {ev.isSchoolClosed && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Closed
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-800 line-clamp-1">{ev.title}</h4>
                      {ev.description && <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ev.description}</p>}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3 text-slate-400" />
                      <span>{isSingle ? s : `${s} – ${e}`}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
