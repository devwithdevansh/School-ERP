import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student { _id: string; name: string; rollNo?: string }
interface Section { _id: string; className: string; division: string; students: Student[] }
interface ConceptTag {
  _id: string;
  conceptName: string;
  chapterName: string;
  chapterNumber: number;
  subjectId: string;
}
interface TrendPoint { examId: string; date: string; masteryPct: number }
interface MasteryGroup {
  _id: string;
  conceptTag: ConceptTag;
  avgMasteryPct: number;
  trend: TrendPoint[];
}
interface Gap {
  _id: string;
  conceptTag: ConceptTag;
  avgMasteryPct: number;
}
interface Resource { title: string; url: string; type: 'link' | 'note' | 'exercise' }
interface Plan {
  _id: string;
  conceptTagId: ConceptTag;
  description: string;
  resources: Resource[];
  targetDate: string;
  status: 'active' | 'completed' | 'cancelled';
  completedAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const masteryColor = (pct: number): string => {
  if (pct < 40) return '#ef4444';     // red
  if (pct < 60) return '#f97316';     // orange
  if (pct < 80) return '#eab308';     // yellow
  return '#22c55e';                    // green
};

const masteryBg = (pct: number): string => {
  if (pct < 40) return '#fef2f2';
  if (pct < 60) return '#fff7ed';
  if (pct < 80) return '#fefce8';
  return '#f0fdf4';
};

const BASE = '/api/v1/academic-intelligence';

// ─── Sub-components ───────────────────────────────────────────────────────────

const MasteryCell: React.FC<{ pct: number }> = ({ pct }) => (
  <td
    style={{
      background: masteryBg(pct),
      color: masteryColor(pct),
      fontWeight: 600,
      textAlign: 'center',
      padding: '6px 10px',
      borderRadius: 4,
      minWidth: 60,
      border: '1px solid #e5e7eb',
    }}
  >
    {pct.toFixed(1)}%
  </td>
);

const MasteryBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div
      style={{
        flex: 1,
        height: 10,
        background: '#e5e7eb',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(pct, 100)}%`,
          height: '100%',
          background: masteryColor(pct),
          borderRadius: 999,
          transition: 'width 0.4s',
        }}
      />
    </div>
    <span style={{ color: masteryColor(pct), fontWeight: 600, fontSize: 13, minWidth: 44 }}>
      {pct.toFixed(1)}%
    </span>
  </div>
);

// Inline plan creation form shown inside a gap card
const InlinePlanForm: React.FC<{
  studentId: string;
  conceptTagId: string;
  onCreated: () => void;
  onCancel: () => void;
}> = ({ studentId, conceptTagId, onCreated, onCancel }) => {
  const [desc, setDesc] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceType, setResourceType] = useState<'link' | 'note' | 'exercise'>('link');
  const [resources, setResources] = useState<Resource[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addResource = () => {
    if (!resourceTitle || !resourceUrl) return;
    setResources((prev) => [...prev, { title: resourceTitle, url: resourceUrl, type: resourceType }]);
    setResourceTitle(''); setResourceUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !targetDate) return setError('Description and target date are required.');
    setSaving(true); setError('');
    try {
      await axios.post(`${BASE}/plans`, { studentId, conceptTagId, description: desc, resources, targetDate });
      onCreated();
    } catch {
      setError('Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)}
          maxLength={1500} rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Describe the improvement plan..."
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Target Date</label>
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={labelStyle}>Add Resource</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input placeholder="Title" value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input placeholder="URL" value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value as 'link' | 'note' | 'exercise')} style={inputStyle}>
            <option value="link">Link</option>
            <option value="note">Note</option>
            <option value="exercise">Exercise</option>
          </select>
          <button type="button" onClick={addResource} style={secondaryBtnStyle}>+ Add</button>
        </div>
        {resources.map((r, i) => (
          <div key={i} style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            [{r.type}] {r.title} — {r.url}
            <button type="button" onClick={() => setResources(prev => prev.filter((_, j) => j !== i))} style={{ marginLeft: 6, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        ))}
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 6 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={primaryBtnStyle}>{saving ? 'Saving…' : 'Create Plan'}</button>
        <button type="button" onClick={onCancel} style={secondaryBtnStyle}>Cancel</button>
      </div>
    </form>
  );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const MasteryHeatmap: React.FC<{ studentId: string; subjects: { _id: string; name: string }[] }> = ({ studentId, subjects }) => {
  const [subjectId, setSubjectId] = useState('');
  const [mastery, setMastery] = useState<MasteryGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE}/mastery/student/${studentId}`, { params: { subjectId } });
      setMastery(data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [studentId, subjectId]);

