import React, { useState } from 'react';
import { ShieldCheck, Pencil, Check, X, ShieldAlert } from './icons';
import { useApp } from '../store';
import { PERMISSIONS_GROUPS } from '../constants/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const RolesPermissions: React.FC = () => {
  const { users, authFetch, refreshData } = useApp();

  // Filter staff/teachers
  const staffList = users.filter((u: any) => u.role === 'STAFF' || u.role === 'TEACHER');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const startEditing = (user: any) => {
    setEditingUserId(user._id);
    setTempPermissions(user.permissions || []);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setTempPermissions([]);
  };

  const togglePermission = (permId: string) => {
    setTempPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const savePermissions = async (userId: string) => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/users/${userId}/teacher-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: tempPermissions })
      });
      if (res.ok) {
        await refreshData();
        setEditingUserId(null);
      } else {
        const body = await res.json().catch(() => null);
        alert(body?.message || 'Failed to save permissions');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 min-h-[calc(100vh-2rem)] p-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <ShieldCheck className="size-7 text-primary" />
            Roles & Permissions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage granular module access for all staff members.</p>
        </div>
      </div>

      <Card className="p-0 gap-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 w-64">Staff Member</TableHead>
              <TableHead className="px-6 w-32">Phone / Email</TableHead>
              <TableHead className="px-6">Module Access</TableHead>
              <TableHead className="px-6 text-right w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  No staff members found.
                </TableCell>
              </TableRow>
            ) : (
              staffList.map((user: any) => {
                const isEditing = editingUserId === user._id;
                const userPerms = isEditing ? tempPermissions : (user.permissions || []);

                return (
                  <TableRow key={user._id} className="group">
                    <TableCell className="px-6 py-6 align-top whitespace-normal">
                      <div className="font-bold text-sm uppercase">{user.name}</div>
                      <Badge variant={user.role === 'TEACHER' ? 'info' : 'success'} className="mt-1 uppercase">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-6 align-top text-sm text-muted-foreground whitespace-normal">
                      {user.contactNo1 || '-'}
                      {user.email && <div className="text-xs mt-0.5 truncate max-w-[150px]">{user.email}</div>}
                    </TableCell>
                    <TableCell className="px-6 py-4 align-top whitespace-normal">
                      {isEditing ? (
                        <div className="bg-muted/50 p-4 rounded-xl border max-h-[400px] overflow-y-auto">
                          {PERMISSIONS_GROUPS.map((group, gIdx) => (
                            <div key={gIdx} className="mb-6 last:mb-0">
                              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{group.groupName}</h4>
                              <div className="flex flex-wrap gap-2">
                                {group.permissions.map(p => {
                                  const active = userPerms.includes(p.id);
                                  return (
                                    <Button
                                      key={p.id}
                                      size="sm"
                                      variant={active ? 'default' : 'outline'}
                                      onClick={() => togglePermission(p.id)}
                                      className="rounded-full"
                                    >
                                      {p.label}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {userPerms.length === 0 ? (
                            <Badge variant="warning">
                              <ShieldAlert /> No permissions assigned
                            </Badge>
                          ) : (
                            PERMISSIONS_GROUPS.flatMap(g => g.permissions)
                              .filter(p => userPerms.includes(p.id))
                              .map(p => (
                                <Badge key={p.id} className="whitespace-nowrap">{p.label}</Badge>
                              ))
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-6 align-top text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={cancelEditing} title="Cancel">
                            <X />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => savePermissions(user._id)} disabled={saving} title="Save Permissions">
                            <Check />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(user)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Edit permissions"
                        >
                          <Pencil />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
