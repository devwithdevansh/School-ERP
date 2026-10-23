import React, { useState } from 'react';
import { Calendar, Clock, Layers, ShieldCheck, CheckCircle2, AlertCircle, Edit3, Lock } from '../icons';

interface ExamOverviewTabProps {
  exam: any;
  isAdmin: boolean;
  onUpdateExam: (updatedFields: any) => Promise<void>;
  onNavigateToMarksEntry: (subjectId?: string) => void;
}

export const ExamOverviewTab: React.FC<ExamOverviewTabProps> = ({
  exam,
  isAdmin,
  onUpdateExam,
  onNavigateToMarksEntry,
}) => {
  const [updatingToggle, setUpdatingToggle] = useState(false);

  const handleToggleTeacherPublish = async () => {
    if (!isAdmin || updatingToggle) return;
    setUpdatingToggle(true);
    try {
      await onUpdateExam({ allowTeacherPublish: !exam.allowTeacherPublish });
    } finally {
      setUpdatingToggle(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Published</span>;
      case 'READY':
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Ready to Publish</span>;
      case 'MARKS_ENTRY':
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Marks Entry</span>;
      case 'LOCKED':
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Locked</span>;
      case 'SCHEDULED':
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Scheduled</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Key Metrics */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider ${
                exam.type === 'WEEKLY' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-indigo-400/20 text-indigo-200 border border-indigo-400/30'
              }`}>
                {exam.type === 'WEEKLY' ? '⚡ Weekly Assessment' : 'Term / Final Examination'}
              </span>
              {getStatusBadge(exam.status)}
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white">{exam.examName}</h2>
            <p className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-2">
              <span>Std {exam.standard} ({exam.medium})</span>
              <span>•</span>
              <span>Divisions: {exam.divisions?.length ? exam.divisions.join(', ') : 'All'}</span>
              <span>•</span>
              <span>{exam.subjects?.length || 0} Subjects Included</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToMarksEntry()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white text-indigo-950 hover:bg-slate-100 shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-indigo-600" /> Enter Marks
            </button>
          </div>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60 text-xs">
          <div>
            <div className="text-slate-400 font-medium">Standard / Class</div>
            <div className="text-sm font-bold text-white mt-0.5">Std {exam.standard}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Instruction Medium</div>
            <div className="text-sm font-bold text-white mt-0.5">{exam.medium}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Teacher Publishing</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {exam.allowTeacherPublish ? 'Enabled (Allocated)' : 'Admin Only'}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Scheduled By</div>
            <div className="text-sm font-bold text-white mt-0.5">{exam.createdBy?.name || 'Admin'}</div>
          </div>
        </div>
      </div>

      {/* Admin Governance Card */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Teacher Publishing Permission</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable this to allow allocated class and subject teachers to publish results once 100% of student marks are entered.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={exam.allowTeacherPublish || false}
              onChange={handleToggleTeacherPublish}
              disabled={updatingToggle || exam.status === 'PUBLISHED' || exam.status === 'LOCKED'}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      )}

      {/* Subjects & Timetable Schedule Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Subjects & Timetable Schedule
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Subject dates, timings, marks distribution, and evaluation progress</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-xs">
            {exam.subjects?.length || 0} Subjects
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-center">Grading</th>
                <th className="py-3 px-4 text-center">Max Marks</th>
                <th className="py-3 px-4 text-center">Pass Marks</th>
                <th className="py-3 px-4 text-center">Entry Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(exam.subjects || []).map((sub: any, idx: number) => {
                const subId = sub.subjectId?._id || sub.subjectId;
                const subName = sub.subjectId?.subjectName || 'Subject';
                const subCode = sub.subjectId?.subjectCode || '';

                return (
                  <tr key={subId || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 text-sm">{subName}</div>
                      {subCode && <div className="text-[10px] text-slate-400 font-semibold">{subCode}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      {sub.examDate ? (
                        <div className="font-semibold text-slate-700">
                          {new Date(sub.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                      {(sub.startTime || sub.endTime) && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {sub.startTime || ''} - {sub.endTime || ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        {sub.gradingSystem || 'Marks'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {sub.gradingSystem === 'Marks' ? sub.maxMarks : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                      {sub.gradingSystem === 'Marks' ? sub.passingMarks : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {sub.entryStatus === 'SUBMITTED' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Submitted ✓
                        </span>
                      ) : sub.entryStatus === 'IN_PROGRESS' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                          In Progress
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateToMarksEntry(subId)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
                      >
                        Enter Marks →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
