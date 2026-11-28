import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useApp } from '../store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HomeAddress {
  lat: number;
  lng: number;
  label: string;
}

interface ConsentRecord {
  _id: string;
  studentId: { _id: string; name: string; rollNumber?: string; class?: string; section?: string } | string;
  consentGiven: boolean;
  homeAddress?: HomeAddress;
  homeRadiusMeters: number;
  notifyDelayAfterMinutes: number;
  consentUpdatedAt?: string;
}

interface TripRecord {
  _id: string;
  studentId: { _id: string; name: string; rollNumber?: string; class?: string; section?: string } | string;
  tripType: 'morning' | 'evening';
  status: 'active' | 'arrived' | 'delayed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  expectedArrivalTime?: string;
  date: string;
  lastLocation?: { lat: number; lng: number; updatedAt: string };
}

type Tab = 'today' | 'consent' | 'history';
type StatusFilter = 'all' | 'active' | 'arrived' | 'delayed' | 'cancelled';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const API = '/api/v1/safereach';

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function formatDuration(start?: string, end?: string): string {
  if (!start) return '-';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const mins = Math.round((e - s) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function minutesOverdue(expected?: string): number {
  if (!expected) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(expected).getTime()) / 60000));
}

function getStudentName(s: TripRecord['studentId'] | ConsentRecord['studentId']): string {
  if (typeof s === 'object') {
    return (s as any).studentName || (s as any).name || 'Student';
  }
  return String(s);
}

