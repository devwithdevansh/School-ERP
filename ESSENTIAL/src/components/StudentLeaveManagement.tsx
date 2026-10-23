import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Calendar, CheckCircle2, XCircle, Clock, FileText } from './icons';
import { getActiveStandards } from '../utils/standardUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

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
    <div className="flex-1 p-6 max-w-6xl mx-auto min-h-[calc(100vh-2rem)] animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Calendar className="size-7 text-primary" />
            Leave Approvals
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Review and manage student leave requests (Class Teachers and Admins)</p>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:w-auto space-y-1.5">
          <Label>Standard</Label>
          <NativeSelect value={selectedStandard} onChange={e => setSelectedStandard(e.target.value)} className="w-full">
            <option value="">All</option>
            {activeStandards.map(s => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
        </div>
        <div className="w-full md:w-auto space-y-1.5">
          <Label>Division</Label>
          <NativeSelect value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)} className="w-full">
            <option value="">All</option>
            {['A', 'B', 'C', 'D'].map(d => <option key={d} value={d}>Division {d}</option>)}
          </NativeSelect>
        </div>
        <div className="w-full md:w-auto space-y-1.5">
          <Label>Medium</Label>
          <NativeSelect value={selectedMedium} onChange={e => setSelectedMedium(e.target.value)} className="w-full">
            <option value="English">English</option>
            <option value="Gujarati">Gujarati</option>
          </NativeSelect>
        </div>
        <div className="w-full md:w-auto space-y-1.5">
          <Label>Status</Label>
          <NativeSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </NativeSelect>
        </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : leaves.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16 text-muted-foreground">
              <FileText className="size-12 mx-auto opacity-30 mb-4" />
              No leave requests found.
            </CardContent>
          </Card>
        ) : (
          leaves.map(leave => (
            <Card key={leave._id}>
              <CardContent className="flex flex-col md:flex-row gap-6 justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={leave.status === 'REJECTED' ? 'destructive' : leave.status === 'APPROVED' ? 'success' : 'warning'} className="uppercase">
                      {leave.status === 'PENDING' && <Clock />}
                      {leave.status === 'APPROVED' && <CheckCircle2 />}
                      {leave.status === 'REJECTED' && <XCircle />}
                      {leave.status}
                    </Badge>
                    <Badge variant="info" className="uppercase">Std {leave.standard}-{leave.division}</Badge>
                  </div>

                  <h4 className="font-bold text-lg">{leave.studentId?.studentName}</h4>
                  <div className="text-xs text-muted-foreground mt-1">Roll No: {leave.studentId?.rollNo || 'N/A'}</div>

                  <div className="mt-4 bg-muted/50 p-4 rounded-xl border">
                    <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">
                      <span>From: {new Date(leave.startDate).toLocaleDateString()}</span>
                      <span>|</span>
                      <span>To: {new Date(leave.endDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm">{leave.reason}</p>
                  </div>

                  {leave.status !== 'PENDING' && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Reviewed by {leave.reviewedBy?.name}: {leave.reviewRemarks || 'No remarks'}
                    </div>
                  )}
                </div>

                {leave.status === 'PENDING' && (
                  <div className="w-full md:w-64 shrink-0 space-y-3">
                    {reviewingId === leave._id ? (
                      <div className="bg-muted/50 p-4 rounded-xl border space-y-3">
                        <div className="space-y-1.5">
                          <Label>Remarks (Optional)</Label>
                          <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />
                        </div>
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => handleStatusUpdate(leave._id, 'APPROVED')} disabled={saving}>
                            Approve
                          </Button>
                          <Button className="flex-1" variant="destructive" onClick={() => handleStatusUpdate(leave._id, 'REJECTED')} disabled={saving}>
                            Reject
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" className="w-full" onClick={() => setReviewingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full" size="lg" onClick={() => setReviewingId(leave._id)}>
                        Review Request
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
