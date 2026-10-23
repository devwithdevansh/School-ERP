import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Calendar, CheckCircle2, XCircle, Clock, FileText } from './icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
        return <Badge variant="success"><CheckCircle2 /> Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle /> Rejected</Badge>;
      default:
        return <Badge variant="warning"><Clock /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 min-h-[calc(100vh-2rem)] p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Calendar className="size-7 text-primary" />
            Staff Leave Approvals
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'Review and manage staff leave requests' : 'View your leave requests'}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <NativeSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full">
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 gap-0">
        {filteredLeaves.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <FileText className="size-12 opacity-30 mb-3" />
            <p>No staff leave requests found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Staff Member</TableHead>
                <TableHead className="px-6">Duration</TableHead>
                <TableHead className="px-6">Type</TableHead>
                <TableHead className="px-6">Reason</TableHead>
                <TableHead className="px-6">Status</TableHead>
                {isAdmin && <TableHead className="px-6 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.map((leave) => (
                <TableRow key={leave._id}>
                  <TableCell className="px-6 py-4">
                    <div className="font-semibold">{leave.userId?.name || 'Unknown User'}</div>
                    <div className="text-xs text-muted-foreground">{leave.userId?.role}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="font-medium">{formatDate(leave.startDate)}</div>
                    <div className="text-xs text-muted-foreground">to {formatDate(leave.endDate)}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="info">{leave.type}</Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 max-w-xs">
                    <p className="truncate text-muted-foreground" title={leave.reason}>{leave.reason}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4">{getStatusBadge(leave.status)}</TableCell>
                  {isAdmin && (
                    <TableCell className="px-6 py-4 text-right">
                      {leave.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleStatusUpdate(leave._id, 'APPROVED')} disabled={processingId === leave._id}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(leave._id, 'REJECTED')} disabled={processingId === leave._id}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Reviewed by {leave.approvedBy?.name || 'Admin'}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
