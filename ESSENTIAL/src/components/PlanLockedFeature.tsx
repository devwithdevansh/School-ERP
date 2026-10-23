import React from 'react';
import { usePlan } from '../context/PlanContext';
import { useApp } from '../store';
import {
  Lock, Sparkles, Check, ArrowRight, ShieldCheck, CalendarDays,
  Users, MessageSquare, Layers, Award, Activity, BookOpen, Clock, Smartphone
} from './icons';

interface FeatureMeta {
  title: string;
  tagline: string;
  brochureProblem: string;
  benefits: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURE_CATALOG: Record<string, FeatureMeta> = {
  timetable: {
    title: 'Timetable & Academic Scheduler',
    tagline: 'Conflict-free weekly schedule generator with teacher substitution management.',
    brochureProblem: 'Eliminates paper-based scheduling conflicts and manual teacher substitution confusion.',
    benefits: [
      'Visual class-wise & teacher-wise weekly schedule grid',
      'Instant substitute teacher detection when a teacher is on leave',
      'Export printable class timetables for classrooms and notice boards',
      'Syncs directly with attendance and student period logs'
    ],
    icon: CalendarDays,
  },
  'teacher-allocation': {
    title: 'Teacher Allocation & Workload Matrix',
    tagline: 'Map subject teachers, class teachers, and workload distribution in one dashboard.',
    brochureProblem: 'Replaces scattered notebook records of which teacher handles which standard.',
    benefits: [
      'Designate primary Class Teachers for 1-click attendance authority',
      'Allocate subject specialists across standards and divisions',
      'Track total teaching periods per week per faculty member',
      'Dynamic faculty reassignment without data loss'
    ],
    icon: Users,
  },
  subjects: {
    title: 'Curriculum & Subjects Management',
    tagline: 'Standardize subjects, syllabi, and grading criteria per class.',
    brochureProblem: 'Prevents inconsistent grading criteria and unorganized subject records.',
    benefits: [
      'Standard-wise subject configuration for English & Gujarati mediums',
      'Theory, practical, and viva marks weightage setup',
      'Centralized curriculum repository accessible by all teachers',
      'One-click propagation to report cards and examination marksheets'
    ],
    icon: BookOpen,
  },
  'student-leave': {
    title: 'Student Leave Management',
    tagline: 'Digital leave applications, medical records, and automatic attendance integration.',
    brochureProblem: 'Replaces handwritten leave notes that get misplaced or forgotten.',
    benefits: [
      'Digital leave requests with doctor certificate attachments',
      'Automated attendance marking (converts to Leave on approved dates)',
      'Parent leave history and attendance percentage impact preview',
      'Instant SMS/WhatsApp notification to parents upon approval'
    ],
    icon: CalendarDays,
  },
  'staff-leave': {
    title: 'Staff & Faculty Leave Tracking',
    tagline: 'Manage teacher casual leave, sick leave, and automated substitution alerts.',
    brochureProblem: 'Prevents empty classrooms when faculty members take unplanned leave.',
    benefits: [
      'Leave balance tracking (CL, SL, Maternity/Paternity)',
      'Principal 1-click approve/reject desk with comments',
      'Automated prompt to assign substitute teachers during leave days',
      'Comprehensive monthly staff attendance and payroll sync'
    ],
    icon: Clock,
  },
  roles: {
    title: 'Roles & Granular Permissions (RBAC)',
    tagline: 'Enterprise access control for Principals, Clerks, Teachers, and Accountants.',
    brochureProblem: 'Protects sensitive student fees and marks data from unauthorized tampering.',
    benefits: [
      'Custom role definitions (Principal, Admin, Accountant, Teacher, Clerk)',
      'Module-level permissions (View only, Edit, Delete, Export, Approve)',
      'Security boundary preventing teachers from viewing other classes\' fees',
      'Admin override with audit footprint'
    ],
    icon: ShieldCheck,
  },
  whatsapp: {
    title: 'WhatsApp Automation & Instant Alerts',
    tagline: 'Automated payment receipts, absent notifications, and school broadcast alerts.',
    brochureProblem: 'Reduces repeated parent phone calls and improves fee collection recovery.',
    benefits: [
      'Instant payment receipt PDF sent to parent\'s WhatsApp on collection',
      'Automated daily 09:30 AM absentee alerts to parents',
      'Broadcast announcements (Exam schedule, holidays, circulars)',
      'Official WhatsApp Cloud API integration with verified sender'
    ],
    icon: MessageSquare,
  },
  certificates: {
    title: 'Certificates & ID Card Generation',
    tagline: '1-click generation of Bonafide certificates, Leaving Certificates (LC), and Student ID cards.',
    brochureProblem: 'Replaces manual typing and re-entering student details into Word/Photoshop.',
    benefits: [
      'Instant Transfer/Leaving Certificate with serial number tracking',
      'Print-ready Student ID Cards with photo, QR code, and blood group',
      'Bonafide & Character certificates formatted to school letterhead',
      'Permanent digital archive with tamper-proof verification QR'
    ],
    icon: Award,
  },
  'audit-log': {
    title: 'System Security & Audit Trail',
    tagline: 'Comprehensive audit log recording every fee collection, grade change, and deletion.',
    brochureProblem: 'Ensures absolute transparency and accountability across institute administration.',
    benefits: [
      'Chronological activity log: who changed what, when, and from which IP',
      'Audit tracking for fee waivers, fee concessions, and payment cancellations',
      'Filterable by user, module, date range, and severity level',
      'Exportable compliance audit report for school management & trusts'
    ],
    icon: Activity,
  },
  'fee-structure': {
    title: 'Advanced Multi-Year Fee Structures',
    tagline: 'Dynamic fee tiers, installment schedules, transport slabs, and concessions.',
    brochureProblem: 'Replaces complex Excel fee calculations prone to manual billing mistakes.',
    benefits: [
      'Class-wise customized fee heads (Tuition, Term, Exam, Lab, Computer)',
      'Automated monthly/quarterly ledger generation across 1000+ students',
      'Custom transport fee slabs based on route and pickup point',
      'Management scholarship and sibling concession rules'
    ],
    icon: Layers,
  },
  'parent-app': {
    title: 'Parent & Student Mobile Application',
    tagline: 'Dedicated Android & iOS mobile app for parents with real-time fee payment & homework.',
    brochureProblem: 'Keeps modern parents satisfied with digital transparency at their fingertips.',
    benefits: [
      'White-label mobile application branded with your school\'s name & logo',
      'Online fee payment via UPI, Debit Card, Credit Card, and NetBanking',
      'Daily attendance, timetable, results, and teacher homework broadcast',
      'Push notifications for urgent announcements and holidays'
    ],
    icon: Smartphone,
  },
};

export const PlanLockedFeature: React.FC<{ screen: string }> = ({ screen }) => {
  const { setPlan } = usePlan();
  const { setScreen } = useApp();

  const meta: FeatureMeta = FEATURE_CATALOG[screen] || {
    title: screen.replace(/-/g, ' ').toUpperCase(),
    tagline: 'Comprehensive module available in the Standard (Professional) Plan.',
    brochureProblem: 'Replaces manual paperwork with connected digital workflows.',
    benefits: [
      'Full interactive database management',
      'Multi-user collaborative access across departments',
      'Real-time reporting and administrative automation',
      'Dedicated integration with central ERP services'
    ],
    icon: Lock,
  };

  const Icon = meta.icon;

  const handleUnlockInDemo = () => {
    setPlan('STANDARD');
    // Remain on the current screen to immediately display the unlocked module!
  };

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto min-h-[calc(100vh-4rem)] flex items-center justify-center text-left">
      <div className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-500/20 border border-indigo-400/40 px-3 py-1 text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                <span>Level 02 · Professional Module</span>
              </span>
              <span className="rounded-lg bg-teal-500/20 border border-teal-400/30 px-2.5 py-1 text-xs font-semibold text-teal-200">
                Current: Basic Plan
              </span>
            </div>

            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              <span>DevWithDevansh Education Software</span>
            </span>
          </div>

          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-inner">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">{meta.title}</h2>
              <p className="mt-1.5 text-sm text-slate-300 max-w-2xl">{meta.tagline}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Problem Solved Callout */}
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/70 p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
            <span className="text-amber-600 font-bold text-base shrink-0">💡</span>
            <div>
              <strong className="font-bold">The Problem This Solves (Brochure Page 02):</strong>
              <p className="mt-0.5 text-amber-800">{meta.brochureProblem}</p>
            </div>
          </div>

