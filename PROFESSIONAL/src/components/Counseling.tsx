import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../store';

// ---- Types ----
interface Milestone {
  milestone: string;
  targetDate: string;
  status: 'pending' | 'in_progress' | 'achieved';
  completedAt?: string | null;
}

interface CounselingRecord {
  _id: string;
  studentId: string | { _id: string; studentName?: string; name?: string; admissionNumber?: string; studentCode?: string };
  createdBy: { _id: string; name: string; email: string };
  type: 'academic' | 'behavioural' | 'social' | 'emotional';
  trigger?: { source?: string; refId?: string | null };
  summary: string;
  privateNotes?: string;
  supportPlan: Milestone[];
  visibility: 'admin_teacher_only' | 'with_parent_consent';
  parentConsentGiven: boolean;
  status: 'open' | 'in_progress' | 'closed';
  closedAt?: string | null;
  createdAt: string;
}

interface Student {
  _id: string;
  name?: string;
  studentName?: string;
  admissionNumber?: string;
  studentCode?: string;
  grNo?: string;
  standard?: string;
  division?: string;
}

// ---- Constants ----
const TYPE_COLORS: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-700 border-blue-200',
  behavioural: 'bg-orange-100 text-orange-700 border-orange-200',
  social: 'bg-green-100 text-green-700 border-green-200',
  emotional: 'bg-purple-100 text-purple-700 border-purple-200',
};

const MILESTONE_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  achieved: 'bg-green-100 text-green-700',
};

const TRIGGER_SOURCES = [
  { value: 'exam_result', label: 'Exam Result' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'self_referral', label: 'Self Referral' },
  { value: 'teacher_observation', label: 'Teacher Observation' },
  { value: 'parent_request', label: 'Parent Request' },
];

const BASE = '/api/v1/counseling';

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ---- Sub-components ----

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-yellow-50 text-yellow-700',
    closed: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function MilestoneProgress({ milestones }: { milestones: Milestone[] }) {
  if (!milestones.length) return <span className="text-xs text-gray-400">No milestones</span>;
  const achieved = milestones.filter((m) => m.status === 'achieved').length;
  const pct = Math.round((achieved / milestones.length) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{achieved}/{milestones.length}</span>
    </div>
  );
}

// ---- New Record Modal ----
interface NewRecordModalProps {
  studentId: string;
  onClose: () => void;
  onCreated: () => void;
}

