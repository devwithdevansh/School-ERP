import React, { useState } from 'react';
import { useApp } from '../store';
import {
  Lock,
  CheckCircle2,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Settings,
} from './icons';

interface ModuleMetadata {
  name: string;
  badge: string;
  gradient: string;
  tagline: string;
  features: { title: string; desc: string }[];
}

const MODULE_META: Record<string, ModuleMetadata> = {
  ATTENDANCE: {
    name: 'Attendance Management',
    badge: 'Academic Operations Suite',
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    tagline: 'Streamline classroom roll calls, automate monthly registers, and keep parents informed in real time.',
    features: [
      {
        title: 'Daily Classroom Roll Call',
        desc: 'Instant class-by-class student attendance marking with single-tap present/absent toggles.',
      },
      {
        title: 'Monthly Register & Analytics',
        desc: 'Automated attendance registers, monthly percentage calculations, and CBSE/State board exportable reports.',
      },
      {
        title: 'Instant Parent Absence Alerts',
        desc: 'Automate WhatsApp and SMS notifications to parents immediately when their child is absent.',
      },
      {
        title: 'Staff & Teacher Attendance',
        desc: 'Biometric device sync, teacher punch logs, and leave integration for complete campus tracking.',
      },
    ],
  },
  HOMEWORK: {
    name: 'Homework & Digital Assignments',
    badge: 'E-Learning & Curriculum Suite',
    gradient: 'from-indigo-500 via-purple-600 to-pink-600',
    tagline: 'Assign daily homework with subject tags, file attachments, and submission tracking.',
    features: [
      {
        title: 'Daily Homework Publishing',
        desc: 'Subject teachers broadcast daily tasks with PDF attachments and instructions directly to the parent app.',
      },
      {
        title: 'Digital Submission Portal',
        desc: 'Students submit homework photos and documents through their student companion app.',
      },
      {
        title: 'Teacher Review & Grading',
        desc: 'Teachers review submissions, give remarks, and track non-submissions per class.',
      },
      {
        title: 'Homework History Archive',
        desc: 'Search past homework by date range, subject, or standard for revision.',
      },
    ],
  },
  RESULTS: {
    name: 'Exams, Marks & Report Cards',
    badge: 'Academic Assessment Suite',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    tagline: 'Comprehensive assessment engine with marks entry, ranking analytics, and automated report card printing.',
    features: [
      {
        title: 'Term & Unit Exam Schedules',
        desc: 'Create exam timetables, seating plans, and subject maximum/passing mark rules.',
      },
      {
        title: 'Bulk Marks Entry by Subject',
        desc: 'Spreadsheet-style marks entry grid with validation, absent tagging, and grace marks.',
      },
      {
        title: 'CBSE & State Board Report Cards',
        desc: '1-click generation of A4 official report cards with grades, attendance, and remarks.',
      },
      {
        title: 'Class Performance Analytics',
        desc: 'Subject averages, highest/lowest marks, top performers, and pass/fail distributions.',
      },
    ],
  },
  TIMETABLE: {
    name: 'Timetable & Teacher Scheduling',
    badge: 'Campus Operations Suite',
    gradient: 'from-blue-500 via-indigo-600 to-violet-600',
    tagline: 'Conflict-free master timetable scheduling with teacher period allocation and substitution tracking.',
    features: [
      {
        title: 'Weekly Class Timetable Matrix',
        desc: 'Visual period-by-period schedule for all standards with subject and teacher tags.',
      },
      {
        title: 'Teacher Workload Balancer',
        desc: 'Track weekly teaching periods per teacher to avoid overload and timetable conflicts.',
      },
      {
        title: 'Smart Substitute Allocation',
        desc: 'Quickly find free teachers during any period when a staff member is on leave.',
      },
      {
        title: 'Mobile Sync for Parents & Teachers',
        desc: 'Timetable reflects instantly on parent and teacher mobile apps.',
      },
    ],
  },
  CALENDAR: {
    name: 'Academic Calendar & Events',
    badge: 'Annual Planning Suite',
    gradient: 'from-violet-500 via-fuchsia-600 to-pink-600',
    tagline: 'Publish institutional terms, holiday schedules, circulars, and academic milestones.',
    features: [
      {
        title: 'Official Holiday Lists',
        desc: 'Pre-load gazetted and local school holidays with closure notices.',
      },
      {
        title: 'Event & PTM Announcements',
        desc: 'Publish sports days, annual functions, exams, and parent-teacher meetings.',
      },
      {
        title: 'Annual Academic Roadmap',
        desc: 'Month-by-month curriculum and activity planner for teachers.',
      },
      {
        title: 'Parent App Synchronization',
        desc: 'Parents receive push reminders before events and scheduled holidays.',
      },
    ],
  },
  FEES: {
    name: 'Fees & Online Payments',
    badge: 'Financial & Accounting Suite',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    tagline: 'Collect school fees, track dues, generate GST-compliant receipts, and accept Razorpay payments.',
    features: [
      {
        title: 'Instant Fee Collection',
        desc: 'Collect cash, cheque, UPI, and online fees with automated student ledger balance updates.',
      },
      {
        title: 'Defaulters & Dues Tracking',
        desc: 'Comprehensive list of unpaid students with 1-click WhatsApp payment reminders.',
      },
      {
        title: 'Online Payment Gateway',
        desc: 'Parents pay tuition, transport, and term fees securely through Razorpay in the mobile app.',
      },
      {
        title: 'Daily Collection & Expense Reports',
        desc: 'End-of-day cash reconciliation, expense tracking, and accountant audit logs.',
      },
    ],
  },
  LEAVE: {
    name: 'Leave Management',
    badge: 'Human Resources Suite',
    gradient: 'from-rose-500 via-pink-600 to-red-600',
    tagline: 'Digital leave applications for students and staff with streamlined approval workflows.',
    features: [
      {
        title: 'Parent Leave Applications',
        desc: 'Parents submit sick and personal leave requests with reason and dates from the mobile app.',
      },
      {
        title: 'Teacher & Staff Leave Requests',
        desc: 'Staff apply for casual, medical, and duty leave directly to the principal.',
      },
      {
        title: '1-Click Administrative Approvals',
        desc: 'Administrators review and approve or reject leave with automatic status notifications.',
      },
      {
        title: 'Attendance Auto-Integration',
        desc: 'Approved leaves automatically sync with daily attendance sheets as "On Leave".',
      },
    ],
  },
  COMMUNICATION: {
    name: 'Parent-Teacher Messages & Chat',
    badge: 'Community Engagement Suite',
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    tagline: 'Direct, secure communication channel between parents, class teachers, and administration.',
    features: [
      {
        title: 'Direct Teacher-Parent Messages',
        desc: 'Safe, monitored messaging between parents and assigned class teachers.',
      },
      {
        title: 'School-Wide Broadcast Alerts',
        desc: 'Send urgent school notices and emergency alerts instantly to all parents.',
      },
      {
        title: 'Message Read Receipts',
        desc: 'Verify which parents have viewed circulars and urgent messages.',
      },
      {
        title: 'Push Notifications Center',
        desc: 'Deliver notifications directly to smartphones without SMS gateway charges.',
      },
    ],
  },
};

