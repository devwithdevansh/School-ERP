import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Calendar, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { getActiveStandards } from '../utils/standardUtils';

export const StudentLeaveManagement: React.FC = () => {
  const { 
    academicYears, 
    authFetch,
    feeStructures
  } = useApp();

  const activeYear = academicYears.find(y => y.isActive) || academicYears[0];

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [selectedStandard, setSelectedStandard] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedMedium, setSelectedMedium] = useState('English');
  const [statusFilter, setStatusFilter] = useState('');

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const activeStandards = React.useMemo(() => {
    return getActiveStandards(feeStructures, activeYear?.name, selectedMedium);
  }, [feeStructures, activeYear?.name, selectedMedium]);

  const fetchLeaves = async () => {
    if (!activeYear) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStandard) params.append('standard', selectedStandard);
      if (selectedDivision) params.append('division', selectedDivision);
      if (selectedMedium) params.append('medium', selectedMedium);
      if (statusFilter) params.append('status', statusFilter);

      const res = await authFetch(`/api/v1/erp/leave?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLeaves(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [selectedStandard, selectedDivision, selectedMedium, statusFilter, activeYear]);

  const handleStatusUpdate = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/erp/leave/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewRemarks: remarks })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Failed to ${newStatus.toLowerCase()} leave`);
      }
      setReviewingId(null);
      setRemarks('');
      fetchLeaves();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto bg-slate-50/50 min-h-[calc(100vh-2rem)] animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="w-7 h-7 text-indigo-500" />
            Leave Approvals
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Review and manage student leave requests (Class Teachers & Admins)</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Standard</label>
          <select
            value={selectedStandard}
            onChange={e => setSelectedStandard(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {activeStandards.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Division</label>
          <select
            value={selectedDivision}
            onChange={e => setSelectedDivision(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {['A', 'B', 'C', 'D'].map(d => <option key={d} value={d}>Division {d}</option>)}
          </select>
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Medium</label>
          <select
            value={selectedMedium}
            onChange={e => setSelectedMedium(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="English">English</option>
            <option value="Gujarati">Gujarati</option>
          </select>
        </div>
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 font-medium">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-slate-500 font-medium">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            No leave requests found.
          </div>
        ) : (
          leaves.map(leave => (
            <div key={leave._id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-6 justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2.5 py-1 font-bold text-[10px] rounded uppercase tracking-wider flex items-center gap-1
                    ${leave.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : ''}
                    ${leave.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : ''}
                    ${leave.status === 'REJECTED' ? 'bg-red-50 text-red-600' : ''}
                  `}>
                    {leave.status === 'PENDING' && <Clock className="w-3 h-3" />}
                    {leave.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                    {leave.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                    {leave.status}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded uppercase tracking-wider">
                    Std {leave.standard}-{leave.division}
                  </span>
                </div>
                
                <h4 className="font-bold text-slate-800 text-lg">{leave.studentId?.studentName}</h4>
                <div className="text-xs text-slate-500 font-medium mt-1">Roll No: {leave.studentId?.rollNo || 'N/A'}</div>
                
                <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    <span>From: {new Date(leave.startDate).toLocaleDateString()}</span>
                    <span className="text-slate-300">|</span>
                    <span>To: {new Date(leave.endDate).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-700">{leave.reason}</p>
                </div>
                
                {leave.status !== 'PENDING' && (
                  <div className="mt-3 text-xs font-semibold text-slate-500">
                    Reviewed by {leave.reviewedBy?.name}: {leave.reviewRemarks || 'No remarks'}
                  </div>
                )}
              </div>
              
              {leave.status === 'PENDING' && (
                <div className="w-full md:w-64 shrink-0 space-y-3">
                  {reviewingId === leave._id ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remarks (Optional)</label>
                      <textarea 
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleStatusUpdate(leave._id, 'APPROVED')}
                          disabled={saving}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-1.5 rounded-lg font-bold text-xs"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(leave._id, 'REJECTED')}
                          disabled={saving}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-1.5 rounded-lg font-bold text-xs"
                        >
                          Reject
                        </button>
                      </div>
                      <button 
                        onClick={() => setReviewingId(null)}
                        className="w-full mt-2 text-slate-500 hover:text-slate-700 font-semibold text-xs py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setReviewingId(leave._id)}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors"
                    >
                      Review Request
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};
