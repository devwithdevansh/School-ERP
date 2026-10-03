// admin-frontend/src/components/Notifications.tsx
// Admin Notification Center — Compose & Send + Sent History tabs.
// Connects to POST /api/v1/notifications/send and GET /api/v1/notifications

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../store';
import {
  Bell, Send, Users, BookOpen, User,
  CheckCircle, AlertTriangle, Clock, RefreshCw, X, Trash2
} from 'lucide-react';
import { brand } from '../config/brand';

const API_BASE = import.meta.env.VITE_API_URL || 'https://linen-weasel-242678.hostingersite.com';

// Suppress unused - kept for potential future use
void API_BASE;

// ─── Types ────────────────────────────────────────────────────────────────────
interface SentNotification {
  _id: string;
  title: string;
  body: string;
  type: string;
  targetType: 'ALL' | 'CLASS' | 'PARENT';
  targetFilter: Record<string, string>;
  targetParentIds: string[];
  successCount: number;
  failureCount: number;
  deliveryStatus: 'PENDING' | 'SENT' | 'PARTIAL_FAIL' | 'FAILED' | 'NO_TOKENS';
  sentBy: { name: string; role: string } | null;
  createdAt: string;
}

interface FeeStructureOption {
  standard: string;
  medium: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const DeliveryBadge: React.FC<{ status: SentNotification['deliveryStatus']; success: number; fail: number }> = ({
  status, success, fail
}) => {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    SENT:         { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="h-3 w-3" />, label: `Sent (${success})` },
    PARTIAL_FAIL: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle className="h-3 w-3" />, label: `Partial (${success} ok, ${fail} fail)` },
    FAILED:       { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Failed' },
    NO_TOKENS:    { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'No Devices' },
    PENDING:      { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock className="h-3 w-3" />, label: 'Pending' },
  };
  const cfg = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const Notifications: React.FC = () => {
  const { authFetch, feeStructures, academicYears, students, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // ── Compose state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'CLASS' | 'PARENT' | 'STUDENT'>('ALL');
  const [selectedClass, setSelectedClass] = useState<{ standard: string; medium: string }>({ standard: '', medium: '' });
  const [parentSearch, setParentSearch] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentForMsg, setSelectedStudentForMsg] = useState<any | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── History state ──────────────────────────────────────────────────────────
  const [history, setHistory] = useState<SentNotification[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Unique class options from active fee structures
  // Only show classes from the currently active academic year
  const activeYear = React.useMemo(() => academicYears.find(y => y.isActive), [academicYears]);
  const classOptions: FeeStructureOption[] = React.useMemo(() => {
    const seen = new Set<string>();
    const opts: FeeStructureOption[] = [];
    const activeFeeStructures = activeYear
      ? feeStructures.filter((fs: any) => fs.academicYear === activeYear.name || !fs.academicYear)
      : feeStructures;
    (activeFeeStructures || []).forEach((fs: any) => {
      const key = `${fs.standard}|${fs.medium}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ standard: fs.standard, medium: fs.medium });
      }
    });
    return opts.sort((a, b) => Number(a.standard) - Number(b.standard) || a.medium.localeCompare(b.medium));
  }, [feeStructures, activeYear]);

  // ── Load history ───────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (page = 1) => {
    setIsLoadingHistory(true);
    try {
      const res = await authFetch(`/api/v1/notifications?page=${page}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        setHistory(data.notifications || []);
        setHistTotal(data.total || 0);
        setHistPage(page);
      }
    } catch (e) {
      console.error('Failed to load notification history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory(1);
  }, [activeTab, loadHistory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification from history?')) return;
    try {
      const res = await authFetch(`/api/v1/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (history.length === 1 && histPage > 1) {
          loadHistory(histPage - 1);
        } else {
          loadHistory(histPage);
        }
      } else {
        const json = await res.json();
        alert(json.message || 'Failed to delete notification');
      }
    } catch (e) {
      alert('Network error while deleting');
    }
  };

  // ── Send notification ──────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);
    setSendResult(null);
    try {
      const payload: any = { title: title.trim(), body: body.trim(), targetType };
      if (targetType === 'CLASS') {
        payload.targetFilter = { standard: selectedClass.standard, medium: selectedClass.medium };
      } else if (targetType === 'PARENT') {
        payload.targetFilter = { parentId: parentSearch.trim() };
      } else if (targetType === 'STUDENT') {
        if (selectedStudentForMsg) {
          payload.targetFilter = { studentId: selectedStudentForMsg._id || selectedStudentForMsg.id };
        }
      }

      const res = await authFetch('/api/v1/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        const d = json.data;
        setSendResult({
          success: true,
          message: `✅ Sent to ${d.successCount ?? 0} device(s). ${d.failureCount ? `${d.failureCount} failed.` : ''}`,
        });
        setTitle(''); setBody(''); setParentSearch(''); setStudentSearchQuery(''); setSelectedStudentForMsg(null);
      } else {
        setSendResult({ success: false, message: json.message || 'Send failed. Please try again.' });
      }
    } catch (e) {
      setSendResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setIsSending(false);
      setShowConfirm(false);
    }
  };

  const targetLabel = targetType === 'ALL' ? 'All Parents'
    : targetType === 'CLASS' ? (selectedClass.standard ? `Std ${selectedClass.standard} ${selectedClass.medium}` : 'Pick a class')
    : targetType === 'STUDENT' ? (selectedStudentForMsg ? `Parent of ${selectedStudentForMsg.studentName}` : 'Specific Student')
    : 'Specific Parent';

  const canSend = title.trim().length > 0 && body.trim().length > 0 &&
    (targetType !== 'CLASS' || (selectedClass.standard && selectedClass.medium)) &&
    (targetType !== 'PARENT' || parentSearch.trim().length > 0) &&
    (targetType !== 'STUDENT' || (selectedStudentForMsg && selectedStudentForMsg.parentId));

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Push Notifications</h1>
            <p className="text-xs text-slate-500">Send real-time alerts to parents via Firebase</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          {(['compose', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'compose' ? 'Compose' : 'Sent History'}
            </button>
          ))}
        </div>
      </div>

      {/* ── COMPOSE TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'compose' && (
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto w-full">
          {/* Left: Compose form */}
          <div className="flex-1 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-slate-800 text-sm">Compose Notification</h2>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
                <input
                  id="notif-title"
                  type="text"
                  placeholder="e.g. Fee Payment Reminder"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{title.length}/100</p>
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Message <span className="text-red-500">*</span></label>
                <textarea
                  id="notif-body"
                  placeholder="Write your notification message here..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  maxLength={500}
                  rows={5}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{body.length}/500</p>
              </div>

              {/* Target Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Send to</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {([
                    { id: 'ALL', label: 'All Parents', icon: <Users className="h-4 w-4" />, desc: 'Every parent' },
                    { id: 'CLASS', label: 'By Class', icon: <BookOpen className="h-4 w-4" />, desc: 'Filter by Std + Medium' },
                    { id: 'STUDENT', label: 'By Student', icon: <User className="h-4 w-4" />, desc: 'Search name' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      id={`target-${opt.id.toLowerCase()}`}
                      onClick={() => setTargetType(opt.id as any)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                        targetType === opt.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className={`${targetType === opt.id ? 'text-blue-600' : 'text-slate-400'}`}>{opt.icon}</div>
                      <span className="font-semibold text-xs">{opt.label}</span>
                      <span className="text-[10px] text-slate-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: Class picker */}
              {targetType === 'CLASS' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Select Class</label>
                  <select
                    id="class-select"
                    value={`${selectedClass.standard}|${selectedClass.medium}`}
                    onChange={e => {
                      const [standard, medium] = e.target.value.split('|');
                      setSelectedClass({ standard, medium });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="|">-- Select Standard & Medium --</option>
                    {classOptions.map(opt => (
                      <option key={`${opt.standard}|${opt.medium}`} value={`${opt.standard}|${opt.medium}`}>
                        Std {opt.standard} — {opt.medium}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional: Parent ID input */}
              {targetType === 'PARENT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Parent ID</label>
                  <input
                    id="parent-id-input"
                    type="text"
                    placeholder="MongoDB Parent _id"
                    value={parentSearch}
                    onChange={e => setParentSearch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              )}

              {/* Conditional: Student search */}
              {targetType === 'STUDENT' && (
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Search Student</label>
                  {!selectedStudentForMsg ? (
                    <div>
                      <input
                        type="text"
                        placeholder="Type student name..."
                        value={studentSearchQuery}
                        onChange={e => setStudentSearchQuery(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      {studentSearchQuery.trim().length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {students.filter((s: any) => (s.studentName || '').toLowerCase().includes(studentSearchQuery.toLowerCase())).slice(0, 5).map((s: any) => (
                            <button
                              key={s._id || s.id}
                              onClick={() => setSelectedStudentForMsg(s)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                            >
                              <div className="font-semibold text-slate-800">{s.studentName}</div>
                              <div className="text-[10px] text-slate-500">Std {s.standard} {s.medium} • {s.parentMobile || 'No Parent Phone'}</div>
                            </button>
                          ))}
                          {students.filter((s: any) => (s.studentName || '').toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                            <div className="px-4 py-3 text-xs text-slate-500 text-center">No students found</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div>
                        <div className="text-sm font-semibold text-blue-800">{selectedStudentForMsg.studentName}</div>
                        <div className="text-[10px] text-blue-600">Parent: {selectedStudentForMsg.parentMobile || 'No Phone'}</div>
                      </div>
                      <button 
                        onClick={() => { setSelectedStudentForMsg(null); setStudentSearchQuery(''); }}
                        className="text-blue-700 hover:text-blue-900 text-xs font-bold px-2 py-1 bg-blue-100 rounded-lg"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  {selectedStudentForMsg && !selectedStudentForMsg.parentId && (
                    <p className="text-[10px] text-red-500 mt-1">This student does not have a linked parent account.</p>
                  )}
                </div>
              )}

              {/* Result banner */}
              {sendResult && (
                <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
                  sendResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {sendResult.success ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span className="font-medium">{sendResult.message}</span>
                  <button onClick={() => setSendResult(null)} className="ml-auto"><X className="h-4 w-4 opacity-50 hover:opacity-100" /></button>
                </div>
              )}

              {/* Send button */}
              <button
                id="send-notification-btn"
                disabled={!canSend || isSending}
                onClick={() => setShowConfirm(true)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  canSend && !isSending
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="h-4 w-4" />
                Send Notification
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-0">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Live Preview</h3>
              <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-yellow-400 rounded-full flex items-center justify-center shrink-0">
                    <Bell className="h-4 w-4 text-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{brand.productName}</p>
                  </div>
                </div>
                {/* Mock phone notification */}
                <div className="bg-white/10 backdrop-blur rounded-xl p-3 overflow-hidden">
                  <p className="font-bold text-white text-sm leading-tight break-words">{title || 'Notification Title'}</p>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed break-words">{body || 'Your notification message will appear here...'}</p>
                </div>
                <div className="pt-1 border-t border-white/10">
                  <p className="text-[10px] text-slate-400">To: <span className="text-slate-300 font-semibold">{targetLabel}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* History header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Sent Notifications</h2>
                <p className="text-xs text-slate-400 mt-0.5">{histTotal} total sent</p>
              </div>
              <button
                onClick={() => loadHistory(histPage)}
                disabled={isLoadingHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-sm">No notifications sent yet</p>
                <p className="text-xs mt-1">Switch to Compose to send your first notification</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map(notif => (
                  <div key={notif._id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-800 text-sm truncate">{notif.title}</p>
                          <DeliveryBadge status={notif.deliveryStatus} success={notif.successCount} fail={notif.failureCount} />
                        </div>
                        <p className="text-slate-500 text-xs mb-2 line-clamp-2">{notif.body}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {notif.targetType === 'ALL' ? 'All Parents'
                                : notif.targetType === 'CLASS' ? `Std ${notif.targetFilter?.standard} ${notif.targetFilter?.medium}`
                                : 'Specific Parent'}
                            </span>
                            {notif.sentBy && <span>By {notif.sentBy.name}</span>}
                            <span>{formatDate(notif.createdAt)}</span>
                          </div>
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => handleDelete(notif._id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete from history"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {histTotal > 20 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">Page {histPage} of {Math.ceil(histTotal / 20)}</p>
                <div className="flex gap-2">
                  <button
                    disabled={histPage <= 1}
                    onClick={() => loadHistory(histPage - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={histPage >= Math.ceil(histTotal / 20)}
                    onClick={() => loadHistory(histPage + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 disabled:opacity-40 hover:bg-slate-200 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ─────────────────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Confirm Send</h3>
                <p className="text-xs text-slate-400">This will send a real push notification</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Title</span>
                <span className="font-semibold text-slate-800 text-xs text-right max-w-[60%]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">To</span>
                <span className="font-semibold text-slate-800 text-xs">{targetLabel}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-send-btn"
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Send Now</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