  useEffect(() => { load(); }, [load]);

  // Collect all unique exam ids across all concepts for column headers
  const examIds = Array.from(new Set(mastery.flatMap((m) => m.trend.map((t) => t.examId))));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Subject:</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={inputStyle}>
          <option value="">— select —</option>
          {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {loading && <div style={loaderStyle}>Loading…</div>}

      {!loading && mastery.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={thStyle}>Ch.</th>
                <th style={thStyle}>Concept</th>
                <th style={thStyle}>Avg %</th>
                {examIds.map((eid) => (
                  <th key={eid} style={thStyle}>Exam {eid.slice(-4)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mastery.map((m) => {
                const trendMap = new Map(m.trend.map((t) => [t.examId, t.masteryPct]));
                return (
                  <tr key={m._id}>
                    <td style={tdStyle}>{m.conceptTag.chapterNumber}</td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{m.conceptTag.conceptName}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{m.conceptTag.chapterName}</div>
                    </td>
                    <MasteryCell pct={m.avgMasteryPct} />
                    {examIds.map((eid) => {
                      const pct = trendMap.get(eid);
                      return pct !== undefined
                        ? <MasteryCell key={eid} pct={pct} />
                        : <td key={eid} style={{ ...tdStyle, color: '#9ca3af', textAlign: 'center' }}>—</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && mastery.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Trend Chart</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mastery.map((m) => ({ name: m.conceptTag.conceptName.slice(0, 14), avg: parseFloat(m.avgMasteryPct.toFixed(1)) }))}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {mastery.map((m, i) => <Cell key={i} fill={masteryColor(m.avgMasteryPct)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && mastery.length === 0 && subjectId && (
        <div style={{ color: '#6b7280', marginTop: 20 }}>No mastery data found for this subject.</div>
      )}
    </div>
  );
};

const LearningGaps: React.FC<{ studentId: string; onPlanCreated: () => void }> = ({ studentId, onPlanCreated }) => {
  const [threshold, setThreshold] = useState(60);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(false);
  const [openPlanFor, setOpenPlanFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE}/gaps/student/${studentId}`, { params: { threshold } });
      setGaps(data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [studentId, threshold]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Threshold:</label>
        <input
          type="number" min={0} max={100} value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          style={{ ...inputStyle, width: 80 }}
        />
        <span style={{ fontSize: 13, color: '#6b7280' }}>% (concepts below this are gaps)</span>
      </div>

      {loading && <div style={loaderStyle}>Loading gaps…</div>}

      {!loading && gaps.length === 0 && (
        <div style={{ color: '#22c55e', fontWeight: 600 }}>🎉 No learning gaps found below {threshold}%!</div>
      )}

      {gaps.map((g) => (
        <div key={g._id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{g.conceptTag.conceptName}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Ch. {g.conceptTag.chapterNumber} · {g.conceptTag.chapterName}</div>
            </div>
            <button
              style={primaryBtnStyle}
              onClick={() => setOpenPlanFor((prev) => (prev === g._id ? null : g._id))}
            >
              {openPlanFor === g._id ? 'Cancel' : '+ Create Improvement Plan'}
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <MasteryBar pct={g.avgMasteryPct} />
          </div>
          {openPlanFor === g._id && (
            <InlinePlanForm
              studentId={studentId}
              conceptTagId={g.conceptTag._id}
              onCreated={() => { setOpenPlanFor(null); onPlanCreated(); load(); }}
              onCancel={() => setOpenPlanFor(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const ImprovementPlansTab: React.FC<{ studentId: string; refresh: number }> = ({ studentId, refresh }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BASE}/plans/student/${studentId}`);
      setPlans(data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load, refresh]);

  const updateStatus = async (id: string, status: 'completed' | 'cancelled') => {
    await axios.patch(`${BASE}/plans/${id}`, { status });
    load();
  };

  const badgeColor = (s: string) =>
    s === 'active' ? '#3b82f6' : s === 'completed' ? '#22c55e' : '#9ca3af';

  return (
    <div>
      {loading && <div style={loaderStyle}>Loading plans…</div>}
      {!loading && plans.length === 0 && (
        <div style={{ color: '#6b7280' }}>No active improvement plans.</div>
      )}
      {plans.map((p) => (
        <div key={p._id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {(p.conceptTagId as unknown as ConceptTag)?.conceptName ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Ch. {(p.conceptTagId as unknown as ConceptTag)?.chapterNumber} · {(p.conceptTagId as unknown as ConceptTag)?.chapterName}
              </div>
            </div>
            <span style={{ background: badgeColor(p.status), color: '#fff', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
              {p.status}
            </span>
          </div>
          <p style={{ marginTop: 8, fontSize: 14, color: '#374151' }}>{p.description}</p>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Target: {new Date(p.targetDate).toLocaleDateString()}
          </div>
          {p.resources.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Resources:</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {p.resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                      {r.title}
                    </a>{' '}
                    <span style={{ color: '#9ca3af', fontSize: 11 }}>[{r.type}]</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {p.status === 'active' && (
              <>
                <button onClick={() => updateStatus(p._id, 'completed')} style={primaryBtnStyle}>Mark Completed</button>
                <button onClick={() => updateStatus(p._id, 'cancelled')} style={secondaryBtnStyle}>Cancel Plan</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AcademicIntelligence: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<{ _id: string; name: string }[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [activeTab, setActiveTab] = useState<'heatmap' | 'gaps' | 'plans'>('heatmap');
  const [planRefresh, setPlanRefresh] = useState(0);
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    const fetchMeta = async () => {
      setLoadingMeta(true);
      try {
        const [secRes, subRes] = await Promise.all([
          axios.get('/api/v1/sections?includeStudents=true'),
          axios.get('/api/v1/subjects'),
        ]);
        setSections(secRes.data.data ?? secRes.data);
        setSubjects(subRes.data.data ?? subRes.data);
      } catch { /* ignore */ } finally { setLoadingMeta(false); }
    };
    fetchMeta();
  }, []);

  const currentSection = sections.find((s) => s._id === selectedSection);
  const students = currentSection?.students ?? [];

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: '#111827' }}>
        📊 Academic Intelligence
      </h2>

      {/* ── Selectors ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
        {loadingMeta ? (
          <span style={{ color: '#6b7280' }}>Loading classes…</span>
        ) : (
          <>
            <div>
              <label style={labelStyle}>Class & Division</label>
              <select value={selectedSection} onChange={(e) => { setSelectedSection(e.target.value); setSelectedStudent(''); }} style={inputStyle}>
                <option value="">— select class —</option>
                {sections.map((s) => (
                  <option key={s._id} value={s._id}>{s.className} - {s.division}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Student</label>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} style={inputStyle} disabled={!selectedSection}>
                <option value="">— select student —</option>
                {students.map((st) => (
                  <option key={st._id} value={st._id}>{st.name}{st.rollNo ? ` (${st.rollNo})` : ''}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {!selectedStudent && (
        <div style={{ color: '#9ca3af', fontSize: 14 }}>Please select a class and student to view academic intelligence.</div>
      )}

      {selectedStudent && (
        <>
          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
            {(['heatmap', 'gaps', 'plans'] as const).map((tab) => {
              const labels: Record<string, string> = { heatmap: '🗺 Mastery Heatmap', gaps: '⚠️ Learning Gaps', plans: '📋 Improvement Plans' };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: activeTab === tab ? 700 : 500,
                    color: activeTab === tab ? '#3b82f6' : '#6b7280',
                    borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                    marginBottom: -2,
                    fontSize: 14,
                    transition: 'all 0.2s',
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* ── Tab Content ── */}
          {activeTab === 'heatmap' && (
            <MasteryHeatmap studentId={selectedStudent} subjects={subjects} />
          )}
          {activeTab === 'gaps' && (
            <LearningGaps studentId={selectedStudent} onPlanCreated={() => setPlanRefresh((n) => n + 1)} />
          )}
          {activeTab === 'plans' && (
            <ImprovementPlansTab studentId={selectedStudent} refresh={planRefresh} />
          )}
        </>
      )}
    </div>
  );
};

export default AcademicIntelligence;

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
  background: '#fff',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 16,
  marginBottom: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const loaderStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: 14,
  padding: 20,
  textAlign: 'center',
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 13,
  color: '#374151',
  border: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #e5e7eb',
  fontSize: 13,
};
