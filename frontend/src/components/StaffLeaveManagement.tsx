import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Calendar, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';

export const StaffLeaveManagement: React.FC = () => {
  const { 
    authFetch,
    currentUser,
    staffLeaveRequests,
    refreshData
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredLeaves = useMemo(() => {
    let leaves = [...staffLeaveRequests];
    if (statusFilter !== 'All') {
      leaves = leaves.filter(l => l.status === statusFilter.toUpperCase());
    }
    return leaves;
  }, [staffLeaveRequests, statusFilter]);

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    let rejectionReason = '';
    if (status === 'REJECTED') {
      const reason = prompt('Please enter a reason for rejection:');
      if (reason === null) return; // Cancelled
      rejectionReason = reason;
    }

    setProcessingId(id);
    try {
      const res = await authFetch(`/api/v1/erp/leave/staff/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update leave status');
      }
      
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Approved</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1"><XCircle className="w-3 h-3"/> Rejected</span>;
      default:
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>;
    }
  };

  return (
    <div className="space-y-6 bg-slate-50/50 min-h-[calc(100vh-2rem)] p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="w-7 h-7 text-indigo-500" />
            Staff Leave Approvals
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {isAdmin ? 'Review and manage staff leave requests' : 'View your leave requests'}
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
        {filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <p>No staff leave requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{leave.userId?.name || 'Unknown User'}</div>
                      <div className="text-xs text-slate-500">{leave.userId?.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{formatDate(leave.startDate)}</div>
                      <div className="text-xs text-slate-500">to {formatDate(leave.endDate)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold">
                        {leave.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="truncate text-slate-600" title={leave.reason}>{leave.reason}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(leave.status)}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {leave.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStatusUpdate(leave._id, 'APPROVED')}
                              disabled={processingId === leave._id}
                              className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(leave._id, 'REJECTED')}
                              disabled={processingId === leave._id}
                              className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            Reviewed by {leave.approvedBy?.name || 'Admin'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