function NewRecordModal({ studentId, onClose, onCreated }: NewRecordModalProps) {
  const [form, setForm] = useState({
    type: 'academic',
    triggerSource: '',
    summary: '',
    privateNotes: '',
    visibility: 'admin_teacher_only',
  });
  const [milestones, setMilestones] = useState<{ milestone: string; targetDate: string }[]>([]);
  const [newMilestone, setNewMilestone] = useState({ milestone: '', targetDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addMilestone = () => {
    if (!newMilestone.milestone.trim() || !newMilestone.targetDate) return;
    setMilestones((prev) => [...prev, { ...newMilestone }]);
    setNewMilestone({ milestone: '', targetDate: '' });
  };

  const removeMilestone = (idx: number) => setMilestones((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.summary.trim()) { setError('Summary is required'); return; }
    setSubmitting(true);
    try {
      await apiFetch(BASE, {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          type: form.type,
          trigger: form.triggerSource ? { source: form.triggerSource } : undefined,
          summary: form.summary,
          privateNotes: form.privateNotes,
          visibility: form.visibility,
          supportPlan: milestones,
        }),
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">New Counseling Recommendation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
        </div>
        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {['academic', 'behavioural', 'social', 'emotional'].map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Source</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.triggerSource}
              onChange={(e) => setForm({ ...form, triggerSource: e.target.value })}
            >
              <option value="">None</option>
              {TRIGGER_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary <span className="text-red-500">*</span></label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows={3}
              maxLength={1000}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Describe the counseling need..."
            />
            <div className="text-right text-xs text-gray-400">{form.summary.length}/1000</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Private Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows={2}
              maxLength={2000}
              value={form.privateNotes}
              onChange={(e) => setForm({ ...form, privateNotes: e.target.value })}
              placeholder="Confidential notes (not visible to parents)..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <div className="flex gap-4">
              {[
                { value: 'admin_teacher_only', label: 'Admin & Teacher Only' },
                { value: 'with_parent_consent', label: 'With Parent Consent' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={form.visibility === opt.value}
                    onChange={() => setForm({ ...form, visibility: opt.value })}
                    className="accent-blue-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          {/* Support Plan Builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Plan Milestones</label>
            {milestones.length > 0 && (
              <ul className="mb-2 space-y-1">
                {milestones.map((m, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm">
                    <span>{m.milestone}</span>
                    <span className="text-gray-400 text-xs mr-2">{m.targetDate}</span>
                    <button type="button" onClick={() => removeMilestone(idx)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Milestone description"
                value={newMilestone.milestone}
                onChange={(e) => setNewMilestone({ ...newMilestone, milestone: e.target.value })}
              />
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={newMilestone.targetDate}
                onChange={(e) => setNewMilestone({ ...newMilestone, targetDate: e.target.value })}
              />
              <button
                type="button"
                onClick={addMilestone}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
              >
                Add
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Record Detail Panel ----
interface RecordDetailProps {
  record: CounselingRecord;
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onUpdated: () => void;
}

function RecordDetail({ record, currentUserId, currentUserRole, onClose, onUpdated }: RecordDetailProps) {
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'STAFF';
  const isCreator = (typeof record.createdBy === 'object' ? record.createdBy._id : record.createdBy) === currentUserId;
  const canEdit = isAdmin || isCreator;

  const updateMilestone = async (idx: number, status: string) => {
    try {
      await apiFetch(`${BASE}/${record._id}/milestone/${idx}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const closeRecord = async () => {
    if (!confirm('Close this counseling record?')) return;
    try {
      await apiFetch(`${BASE}/${record._id}/close`, { method: 'PATCH' });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const grantConsent = async () => {
    try {
      await apiFetch(`${BASE}/${record._id}/consent`, { method: 'PATCH' });
      onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TypeBadge type={record.type} />
            <StatusBadge status={record.status} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Summary</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{record.summary}</p>
        </div>

        {canEdit && record.privateNotes && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">🔒 Private Notes</h3>
            <p className="text-sm text-amber-700">{record.privateNotes}</p>
          </div>
        )}

        {record.trigger?.source && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Trigger</h3>
            <span className="text-sm text-gray-600 capitalize">{record.trigger.source.replace('_', ' ')}</span>
          </div>
        )}

        {record.supportPlan.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Support Plan Milestones</h3>
            <ul className="space-y-2">
              {record.supportPlan.map((m, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  {canEdit ? (
                    <input
                      type="checkbox"
                      checked={m.status === 'achieved'}
                      onChange={(e) => updateMilestone(idx, e.target.checked ? 'achieved' : 'in_progress')}
                      className="mt-0.5 accent-green-500"
                    />
                  ) : (
                    <span className={`w-3 h-3 rounded-full mt-1 ${m.status === 'achieved' ? 'bg-green-500' : m.status === 'in_progress' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                  )}
                  <div className="flex-1">
                    <span className={`text-sm ${m.status === 'achieved' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{m.milestone}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">Target: {new Date(m.targetDate).toLocaleDateString()}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${MILESTONE_COLORS[m.status]}`}>{m.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <MilestoneProgress milestones={record.supportPlan} />
            </div>
          </div>
        )}

        <div className="border-t pt-4 flex flex-wrap gap-2">
          {isAdmin && !record.parentConsentGiven && (
            <button
              onClick={grantConsent}
              className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium"
            >
              Grant Parent Consent
            </button>
          )}
          {record.parentConsentGiven && (
            <span className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg border border-green-200">
              ✓ Parent Consent Given
            </span>
          )}
          {canEdit && record.status !== 'closed' && (
            <button
              onClick={closeRecord}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Close Record
            </button>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-400">
          Created by {typeof record.createdBy === 'object' ? record.createdBy.name : 'Unknown'} · {new Date(record.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

// ---- Parent View ----
function ParentView() {
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CounselingRecord | null>(null);
  const studentId = (window as unknown as Record<string, unknown>).__STUDENT_ID__ as string | undefined;

  useEffect(() => {
    if (!studentId) return;
    apiFetch(`${BASE}/student/${studentId}`)
      .then((data) => setRecords(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">My Child's Support Plans</h2>
      {records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No counseling records available.</div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div
              key={r._id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md transition"
              onClick={() => setSelected(r)}
            >
              <div className="flex items-center gap-2 mb-2">
                <TypeBadge type={r.type} />
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{r.summary}</p>
              <MilestoneProgress milestones={r.supportPlan} />
            </div>
          ))}
        </div>
      )}
      {selected && (
        <RecordDetail
          record={selected}
          currentUserId=""
          currentUserRole="parent"
          onClose={() => setSelected(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}

// ---- Admin / Teacher View ----
function AdminTeacherView({ currentUserId, currentUserRole }: { currentUserId: string; currentUserRole: string }) {
  const { activeStudents, students: appStudents } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CounselingRecord | null>(null);

  const studentDisplayName = (s: Student) => s.studentName || s.name || 'Student';
  const studentDisplayCode = (s: Student) => s.studentCode || s.admissionNumber || s.grNo || (s.standard ? `Std ${s.standard}-${s.division}` : '');

  const searchStudents = useCallback(async (q: string) => {
    if (!q.trim()) { setStudents([]); return; }
    setSearchLoading(true);
    try {
      const data = await apiFetch(`/api/v1/students?search=${encodeURIComponent(q)}&limit=10`);
      const list = Array.isArray(data) ? data : (data.data || []);
      setStudents(list);
    } catch {
      // Fallback to local filter from app store
      const all = (activeStudents?.length ? activeStudents : appStudents) || [];
      const lower = q.toLowerCase();
      const filtered = all.filter(s =>
        (s.studentName && s.studentName.toLowerCase().includes(lower)) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(lower))
      ).slice(0, 10);
      setStudents(filtered.map(s => ({ ...s, _id: s._id || '' } as Student)));
    } finally {
      setSearchLoading(false);
    }
  }, [activeStudents, appStudents]);

  useEffect(() => {
    const timer = setTimeout(() => searchStudents(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStudents]);

  const loadRecords = useCallback(async (studentId: string) => {
    setRecordsLoading(true);
    try {
      const data = await apiFetch(`${BASE}/student/${studentId}`);
      const list = Array.isArray(data) ? data : (data.data || []);
      setRecords(list);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
    setStudents([]);
    setSearchQuery(studentDisplayName(s));
    loadRecords(s._id);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Student Counseling</h2>
        {selectedStudent && (
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            + New Recommendation
          </button>
        )}
      </div>

      {/* Student Search */}
      <div className="relative mb-6">
        <input
          type="text"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
          placeholder="Search student by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Searching...</span>
        )}
        {students.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {students.map((s) => (
              <li
                key={s._id}
                className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 text-sm text-gray-700 flex items-center justify-between"
                onClick={() => handleSelectStudent(s)}
              >
                <span className="font-medium">{studentDisplayName(s)}</span>
                {studentDisplayCode(s) && <span className="text-xs text-gray-400">{studentDisplayCode(s)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Records List */}
      {selectedStudent && (
        <div>
          <div className="text-sm text-gray-500 mb-3">
            Showing counseling records for <span className="font-semibold text-gray-700">{studentDisplayName(selectedStudent)}</span>
          </div>
          {recordsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No counseling records found for this student.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div
                  key={r._id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition"
                  onClick={() => setSelectedRecord(r)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={r.type} />
                      <StatusBadge status={r.status} />
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{r.summary}</p>
                  {r.supportPlan.length > 0 && <MilestoneProgress milestones={r.supportPlan} />}
                  {r.parentConsentGiven && (
                    <span className="mt-2 inline-block text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Parent Consent Given</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNewModal && selectedStudent && (
        <NewRecordModal
          studentId={selectedStudent._id}
          onClose={() => setShowNewModal(false)}
          onCreated={() => loadRecords(selectedStudent._id)}
        />
      )}

      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedRecord(null)}
          onUpdated={() => {
            setSelectedRecord(null);
            if (selectedStudent) loadRecords(selectedStudent._id);
          }}
        />
      )}
    </div>
  );
}

// ---- Main Component ----
export default function Counseling() {
  // Read role from localStorage or a global context
  const userRole: string = (localStorage.getItem('userRole') || '').toUpperCase();
  const userId: string = localStorage.getItem('userId') || '';

  if (userRole === 'PARENT' || userRole === 'parent') {
    return <ParentView />;
  }

  return <AdminTeacherView currentUserId={userId} currentUserRole={userRole} />;
}
