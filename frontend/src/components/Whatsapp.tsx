import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../store';
import {
  MessageSquare, Send, Users, BookOpen, User,
  CheckCircle, AlertTriangle, Clock, RefreshCw, Trash2
} from 'lucide-react';
import { brand } from '../config/brand';

// ─── Types ─────────────────────────────────────────────────
interface SentWhatsappMessage {
  _id: string;
  templateName: string;
  body: string;
  targetType: 'ALL' | 'CLASS' | 'PARENT' | 'STUDENT';
  targetFilter: Record<string, string>;
  targetParentIds: string[];
  successCount: number;
  failureCount: number;
  deliveryStatus: 'PENDING' | 'SENT' | 'PARTIAL_FAIL' | 'FAILED' | 'NO_NUMBERS';
  sentBy: { name: string; role: string } | null;
  createdAt: string;
}

interface FeeStructureOption {
  standard: string;
  medium: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const DeliveryBadge: React.FC<{ status: SentWhatsappMessage['deliveryStatus']; success: number; fail: number }> = ({
  status, success, fail
}) => {
  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    SENT:         { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="h-3 w-3" />, label: `Sent (${success})` },
    PARTIAL_FAIL: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle className="h-3 w-3" />, label: `Partial (${success} ok, ${fail} fail)` },
    FAILED:       { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'Failed' },
    NO_NUMBERS:   { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <AlertTriangle className="h-3 w-3" />, label: 'No Numbers' },
    PENDING:      { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <Clock className="h-3 w-3" />, label: 'Pending' },
  };
  const cfg = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const Whatsapp: React.FC = () => {
  const { authFetch, feeStructures, academicYears, students, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // ── Compose state ──────────────────────────────────────────────────────────
  const [templateName, setTemplateName] = useState('custom_message');
  const [language, setLanguage] = useState<'en' | 'gu'>('en');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
  const [history, setHistory] = useState<SentWhatsappMessage[]>([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Unique class options from active fee structures
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
      const res = await authFetch(`/api/v1/whatsapp?page=${page}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setHistory(data);
        setHistTotal(json.meta?.total || 0);
        setHistPage(page);
      }
    } catch (e) {
      console.error('Failed to load WhatsApp history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory(1);
  }, [activeTab, loadHistory]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this message from history?')) return;
    try {
      const res = await authFetch(`/api/v1/whatsapp/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (history.length === 1 && histPage > 1) {
          loadHistory(histPage - 1);
        } else {
          loadHistory(histPage);
        }
      } else {
        const json = await res.json();
        alert(json.message || 'Failed to delete message');
      }
    } catch (e) {
      alert('Network error while deleting');
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await authFetch('/api/v1/upload/image', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const json = await res.json();
        setImageUrl(json.url);
      } else {
        const errorJson = await res.json();
        alert(`Image upload failed: ${errorJson.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Upload Error', err);
      alert('Network error while uploading image');
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSend = async () => {
    if (templateName !== 'fee_reminder' && templateName !== 'app_announcement' && templateName !== 'account_credentials' && templateName !== 'school_holiday_image' && !body.trim()) return;
    setIsSending(true);
    setSendResult(null);
    try {
      const payload: any = { 
        templateName, 
        language,
        body: (templateName === 'fee_reminder' || templateName === 'app_announcement' || templateName === 'account_credentials' || templateName === 'school_holiday_image') ? templateName : body.trim(), 
        targetType,
        imageUrl
      };
      if (targetType === 'CLASS') {
        payload.targetFilter = { standard: selectedClass.standard, medium: selectedClass.medium };
      } else if (targetType === 'PARENT') {
        // If they enter a parent ID, convert it to array for the backend
        payload.parentIds = [parentSearch.trim()];
      } else if (targetType === 'STUDENT') {
        payload.targetFilter = { 
          student: selectedStudentForMsg?._id || selectedStudentForMsg?.id,
          studentName: selectedStudentForMsg?.studentName
        };
        const pId = selectedStudentForMsg?.parentId;
        payload.parentIds = pId ? [typeof pId === 'object' ? pId._id || pId.id : pId] : [];
      }

      const res = await authFetch('/api/v1/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        setSendResult({
          success: true,
          message: `✅ Message queued for delivery. Check history for status.`,
        });
        setBody(''); setParentSearch(''); setStudentSearchQuery(''); setSelectedStudentForMsg(null);
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

  // Templates that don't need a body
  const isBodylessTemplate = templateName === 'fee_reminder' || templateName === 'app_announcement' || templateName === 'account_credentials' || templateName === 'school_holiday_image';

  const canSend = (templateName === 'school_holiday_image' ? imageUrl.trim().length > 0 : isBodylessTemplate) || body.trim().length > 0;

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
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">WhatsApp Messaging</h1>
            <p className="text-xs text-slate-500">Send WhatsApp messages directly to parents</p>
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
              <h2 className="font-bold text-slate-800 text-sm">Compose Message</h2>

              {/* Template */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp Template <span className="text-red-500">*</span></label>
                <select
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                >
                  <option value="custom_message">Custom Message (Requires 24h window)</option>
                  <option value="fee_reminder">Fee Reminder (Auto-calculates due amounts)</option>
                  <option value="app_announcement">App Announcement (New Software)</option>
                  <option value="account_credentials">Account Credentials (Sends login password via WhatsApp)</option>
                  <option value="school_holiday_image">School Holiday (Image Header)</option>
                  <option value="payment_receipt">Payment Receipt Template</option>
                </select>
                {templateName === 'fee_reminder' ? (
                  <p className="text-[10px] text-amber-600 mt-1">
                    <strong>Note:</strong> Fee Reminders automatically fetch the parent's name, student name, standard, and total pending fees. <strong>Parents with ₹0 due will be skipped automatically.</strong>
                  </p>
                ) : templateName === 'account_credentials' ? (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    🔑 <strong>Account Credentials:</strong> Sends each parent their login ID (registered mobile number) and generated password via WhatsApp Authentication Template. Password is derived from their phone number automatically.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">Pre-approved templates bypass the 24-hour rule.</p>
                )}
              </div>

              {/* Image Upload */}
              {templateName === 'school_holiday_image' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Image <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {isUploadingImage && <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Uploading image to cloud...</p>}
                  {!isUploadingImage && imageUrl && <p className="text-[10px] text-emerald-600 mt-1">✅ Image uploaded successfully</p>}
                  {!isUploadingImage && !imageUrl && <p className="text-[10px] text-slate-400 mt-1">Please select an image file to upload.</p>}
                </div>
              )}

              {/* Language */}
              {(templateName === 'fee_reminder' || templateName === 'app_announcement') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Language</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${
                        language === 'en'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('gu')}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${
                        language === 'gu'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      Gujarati
                    </button>
                  </div>
                </div>
              )}

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Message Body {templateName === 'custom_message' && <span className="text-red-500">*</span>}</label>
                <textarea
                  id="notif-body"
                  placeholder={isBodylessTemplate ? 'Body text is ignored. The server will dynamically generate the message using Meta templates.' : 'Write your WhatsApp message here...'}
                  value={isBodylessTemplate ? '' : body}
                  onChange={e => setBody(e.target.value)}
                  disabled={isBodylessTemplate}
                  maxLength={1000}
                  rows={5}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none disabled:opacity-50 disabled:bg-slate-100"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{body.length}/1000</p>
              </div>

              {/* Target Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Send to</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {([
                    { id: 'ALL', label: 'All Parents', icon: <Users className="h-4 w-4" />, desc: 'Every parent' },
                    { id: 'CLASS', label: 'By Class', icon: <BookOpen className="h-4 w-4" />, desc: 'Std + Medium' },
                    { id: 'STUDENT', label: 'By Student', icon: <User className="h-4 w-4" />, desc: 'Search name' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTargetType(opt.id as any)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                        targetType === opt.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className={`${targetType === opt.id ? 'text-emerald-600' : 'text-slate-400'}`}>{opt.icon}</div>
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
                    value={`${selectedClass.standard}|${selectedClass.medium}`}
                    onChange={e => {
                      const [standard, medium] = e.target.value.split('|');
                      setSelectedClass({ standard, medium });
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                    type="text"
                    placeholder="MongoDB Parent _id"
                    value={parentSearch}
                    onChange={e => setParentSearch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div>
                        <div className="text-sm font-semibold text-emerald-800">{selectedStudentForMsg.studentName}</div>
                        <div className="text-[10px] text-emerald-600">Parent: {selectedStudentForMsg.parentMobile || 'No Phone'}</div>
                      </div>
                      <button 
                        onClick={() => { setSelectedStudentForMsg(null); setStudentSearchQuery(''); }}
                        className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 bg-emerald-100 rounded-lg"
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
            </div>
          </div>

          {/* Right: Preview & Send */}
          <div className="w-[300px] flex flex-col gap-5">
            {/* Phone Preview Mockup */}
            <div className="bg-[#EFEAE2] rounded-3xl border-8 border-slate-800 shadow-xl overflow-hidden flex flex-col h-[400px]">
              <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  <img src={brand.logo} alt="School" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">{brand.schoolName}</p>
                  <p className="text-[10px] opacity-80">Business Account</p>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover">
                {templateName === 'fee_reminder' ? (
                  <div className="bg-white rounded-lg rounded-tl-none p-2 mb-4 shadow-sm inline-block max-w-[85%] relative">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                      {language === 'gu' ? (
                        <>
                          📢 ફી બાકી અંગે સૂચના{"\n\n"}
                          માનનીય વાલીશ્રી,{"\n\n"}
                          આપને વિનમ્ર યાદ અપાવવામાં આવે છે કે નીચે દર્શાવેલ વિદ્યાર્થીની શાળાની ફી હજુ સુધી ભરવામાં આવી નથી.{"\n\n"}
                          વિદ્યાર્થીનું નામ: Jane Doe{"\n"}
                          બાકી શિક્ષણ ફી: Term 1 + June to July (₹2000){"\n"}
                          બાકી ટ્રાન્સપોર્ટ ફી: June to July (₹1000){"\n"}
                          કુલ બાકી ફીની રકમ: ₹12000{"\n\n"}
                          આપને વિનંતી છે કે બાકી ફી વહેલી તકે શાળાના કાર્યાલયમાં જમા કરાવી આપશો જેથી વિદ્યાર્થીના શૈક્ષણિક કાર્યમાં કોઈ વિક્ષેપ ન આવે.{"\n\n"}
                          જો ફી પહેલેથી જ ભરેલ હોય, તો કૃપા કરીને આ સૂચનાને અવગણશો.{"\n\n"}
                          આભાર સહ,{"\n"}{brand.schoolName}
                        </>
                      ) : (
                        <>
                          📢 Fee Due Notice{"\n\n"}
                          Respected Parent,{"\n\n"}
                          This is a gentle reminder that the school fee for the student mentioned below has not been paid yet.{"\n\n"}
                          Student Name: Jane Doe{"\n"}
                          Pending Education Fees: Term 1 + June to July (₹2000){"\n"}
                          Pending Transport Fees: June to July (₹1000){"\n"}
                          Total Pending Fee Amount: ₹12000{"\n\n"}
                          You are requested to pay the pending fee at the school office at your earliest convenience so that the student's academic progress is not disrupted.{"\n\n"}
                          If the fee has already been paid, please ignore this notice.{"\n\n"}
                          Thank you,{"\n"}{brand.schoolName}
                        </>
                      )}
                    </p>
                    <div className="text-[9px] text-slate-400 mt-1 flex justify-end items-center gap-1">
                      <span>Now</span>
                      <CheckCircle className="h-3 w-3 text-slate-300" />
                    </div>
                  </div>
                ) : templateName === 'app_announcement' ? (
                  <div className="bg-white rounded-lg rounded-tl-none p-2 mb-4 shadow-sm inline-block max-w-[85%] relative">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                      {language === 'gu' ? (
                        <>
                          📢 મહત્વપૂર્ણ સૂચના – નવું સોફ્ટવેર{"\n\n"}
                          માનનીય વાલીશ્રી,{"\n\n"}
                          શાળાની ફી સંબંધિત માહિતી હવે નવા સોફ્ટવેર દ્વારા ઉપલબ્ધ થશે.{"\n\n"}
                          વાલીઓને વિનંતી છે કે આપેલ લિંકનો ઉપયોગ કરીને સોફ્ટવેર ડાઉનલોડ કરો.{"\n\n"}
                          આભાર સહ,{"\n"}{brand.schoolName}
                        </>
                      ) : (
                        <>
                          📢 Important Notice – New Software{"\n\n"}
                          Dear Parents,{"\n\n"}
                          The school’s fee-related information will now be available through the new software.{"\n\n"}
                          Parents are requested to download the software using the given link.{"\n\n"}
                          Thank you,{"\n"}{brand.schoolName}
                        </>
                      )}
                    </p>
                    <div className="text-[9px] text-slate-400 mt-1 flex justify-end items-center gap-1">
                      <span>Now</span>
                      <CheckCircle className="h-3 w-3 text-slate-300" />
                    </div>
                  </div>
                ) : templateName === 'school_holiday_image' ? (
                  <div className="bg-white rounded-lg rounded-tl-none p-2 mb-4 shadow-sm inline-block max-w-[85%] relative">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Holiday" className="w-full h-auto rounded-md mb-2 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-slate-100 flex flex-col items-center justify-center rounded-md mb-2 border border-slate-200">
                        {isUploadingImage ? <RefreshCw className="h-5 w-5 animate-spin text-emerald-500 mb-2" /> : null}
                        <span className="text-xs text-slate-400">{isUploadingImage ? 'Uploading...' : 'Image Preview'}</span>
                      </div>
                    )}
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                      thank you
                    </p>
                    <div className="text-[9px] text-slate-400 mt-1 flex justify-end items-center gap-1">
                      <span>Now</span>
                      <CheckCircle className="h-3 w-3 text-slate-300" />
                    </div>
                  </div>
                ) : body ? (
                  <div className="bg-white rounded-lg rounded-tl-none p-2 mb-4 shadow-sm inline-block max-w-[85%] relative">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words">{body}</p>
                    <div className="text-[9px] text-slate-400 mt-1 flex justify-end items-center gap-1">
                      <span>Now</span>
                      <CheckCircle className="h-3 w-3 text-slate-300" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-slate-500 bg-white/80 px-3 py-1 rounded-full">Type a message to preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {sendResult && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  sendResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {sendResult.success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                  <span>{sendResult.message}</span>
                </div>
              )}

              {showConfirm ? (
                <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm space-y-3">
                  <p className="text-xs font-semibold text-slate-700 text-center">Ready to send to {targetLabel}?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={isSending}
                      className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={isSending}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send Now
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!canSend || isSending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  <Send className="h-4 w-4" />
                  Review & Send
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <h2 className="font-bold text-slate-800 text-sm">WhatsApp History</h2>
            <button
              onClick={() => loadHistory(histPage)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin text-emerald-500' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {isLoadingHistory && history.length === 0 ? (
              <div className="flex justify-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-emerald-500" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No WhatsApp messages sent yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-5xl mx-auto">
                {history.map((msg) => (
                  <div key={msg._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">{msg.templateName}</span>
                        <span className="text-xs text-slate-400 border-l pl-2">{formatDate(msg.createdAt)}</span>
                      </div>
                      <DeliveryBadge status={msg.deliveryStatus} success={msg.successCount} fail={msg.failureCount} />
                    </div>

                    {/* Content */}
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                      {msg.body}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Target: <span className="font-semibold text-slate-700">{msg.targetType}</span>
                        </span>
                        {msg.targetType === 'CLASS' && msg.targetFilter && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            Class: <span className="font-semibold text-slate-700">Std {msg.targetFilter.standard} {msg.targetFilter.medium}</span>
                          </span>
                        )}
                        {msg.targetType === 'STUDENT' && msg.targetFilter && msg.targetFilter.studentName && (
                          <span className="flex items-center gap-1 text-slate-600">
                            (Student: <span className="font-semibold text-slate-700">{msg.targetFilter.studentName}</span>)
                          </span>
                        )}
                        {msg.targetType === 'PARENT' && (
                          <span className="flex items-center gap-1 text-slate-600">
                            (Parent Specific)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Sent by: <span className="font-medium text-slate-700">{msg.sentBy?.name || 'Unknown'}</span>
                        </div>
                        {currentUser?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(msg._id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete from history"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {histTotal > 20 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-slate-500">
                      Showing {(histPage - 1) * 20 + 1} to {Math.min(histPage * 20, histTotal)} of {histTotal}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadHistory(histPage - 1)}
                        disabled={histPage === 1}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-600 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => loadHistory(histPage + 1)}
                        disabled={histPage * 20 >= histTotal}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-600 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
