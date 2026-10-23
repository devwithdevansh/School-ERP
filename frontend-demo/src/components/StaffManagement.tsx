import React, { useState } from 'react';
import { useApp } from '../store';
import { UserPlus, Users, ShieldCheck, ShieldOff, KeyRound, Eye, EyeOff, Trash2, Pencil } from './icons';
import { TeacherPermissionsModal } from './TeacherPermissionsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const StaffManagement: React.FC = () => {
  const { currentUser, authFetch, users, refreshData, activePortal } = useApp();
  
  const staffMembers = users.filter((u: any) => u.role !== 'ADMIN');

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'STAFF' | 'TEACHER'>('STAFF');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetNewPassword] = useState('');

  // Teacher Profile Modal
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);

  const defaultHeaders = { 'Content-Type': 'application/json' };

  const handleCreate = async () => {
    setFormError('');
    if (!formName.trim() || (!formEmail.trim() && !formPhone.trim()) || !formPassword.trim()) {
      setFormError('Name, password, and either Email or Phone are required');
      return;
    }
    if (formPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch('/api/v1/users', {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({ 
          name: formName.trim(), 
          email: formEmail.trim() ? formEmail.trim().toLowerCase() : undefined, 
          phone: formPhone.trim() || undefined,
          password: formPassword,
          role: formRole
        })
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.message || 'Failed to create account');
        return;
      }
      setShowForm(false);
      setFormName(''); setFormEmail(''); setFormPhone(''); setFormPassword(''); setFormRole('STAFF');
      refreshData();
    } catch (err) {
      setFormError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (userId: string) => {
    await authFetch(`/api/v1/users/${userId}/toggle-status`, { method: 'PATCH' });
    refreshData();
  };

  const handleResetPassword = async () => {
    if (!resetUserId || resetPassword.length < 6) return;
    await authFetch(`/api/v1/users/${resetUserId}/reset-password`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify({ newPassword: resetPassword })
    });
    setResetUserId(null);
    setResetNewPassword('');
    alert('Password reset successfully!');
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the account for "${name}"? This action cannot be undone.`)) return;
    const res = await authFetch(`/api/v1/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      refreshData();
    } else {
      const data = await res.json();
      alert(data.message || 'Failed to delete staff account');
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <p className="text-muted-foreground font-bold text-lg">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="size-6 text-primary" /> Staff & Teachers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage portal access, roles, and permissions.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus />
          Add User
        </Button>
      </header>

      {showForm && (
        <Card className="animate-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Create New Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Foram Shah" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="teacher@school.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="e.g. 9876543210" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <NativeSelect value={formRole} onChange={e => setFormRole(e.target.value as 'STAFF' | 'TEACHER')} className="w-full">
                  <option value="STAFF">Staff (Reception / Office)</option>
                  <option value="TEACHER">Teacher</option>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Initial Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Account'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6">User</TableHead>
              <TableHead className="px-6">Role</TableHead>
              <TableHead className="px-6">Status</TableHead>
              <TableHead className="px-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  <p className="font-semibold">No staff or teachers found.</p>
                </TableCell>
              </TableRow>
            ) : (
              staffMembers.map((user: any) => (
                <TableRow key={user._id}>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={user.role === 'TEACHER' ? 'info' : 'success'} className="uppercase">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Button
                      size="sm"
                      variant={user.isActive ? 'secondary' : 'outline'}
                      onClick={() => handleToggle(user._id)}
                      className="rounded-full"
                    >
                      {user.isActive ? <ShieldCheck /> : <ShieldOff />}
                      {user.isActive ? 'Active' : 'Suspended'}
                    </Button>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {activePortal === 'ERP' && (
                        <Button variant="ghost" size="icon" onClick={() => setEditingTeacher(user)} title="Edit Details & Permissions">
                          <Pencil />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setResetUserId(user._id)} title="Reset Password">
                        <KeyRound />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user._id, user.name)} title="Delete Account" className="text-destructive hover:text-destructive">
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Reset Password Modal */}
      <Dialog open={!!resetUserId} onOpenChange={open => { if (!open) { setResetUserId(null); setResetNewPassword(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5" /> Reset Password
            </DialogTitle>
            <DialogDescription>
              Enter a new password for this staff member. They can use this to login immediately.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            value={resetPassword}
            onChange={e => setResetNewPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setResetUserId(null); setResetNewPassword(''); }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetPassword.length < 6}>
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Permissions Modal */}
      {editingTeacher && (
        <TeacherPermissionsModal
          user={editingTeacher}
          onClose={() => setEditingTeacher(null)}
          onSaved={() => {
            setEditingTeacher(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
};
