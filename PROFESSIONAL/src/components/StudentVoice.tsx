import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { MessageCircle, Plus, Search, ShieldCheck, Check, Clock, X } from './icons';

type VoiceCategory = 'safety' | 'academic' | 'wellbeing' | 'facility' | 'other';
type VoiceStatus = 'submitted' | 'under_review' | 'action_taken' | 'resolved';

interface ThreadEntry {
  by: string;
  byRole: string;
  message: string;
  ts: string;
}

interface VoiceItem {
  _id: string;
  category: VoiceCategory;
  title: string;
  description: string;
  isAnonymous: boolean;
  status: VoiceStatus;
  assignedTo?: { _id: string; name: string; role: string } | null;
  submittedBy?: { _id: string; name: string; role: string } | null;
  studentId?: { _id: string; studentName: string; standard?: string; division?: string } | null;
  thread: ThreadEntry[];
  createdAt: string;
  resolvedAt?: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

const CATEGORY_COLORS: Record<VoiceCategory, string> = {
  safety: 'bg-rose-100 text-rose-700',
  academic: 'bg-indigo-100 text-indigo-700',
  wellbeing: 'bg-emerald-100 text-emerald-700',
  facility: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
};

const STATUS_COLORS: Record<VoiceStatus, string> = {
  submitted: 'bg-orange-100 text-orange-700',
  under_review: 'bg-blue-100 text-blue-700',
  action_taken: 'bg-purple-100 text-purple-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

export const StudentVoice: React.FC = () => {
  const { currentUser, activeStudents, students: appStudents } = useApp();
  const isParent = currentUser?.role === 'parent';
  const availableStudents = useMemo(() => (activeStudents && activeStudents.length > 0 ? activeStudents : appStudents) || [], [activeStudents, appStudents]);

  const [items, setItems] = useState<VoiceItem[]>([]);
  const [staffList, setStaffList] = useState<Array<{ _id: string; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VoiceItem | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [replyText, setReplyText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [formCategory, setFormCategory] = useState<VoiceCategory>('academic');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const endpoint = isParent ? '/api/v1/student-voice/my' : '/api/v1/student-voice/queue';
      const res = await fetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
        if (selected) {
          const updated = json.data.find((x: VoiceItem) => x._id === selected._id);
          if (updated) setSelected(updated);
        }
      }
      if (!isParent) {
        const staffRes = await fetch(`${API_BASE}/api/v1/users`, { headers: getHeaders() });
        const staffJson = await staffRes.json();
        if (staffJson.success && Array.isArray(staffJson.data)) {
          setStaffList(staffJson.data);
        }
      }
    } catch (err) {
      console.error('Failed to load student voice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isParent]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, search]);

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/student-voice`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          category: formCategory,
          title: formTitle.trim(),
          description: formDescription.trim(),
          isAnonymous: formAnonymous,
          studentId: formAnonymous ? undefined : (formStudentId || undefined),
        }),
      });
      if (res.ok) {
        setFormTitle('');
        setFormDescription('');
        setFormStudentId('');
        setFormAnonymous(false);
        setShowNewModal(false);
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    const res = await fetch(`${API_BASE}/api/v1/student-voice/${selected._id}/thread`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message: replyText.trim() }),
    });
    if (res.ok) {
      setReplyText('');
      await loadData();
    }
  };

  const handleStatusChange = async (id: string, status: VoiceStatus) => {
    const res = await fetch(`${API_BASE}/api/v1/student-voice/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) await loadData();
  };

  const handleAssign = async (id: string, assignedTo: string) => {
    if (!assignedTo) return;
    const res = await fetch(`${API_BASE}/api/v1/student-voice/${id}/assign`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ assignedTo }),
    });
    if (res.ok) await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Voice</h1>
          <p className="text-sm text-slate-500">
            {isParent
              ? 'Submit confidential concerns or feedback and track resolution progress.'
              : 'Confidential concern & feedback review queue with resolution tracking.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Submit Concern
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concerns..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          <option value="safety">Safety</option>
          <option value="academic">Academic</option>
          <option value="wellbeing">Wellbeing</option>
          <option value="facility">Facility</option>
          <option value="other">Other</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="action_taken">Action Taken</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading submissions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No concerns found matching your filters.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item._id}
                onClick={() => setSelected(item)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                  selected?._id === item._id
                    ? 'border-indigo-500 bg-indigo-50/30 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${CATEGORY_COLORS[item.category]}`}>
                      {item.category}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[item.status]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    {item.isAnonymous && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        <ShieldCheck className="h-3 w-3" /> Anonymous
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {item.isAnonymous
                      ? 'Identity protected'
                      : item.studentId?.studentName || item.submittedBy?.name || 'Submitted'}
                  </span>
                  <span>
                    {item.assignedTo ? `Assigned: ${item.assignedTo.name}` : 'Unassigned'} · {item.thread.length} replies
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-5">
          {selected ? (
            <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${CATEGORY_COLORS[selected.category]}`}>
                    {selected.category}
                  </span>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{selected.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.description}</p>

              {selected.studentId && !selected.isAnonymous && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Student:</span>
                  <span className="font-bold text-slate-800">
                    {selected.studentId.studentName || (selected.studentId as any).name}
                    {selected.studentId.standard ? ` (Std ${selected.studentId.standard}-${selected.studentId.division || ''})` : ''}
                  </span>
                </div>
              )}

              {!isParent && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                    <select
                      value={selected.status}
                      onChange={(e) => handleStatusChange(selected._id, e.target.value as VoiceStatus)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="action_taken">Action Taken</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Assign To</label>
                    <select
                      value={selected.assignedTo?._id || ''}
                      onChange={(e) => handleAssign(selected._id, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium"
                    >
                      <option value="">Select staff...</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Thread */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Resolution Thread
                </h4>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {selected.thread.length === 0 ? (
                    <p className="text-xs text-slate-400">No replies yet.</p>
                  ) : (
                    selected.thread.map((t, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span className="font-semibold capitalize">{t.byRole}</span>
                          <span>{new Date(t.ts).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700">{t.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleReply}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              Select a submission to view details and resolution thread.
            </div>
          )}
        </div>
      </div>

      {/* Submit Concern Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Submit Concern or Feedback</h2>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as VoiceCategory)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="academic">Academic</option>
                  <option value="safety">Safety</option>
                  <option value="wellbeing">Wellbeing</option>
                  <option value="facility">Facility</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {!formAnonymous && availableStudents.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Related Student (Optional)</label>
                  <select
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">— General / Not specific to one student —</option>
                    {availableStudents.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.studentName}{s.standard ? ` (Std ${s.standard}-${s.division || 'A'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Brief summary of your concern"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Share details confidentially..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAnonymous}
                  onChange={(e) => setFormAnonymous(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Submit anonymously (identity hidden from staff)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