          {/* Value Highlights Grid */}
          <div>
            <h3 className="font-display font-bold text-slate-900 text-sm uppercase tracking-wider mb-3">
              Included in the Standard (Professional) Plan:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {meta.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs text-slate-700">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Comparison Micro-Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="grid grid-cols-2 bg-slate-100/80 font-bold p-3 text-slate-700 border-b border-slate-200">
              <div>⚡ Basic Plan (Essential)</div>
              <div>🚀 Standard Plan (Professional)</div>
            </div>
            <div className="grid grid-cols-2 p-3.5 text-slate-600 gap-4 bg-white">
              <div className="space-y-1">
                <p>• Assisted manual / Excel operations</p>
                <p>• Single-page teacher attendance sheet</p>
                <p>• Core fee tracking & receipts</p>
                <p className="text-slate-400 italic">Advanced automation modules locked</p>
              </div>
              <div className="space-y-1 text-indigo-900 font-medium">
                <p>• Full self-service multi-department ERP</p>
                <p>• Automated timetable & leave workflows</p>
                <p>• WhatsApp alerts & fee structures</p>
                <p className="text-indigo-600 font-bold">✓ All modules unlocked & active</p>
              </div>
            </div>
          </div>

          {/* Interactive Unlock Action for Client Demos */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-violet-50 border border-indigo-100 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-indigo-950">Show this feature to your client right now:</p>
              <p className="text-xs text-indigo-700">
                Click below to instantly toggle to <strong>Standard Plan</strong> and test this module live against the database.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScreen('dashboard')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Return to Dashboard
              </button>

              <button
                type="button"
                onClick={handleUnlockInDemo}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition active:scale-95"
              >
                <span>Unlock in Standard Plan Preview</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Footer Commercial Quote */}
          <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
            DevWithDevansh Education Solutions · Starting from ₹9,999/year · Transparent commercial model shaped around your institute
          </div>
        </div>
      </div>
    </div>
  );
};
