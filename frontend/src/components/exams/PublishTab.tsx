import React, { useState, useEffect } from 'react';
import { useApp } from '../../store';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Lock, RotateCcw, Clock, Layers, Loader2 } from '../icons';

interface PublishTabProps {
  exam: any;
  isAdmin: boolean;
  onRefreshExam: () => void;
  onNavigateToMarksEntry: (subjectId?: string) => void;
}

export const PublishTab: React.FC<PublishTabProps> = ({
  exam,
  isAdmin,
  onRefreshExam,
  onNavigateToMarksEntry,
}) => {
  const { authFetch, currentUser } = useApp();

  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchReadiness = async () => {
    if (!exam?._id) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/erp/exams/${exam._id}/readiness`);
      if (res.ok) {
        const json = await res.json();
        setReadiness(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, [exam?._id, exam?.status]);

  const handlePublish = async () => {
    if (!exam?._id) return;
    setPublishing(true);
    try {
      const res = await authFetch(`/api/v1/erp/exams/${exam._id}/publish`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to publish exam results');
      }
      setShowConfirmModal(false);
      alert('Exam results published successfully! Students and parents can now view report cards.');
      onRefreshExam();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!exam?._id) return;
    if (!window.confirm('Unpublish this exam? Results will be retracted from parents and students.')) return;

    setUnpublishing(true);
    try {
      const res = await authFetch(`/api/v1/erp/exams/${exam._id}/unpublish`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to unpublish exam');
      }
      alert('Exam unpublished successfully.');
      onRefreshExam();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUnpublishing(false);
    }
  };

  const isPublished = exam.status === 'PUBLISHED';
  const isLocked = exam.status === 'LOCKED';
  const canPublishRole = isAdmin || (currentUser?.role === 'TEACHER' && exam.allowTeacherPublish);
  const canPublish = readiness?.canPublish && canPublishRole && !isLocked && !isPublished;

  return (
    <div className="space-y-6">
      {/* Status Hero Card */}
      {isPublished ? (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Live Results Active
              </span>
            </div>
            <h3 className="text-xl font-black">Examination Results are Published</h3>
            <p className="text-xs text-emerald-100 mt-1">
              Published on {exam.publishedAt ? new Date(exam.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recently'} by {exam.publishedBy?.name || 'Administrator'}.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={handleUnpublish}
              disabled={unpublishing}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-rose-700 hover:bg-rose-50 shadow-md transition-all flex items-center gap-2 self-start md:self-center"
            >
              <RotateCcw className="w-4 h-4" />
              {unpublishing ? 'Unpublishing...' : 'Unpublish Exam'}
            </button>
          )}
        </div>
      ) : readiness?.canPublish ? (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Ready for Publishing
              </span>
            </div>
            <h3 className="text-xl font-black">100% Student Marks Evaluation Complete</h3>
            <p className="text-xs text-indigo-100 mt-1">
              Every student has a confirmed mark or is marked Absent. You can now publish results live.
            </p>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={publishing || !canPublishRole}
            className="px-6 py-3 rounded-xl font-extrabold text-sm bg-white text-indigo-900 hover:bg-indigo-50 shadow-lg transition-all flex items-center gap-2 self-start md:self-center active:scale-95 disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Publish Results Live
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-3xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Marks Pending
              </span>
            </div>
            <h3 className="text-xl font-black">Publishing Currently Gated</h3>
            <p className="text-xs text-amber-100 mt-1">
              All students across every subject must have marks entered or be marked Absent before publishing is unlocked.
            </p>
          </div>

          <div className="text-xs font-bold bg-white/10 px-4 py-2 rounded-xl border border-white/20 self-start md:self-center">
            Progress: {readiness?.overallPercentage ?? 0}% Filled
          </div>
        </div>
      )}

      {/* Blockers Alert if any */}
      {readiness?.blockers && readiness.blockers.length > 0 && !isPublished && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Missing Entries Blocking Results Publication:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {readiness.blockers.map((b: string, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-amber-100 text-amber-900 font-medium">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readiness Checklist Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Subject Readiness Breakdown
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Verify that all students in Std {exam.standard} are evaluated</p>
          </div>
          <button
            onClick={fetchReadiness}
            disabled={loading}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 p-2 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            {loading ? 'Refreshing...' : '↻ Refresh Status'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(readiness?.subjects || []).map((sub: any) => {
            const percent = sub.totalExpected > 0 ? Math.round((sub.filled / sub.totalExpected) * 100) : 0;
            return (
              <div
                key={sub.subjectId}
                className={`p-4 rounded-2xl border transition-all ${
                  sub.isComplete
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {sub.isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                      {sub.subjectName}
                    </h5>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Max: {sub.maxMarks} · Pass: {sub.passingMarks}
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    sub.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {sub.isComplete ? 'Complete ✓' : `${sub.missing} Missing`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sub.isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>
                    Filled: <strong className="text-slate-800">{sub.filled}</strong> / {sub.totalExpected} (Absent: {sub.absent})
                  </span>
                  {!sub.isComplete && (
                    <button
                      onClick={() => onNavigateToMarksEntry(sub.subjectId)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Fill marks →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Publish Results Live?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Publishing will make report cards, rankings, and final grades visible to all {readiness?.totalStudents || 0} students and their parents on the student mobile app and parent portal.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1.5 font-medium text-slate-700 border border-slate-200">
              <div className="font-bold text-slate-900">Summary:</div>
              <div>• Exam: <span className="font-bold">{exam.examName}</span></div>
              <div>• Std {exam.standard} ({exam.medium})</div>
              <div>• {exam.subjects?.length || 0} Subjects · 100% Marks Verified</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
