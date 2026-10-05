import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../store';
import { MessageCircle, Send, Search, Plus, X, Loader2, ChevronDown, ChevronRight } from './icons';

interface ConversationSummary {
  _id: string;
  parentId: { _id: string; parentName: string; primaryMobileNumber: string } | string;
  staffId: { _id: string; name: string; role: string } | string | null;
  studentId: { _id: string; studentName: string } | string | null;
  subject: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastSenderRole: 'parent' | 'staff' | null;
  unreadCountStaff: number;
}

interface ChatMessage {
  _id: string;
  senderRole: 'parent' | 'staff';
  text: string;
  createdAt: string;
}

const POLL_MS = 15000;

export const Messages: React.FC = () => {
  const { authFetch, students } = useApp();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // Threads with a class/subject teacher live in their own section, apart from
  // the parent-facing office/staff threads.
  const [section, setSection] = useState<'STUDENTS' | 'TEACHERS'>('STUDENTS');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await authFetch('/api/v1/chat/conversations');
      if (res.ok) {
        const json = await res.json();
        setConversations(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async (id: string) => {
    setLoadingMessages(true);
    try {
      const res = await authFetch(`/api/v1/chat/conversations/${id}/messages`);
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data || []);
      }
      await authFetch(`/api/v1/chat/conversations/${id}/read`, { method: 'POST' });
      fetchConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeId) fetchMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll the open thread too, so a reply shows up without re-clicking it.
  useEffect(() => {
    if (!activeId) return;
    const interval = setInterval(() => fetchMessages(activeId), POLL_MS);
    return () => clearInterval(interval);
  }, [activeId]);

  const handleSend = async () => {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      const res = await authFetch(`/api/v1/chat/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft.trim() }),
      });
      if (res.ok) {
        setDraft('');
        fetchMessages(activeId);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to send message');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const startConversation = async (studentId: string, parentId: string) => {
    try {
      const res = await authFetch('/api/v1/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, studentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to start conversation');
      setShowNewModal(false);
      setStudentSearch('');
      await fetchConversations();
      setActiveId(json.data._id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const withParent = students.filter(s => s.parentId);
    if (!q) return withParent.slice(0, 30);
    return withParent
      .filter(s => s.studentName.toLowerCase().includes(q) || s.parentName?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [studentSearch, students]);

  const active = conversations.find(c => c._id === activeId) || null;
  const nameOf = (c: ConversationSummary) =>
    typeof c.parentId === 'object' ? c.parentId.parentName : 'Parent';
  const studentOf = (c: ConversationSummary) =>
    c.studentId && typeof c.studentId === 'object' ? c.studentId.studentName : null;
  // Multiple threads for the same parent+student are legitimate -- a parent
  // can message the office AND a specific teacher separately -- but with
  // nothing distinguishing them in the list they look like accidental
  // duplicates. Label who each thread is actually with.
  const staffOf = (c: ConversationSummary) =>
    c.staffId && typeof c.staffId === 'object' ? c.staffId.name : (c.staffId === null ? 'Office' : null);

  const isTeacherThread = (c: ConversationSummary) =>
    !!c.staffId && typeof c.staffId === 'object' && c.staffId.role === 'TEACHER';
  const sectionStats = useMemo(() => {
    const stat = { STUDENTS: { count: 0, unread: 0 }, TEACHERS: { count: 0, unread: 0 } };
    for (const c of conversations) {
      const k = isTeacherThread(c) ? 'TEACHERS' : 'STUDENTS';
      stat[k].count += 1;
      stat[k].unread += c.unreadCountStaff || 0;
    }
    return stat;
  }, [conversations]);
  const sectionConversations = useMemo(
    () => conversations.filter(c => (section === 'TEACHERS') === isTeacherThread(c)),
    [conversations, section]
  );

  // Group threads by student so a parent's 2-3 separate conversations about the
  // same child (office + individual teachers) sit together instead of looking
  // like unrelated/duplicate entries in a flat list.
  const groupedConversations = useMemo(() => {
    const groups = new Map<string, { key: string; studentName: string | null; threads: ConversationSummary[] }>();
    for (const c of sectionConversations) {
      const sObj = c.studentId && typeof c.studentId === 'object' ? c.studentId : null;
      const key = sObj ? sObj._id : (typeof c.studentId === 'string' ? c.studentId : `no-student-${nameOf(c)}`);
      if (!groups.has(key)) {
        groups.set(key, { key, studentName: sObj ? sObj.studentName : studentOf(c), threads: [] });
      }
      groups.get(key)!.threads.push(c);
    }
    const arr = Array.from(groups.values());
    for (const g of arr) {
      g.threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    }
    arr.sort((a, b) => {
      const aLatest = Math.max(...a.threads.map(t => new Date(t.lastMessageAt).getTime()));
      const bLatest = Math.max(...b.threads.map(t => new Date(t.lastMessageAt).getTime()));
      return bLatest - aLatest;
    });
    return arr;
  }, [sectionConversations]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500">
      <div className="p-6 pb-0 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-blue-500" />
            Messages
          </h2>
          <p className="text-sm text-slate-500 mt-1">Conversations with parents — yours, and unassigned office threads</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Message
        </button>
      </div>

      <div className="flex-1 flex gap-4 p-6 min-h-0">
        {/* Conversation list */}
        <div className="w-80 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 grid grid-cols-2 gap-1 bg-slate-50/60">
            {([
              { key: 'STUDENTS' as const, label: 'Students' },
              { key: 'TEACHERS' as const, label: 'Teachers' },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setSection(t.key)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-colors ${section === t.key ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
                <span className="text-[10px] text-slate-400 font-bold">{sectionStats[t.key].count}</span>
                {sectionStats[t.key].unread > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sectionStats[t.key].unread}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingList ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
            ) : sectionConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                {section === 'TEACHERS' ? 'No conversations with teachers yet.' : 'No conversations with parents yet.'}
              </div>
            ) : (
              groupedConversations.map(group => {
                const isCollapsed = collapsedGroups.has(group.key);
                const groupUnread = group.threads.reduce((sum, t) => sum + (t.unreadCountStaff || 0), 0);
                return (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/70 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wide truncate">
                          {group.studentName || 'General'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold shrink-0">({group.threads.length})</span>
                      </div>
                      {groupUnread > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                          {groupUnread}
                        </span>
                      )}
                    </button>
                    {!isCollapsed && group.threads.map(c => (
                      <button
                        key={c._id}
                        onClick={() => setActiveId(c._id)}
                        className={`w-full text-left pl-6 pr-4 py-3 hover:bg-slate-50 transition-colors border-l-2 ${activeId === c._id ? 'bg-blue-50/60 border-l-blue-500' : 'border-l-transparent'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800 truncate">{nameOf(c)}</span>
                          {c.unreadCountStaff > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                              {c.unreadCountStaff}
                            </span>
                          )}
                        </div>
                        {staffOf(c) && (
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                            {isTeacherThread(c) ? `Teacher · ${staffOf(c)}` : staffOf(c) === 'Office' ? 'Office' : `Staff · ${staffOf(c)}`}
                          </span>
                        )}
                        <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessagePreview || 'No messages yet'}</p>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-slate-100">
                <h4 className="font-bold text-slate-800 text-sm">{nameOf(active)}</h4>
                <p className="text-xs text-slate-500">
                  {studentOf(active) && <>About {studentOf(active)}</>}
                  {studentOf(active) && staffOf(active) && ' · '}
                  {staffOf(active) && <>With {staffOf(active)}</>}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                ) : (
                  messages.map(m => (
                    <div key={m._id} className={`flex ${m.senderRole === 'staff' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.senderRole === 'staff'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      }`}>
                        {m.text}
                        <div className={`text-[10px] mt-1 ${m.senderRole === 'staff' ? 'text-blue-100' : 'text-slate-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="p-4 border-t border-slate-100 flex items-center gap-3">
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Message a parent</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Search by student or parent name…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No students found.</p>
                ) : (
                  filteredStudents.map(s => (
                    <button
                      key={s.id}
                      onClick={() => startConversation(s.id, s.parentId!)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{s.studentName}</div>
                        <div className="text-xs text-slate-500">Std {s.standard}-{s.division} · Parent: {s.parentName}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