export const UpgradePaywall: React.FC<{
  moduleId: string;
  moduleName?: string;
  description?: string;
}> = ({ moduleId, moduleName, description }) => {
  const { client, isOrgAdmin, setScreen, refreshData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const meta = MODULE_META[moduleId] || {
    name: moduleName || `${moduleId} Module`,
    badge: 'Enterprise Add-on',
    gradient: 'from-indigo-600 via-purple-600 to-violet-700',
    tagline: description || 'Unlock advanced capabilities for your school administration, teachers, and parents.',
    features: [
      { title: 'Full Administrative Controls', desc: 'Enterprise management workflows, role permissions, and audits.' },
      { title: 'Mobile App Integration', desc: 'Instant synchronization with the parent and teacher companion apps.' },
      { title: 'Automated Reports & Analytics', desc: 'Real-time charts, summaries, and PDF/Excel data export.' },
      { title: 'Priority Support & SLA', desc: 'Dedicated technical onboarding and continuous software updates.' },
    ],
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] p-6 lg:p-12 flex flex-col items-center justify-center overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative w-full max-w-4xl space-y-8">
        {/* If logged in as ORG_ADMIN, show quick shortcut banner */}
        {isOrgAdmin && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-950">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">
                <Settings className="h-3.5 w-3.5" />
              </span>
              <span>
                <strong>Platform Operator Notice:</strong> You are viewing this page as an Organization Admin.
                You can toggle this module on for <strong>{client?.name || 'this client'}</strong> right now in Org Licences.
              </span>
            </div>
            <button
              onClick={() => setScreen('org-licences')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shrink-0 cursor-pointer transition-colors shadow-xs"
            >
              Open Org Licences →
            </button>
          </div>
        )}

        {/* Main Paywall Hero Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-8 lg:p-12 shadow-xl shadow-slate-200/50">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-5">
            {/* Top Pill & Lock Icon */}
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${meta.gradient} flex items-center justify-center text-white shadow-lg shadow-indigo-500/20`}
              >
                <Lock className="h-9 w-9 text-white stroke-[2.2]" />
              </div>
              <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white shadow-xs border border-white/20">
                LOCKED
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {meta.badge} • Plan Upgrade Required
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                {meta.name}
              </h2>
              <p className="text-base text-slate-600 mt-2 leading-relaxed">
                {meta.tagline}
              </p>
            </div>

            <p className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
              School Account: <strong className="text-slate-800">{client?.name || 'Your School'}</strong> ({client?.code || 'client'}) · This module is currently switched off in your institutional plan.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full justify-center">
              <button
                onClick={() => setShowContactModal(true)}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r ${meta.gradient} text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98`}
              >
                <span>Contact Provider to Upgrade</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{refreshing ? 'Checking Licences...' : 'Check License Status'}</span>
              </button>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-12 pt-10 border-t border-slate-100">
            <div className="text-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                What unlocks when this module is enabled:
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meta.features.map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex items-start gap-3.5 hover:bg-white hover:border-slate-200 hover:shadow-xs transition-all"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Support Notice */}
        <div className="text-center text-xs text-slate-400">
          Need immediate activation? Contact your software provider or support team.
        </div>
      </div>

      {/* Upgrade Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Upgrade Subscription</h3>
                <p className="text-xs text-slate-500">Contact our deployment & licensing team</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700">
              <p className="leading-relaxed">
                To enable <strong>{meta.name}</strong> for <strong>{client?.name || 'your institution'}</strong>, please get in touch with our solutions engineer or administrative partner:
              </p>
              <div className="space-y-2 pt-1 font-medium">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:support@schoolerp.com" className="hover:underline">support@schoolerp.com</a>
                </div>
                <div className="flex items-center gap-2 text-indigo-600">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+919876543210" className="hover:underline">+91 98765 43210</a>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
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