function getStudentId(s: TripRecord['studentId'] | ConsentRecord['studentId']): string {
  if (typeof s === 'object' && '_id' in s) return s._id;
  return String(s);
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
interface StatusBadgeProps {
  status: TripRecord['status'] | 'none';
  endTime?: string;
  expectedArrivalTime?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, endTime, expectedArrivalTime }) => {
  const base = 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold';

  if (status === 'none') {
    return <span className={`${base} bg-gray-100 text-gray-500`}>No Trip</span>;
  }
  if (status === 'active') {
    return (
      <span className={`${base} bg-blue-100 text-blue-700`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        En Route
      </span>
    );
  }
  if (status === 'arrived') {
    return (
      <span className={`${base} bg-green-100 text-green-700`}>
        ✓ Arrived {endTime ? new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </span>
    );
  }
  if (status === 'delayed') {
    const mins = minutesOverdue(expectedArrivalTime);
    return (
      <span className={`${base} bg-red-100 text-red-700`}>
        ⚠ Delayed {mins > 0 ? `${mins}m` : ''}
      </span>
    );
  }
  if (status === 'cancelled') {
    return <span className={`${base} bg-gray-100 text-gray-500`}>Cancelled</span>;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Start Trip Modal
// ---------------------------------------------------------------------------
interface StartTripModalProps {
  students: Array<{ _id: string; name: string }>;
  academicYearId: string;
  onClose: () => void;
  onStarted: () => void;
}

const StartTripModal: React.FC<StartTripModalProps> = ({ students, academicYearId, onClose, onStarted }) => {
  const [studentId, setStudentId] = useState('');
  const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
  const [expectedArrivalTime, setExpectedArrivalTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!studentId) { setError('Select a student'); return; }
    setLoading(true);
    setError('');
    try {
      await apiFetch('/trip/start', {
        method: 'POST',
        body: JSON.stringify({ studentId, tripType, academicYearId, expectedArrivalTime: expectedArrivalTime || undefined }),
      });
      onStarted();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Start New Trip</h3>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
            >
              <option value="">Select student…</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
            <div className="flex gap-3">
              {(['morning', 'evening'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTripType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tripType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival Time (optional)</label>
            <input
              type="time"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={expectedArrivalTime}
              onChange={e => {
                const [h, m] = e.target.value.split(':');
                const d = new Date();
                d.setHours(Number(h), Number(m), 0, 0);
                setExpectedArrivalTime(d.toISOString());
              }}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Starting…' : 'Start Trip'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Today's Status Tab
// ---------------------------------------------------------------------------
interface TodayTabProps {
  academicYearId: string;
  refreshTick: number;
  onRefresh: () => void;
}

const TodayTab: React.FC<TodayTabProps> = ({ academicYearId, refreshTick, onRefresh }) => {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showStartModal, setShowStartModal] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/trip/today?academicYearId=${academicYearId}`);
      setTrips(Array.isArray(data) ? data : (data.data || []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => { fetchTrips(); }, [fetchTrips, refreshTick]);

  const filtered = trips.filter(t => statusFilter === 'all' || t.status === statusFilter);

  const students = [...new Map(
    trips.map(t => [getStudentId(t.studentId), { _id: getStudentId(t.studentId), name: getStudentName(t.studentId) }])
  ).values()];

  const handleTripAction = async (tripId: string, action: 'arrive' | 'cancel') => {
    try {
      await apiFetch(`/trip/${tripId}/${action}`, { method: 'PATCH' });
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['all', 'active', 'arrived', 'delayed', 'cancelled'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => setShowStartModal(true)}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + Start Trip
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {/* Student cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(trip => (
          <div
            key={trip._id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-800 text-sm leading-tight">
                  {getStudentName(trip.studentId)}
                </p>
                {typeof trip.studentId === 'object' && trip.studentId.class && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {trip.studentId.class}{trip.studentId.section ? ` - ${trip.studentId.section}` : ''}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 capitalize">{trip.tripType}</span>
            </div>
            <StatusBadge status={trip.status} endTime={trip.endTime} expectedArrivalTime={trip.expectedArrivalTime} />
            <div className="mt-2 text-xs text-gray-400">
              Duration: {formatDuration(trip.startTime, trip.endTime)}
            </div>
            {trip.status === 'active' && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleTripAction(trip._id, 'arrive')}
                  className="flex-1 text-xs py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                >
                  ✓ Arrived
                </button>
                <button
                  onClick={() => handleTripAction(trip._id, 'cancel')}
                  className="flex-1 text-xs py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                >
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-12">No trips found for today.</div>
        )}
      </div>

      {showStartModal && (
        <StartTripModal
          students={students}
          academicYearId={academicYearId}
          onClose={() => setShowStartModal(false)}
          onStarted={onRefresh}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Consent Management Tab
// ---------------------------------------------------------------------------
interface ConsentTabProps {
  academicYearId: string;
  students: Array<{ _id: string; name: string }>;
}

const ConsentTab: React.FC<ConsentTabProps> = ({ academicYearId, students }) => {
  const [consents, setConsents] = useState<Record<string, ConsentRecord>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchConsent = useCallback(async (studentId: string) => {
    try {
      const data = await apiFetch(`/consent/${studentId}?academicYearId=${academicYearId}`);
      setConsents(prev => ({ ...prev, [studentId]: (data.data || data) }));
    } catch {
      // 404 means no record yet — ignore
    }
  }, [academicYearId]);

  useEffect(() => {
    setLoading(true);
    Promise.all(students.map(s => fetchConsent(s._id))).finally(() => setLoading(false));
  }, [students, fetchConsent]);

  const handleSave = async (studentId: string, patch: Partial<ConsentRecord>) => {
    setSaving(studentId);
    setError('');
    try {
      const existing = consents[studentId];
      const payload = {
        studentId,
        academicYearId,
        consentGiven: patch.consentGiven ?? existing?.consentGiven ?? false,
        homeAddress: patch.homeAddress ?? existing?.homeAddress,
        homeRadiusMeters: patch.homeRadiusMeters ?? existing?.homeRadiusMeters ?? 200,
        notifyDelayAfterMinutes: patch.notifyDelayAfterMinutes ?? existing?.notifyDelayAfterMinutes ?? 30,
      };
      const data = await apiFetch('/consent', { method: 'PUT', body: JSON.stringify(payload) });
      setConsents(prev => ({ ...prev, [studentId]: data.data }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <p className="text-gray-400 text-sm">Loading consent records…</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {students.map(student => {
        const c = consents[student._id];
        return (
          <div key={student._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-800">{student.name}</h4>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${c?.consentGiven ? 'text-green-600' : 'text-gray-400'}`}>
                  {c?.consentGiven ? 'Consent Given' : 'No Consent'}
                </span>
                <button
                  role="switch"
                  aria-checked={c?.consentGiven}
                  onClick={() => handleSave(student._id, { consentGiven: !(c?.consentGiven) })}
                  disabled={saving === student._id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    c?.consentGiven ? 'bg-green-500' : 'bg-gray-300'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      c?.consentGiven ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Home Address */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  defaultValue={c?.homeAddress?.lat ?? ''}
                  id={`lat-${student._id}`}
                  placeholder="e.g. 28.6139"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  defaultValue={c?.homeAddress?.lng ?? ''}
                  id={`lng-${student._id}`}
                  placeholder="e.g. 77.2090"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address Label</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  defaultValue={c?.homeAddress?.label ?? ''}
                  id={`label-${student._id}`}
                  placeholder="Home, Grandma's house…"
                />
              </div>
            </div>

            {/* Radius slider */}
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">
                Geofence Radius: <strong>{c?.homeRadiusMeters ?? 200}m</strong>
              </label>
              <input
                type="range"
                min={50}
                max={2000}
                step={50}
                defaultValue={c?.homeRadiusMeters ?? 200}
                id={`radius-${student._id}`}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>50m</span><span>2000m</span>
              </div>
            </div>

            <button
              onClick={() => {
                const lat = parseFloat((document.getElementById(`lat-${student._id}`) as HTMLInputElement).value);
                const lng = parseFloat((document.getElementById(`lng-${student._id}`) as HTMLInputElement).value);
                const label = (document.getElementById(`label-${student._id}`) as HTMLInputElement).value;
                const radius = parseInt((document.getElementById(`radius-${student._id}`) as HTMLInputElement).value, 10);
                handleSave(student._id, {
                  homeAddress: { lat, lng, label },
                  homeRadiusMeters: radius,
                });
              }}
              disabled={saving === student._id}
              className="mt-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving === student._id ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        );
      })}
      {students.length === 0 && (
        <p className="text-gray-400 text-sm">No students found.</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Trip History Tab
// ---------------------------------------------------------------------------
interface HistoryTabProps {
  students: Array<{ _id: string; name: string }>;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ students }) => {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(20);

  const fetchHistory = useCallback(async () => {
    if (!selectedStudent) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/trip/history?studentId=${selectedStudent}&limit=${limit}`);
      setTrips(Array.isArray(data) ? data : (data.data || []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, limit]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const statusColors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    arrived: 'bg-green-100 text-green-700',
    delayed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedStudent}
          onChange={e => setSelectedStudent(e.target.value)}
        >
          <option value="">Select student…</option>
          {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
        >
          <option value={10}>Last 10</option>
          <option value={20}>Last 20</option>
          <option value={50}>Last 50</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading && <p className="text-gray-400 text-sm">Loading history…</p>}

      {!selectedStudent && !loading && (
        <p className="text-gray-400 text-sm">Select a student to view trip history.</p>
      )}

      <div className="space-y-2">
        {trips.map(trip => (
          <div
            key={trip._id}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">
                {new Date(trip.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' '}
                <span className="text-gray-400 capitalize">({trip.tripType})</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Duration: {formatDuration(trip.startTime, trip.endTime)}
                {trip.startTime && (
                  <> · Started {new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                )}
              </p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[trip.status] || 'bg-gray-100 text-gray-500'}`}>
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
            </span>
          </div>
        ))}
        {!loading && selectedStudent && trips.length === 0 && (
          <p className="text-gray-400 text-sm">No trips found for this student.</p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main SafeReach Component
// ---------------------------------------------------------------------------
interface SafeReachProps {
  academicYearId?: string;
  students?: Array<{ _id: string; name: string }>;
}

const SafeReach: React.FC<SafeReachProps> = ({
  academicYearId: propYearId = '',
  students: propStudents = [],
}) => {
  const { activeStudents, students: appStudents, academicYears } = useApp();

  const academicYearId = useMemo(() => {
    if (propYearId) return propYearId;
    const active = academicYears?.find(y => y.isActive);
    return active?._id || academicYears?.[0]?._id || '';
  }, [propYearId, academicYears]);

  const students: { _id: string; name: string }[] = useMemo(() => {
    if (propStudents && propStudents.length > 0) return propStudents;
    const list = (activeStudents && activeStudents.length > 0) ? activeStudents : appStudents;
    return (list || []).map(s => ({
      _id: s._id || '',
      name: (s.studentName || (s as any).name || 'Student') as string,
    }));
  }, [propStudents, activeStudents, appStudents]);

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [refreshTick, setRefreshTick] = useState(0);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh every 30 seconds on the Today tab
  useEffect(() => {
    if (activeTab === 'today') {
      refreshIntervalRef.current = setInterval(() => {
        setRefreshTick(t => t + 1);
      }, 30_000);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [activeTab]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'today', label: "Today's Status", icon: '📍' },
    { key: 'consent', label: 'Consent Management', icon: '✅' },
    { key: 'history', label: 'Trip History', icon: '🕐' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SafeReach</h1>
            <p className="text-sm text-gray-500">Student commute tracking &amp; parent alerts</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'today' && (
          <TodayTab
            academicYearId={academicYearId}
            refreshTick={refreshTick}
            onRefresh={() => setRefreshTick(t => t + 1)}
          />
        )}
        {activeTab === 'consent' && (
          <ConsentTab
            academicYearId={academicYearId}
            students={students}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab students={students} />
        )}
      </div>
    </div>
  );
};

export default SafeReach;
