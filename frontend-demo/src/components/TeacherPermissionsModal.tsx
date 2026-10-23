import React, { useState } from 'react';
import { X, Save, ShieldCheck } from './icons';
import { useApp } from '../store';

interface TeacherPermissionsModalProps {
  user: any;
  onClose: () => void;
  onSaved: () => void;
}

export const TeacherPermissionsModal: React.FC<TeacherPermissionsModalProps> = ({ user, onClose, onSaved }) => {
  const { authFetch } = useApp();
  
  const [role, setRole] = useState<string>(user.role || 'STAFF');
  const [permissions, setPermissions] = useState<string[]>(user.permissions || []);
  const [saving, setSaving] = useState(false);

  const togglePermission = (perm: string) => {
    setPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        role,
        permissions
      };

      const res = await authFetch(`/api/v1/users/${user._id}/teacher-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Failed to save profile');
      }

      onSaved();
    } catch (err: any) {
      alert(err?.message || 'Error saving teacher profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              Permissions & Assignments
            </h3>
            <p className="text-xs text-slate-500 font-medium">Configuring access for <span className="font-bold text-slate-700">{user.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-8 bg-slate-50 flex-1">
          
          {/* Section 0: Role Selection */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm mb-4">System Role</h4>
            <div className="flex gap-4">
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${role === 'STAFF' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="STAFF" 
                  checked={role === 'STAFF'} 
                  onChange={() => setRole('STAFF')} 
                  className="sr-only" 
                />
                <span className="font-bold text-sm">STAFF</span>
                <span className="text-xs mt-1 text-center opacity-80">General admin, reception, or clerk</span>
              </label>
              
              <label className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${role === 'TEACHER' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="TEACHER" 
                  checked={role === 'TEACHER'} 
                  onChange={() => setRole('TEACHER')} 
                  className="sr-only" 
                />
                <span className="font-bold text-sm">TEACHER</span>
                <span className="text-xs mt-1 text-center opacity-80">Class teacher or subject teacher</span>
              </label>
            </div>
          </div>

          {/* Section 1: Permissions */}
          <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-opacity ${role === 'STAFF' ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-800 text-sm mb-4">App Permissions (Teacher Only)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { id: 'MARK_ATTENDANCE', label: 'Mark Attendance', desc: 'Can submit daily attendance for assigned classes' },
                { id: 'ENTER_MARKS', label: 'Enter Results', desc: 'Can enter unit test & term marks' },
                { id: 'APPROVE_LEAVE', label: 'Approve Leave', desc: 'Can approve/reject student leave requests' },
                { id: 'EDIT_STUDENT_PROFILE', label: 'Edit Student Profile', desc: 'Can edit address and photo of students' }
              ].map(perm => (
                <label key={perm.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${permissions.includes(perm.id) ? 'bg-blue-50 border-blue-200' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="pt-0.5">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      checked={permissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${permissions.includes(perm.id) ? 'text-blue-900' : 'text-slate-700'}`}>{perm.label}</div>
                    <div className={`text-xs mt-0.5 ${permissions.includes(perm.id) ? 'text-blue-700' : 'text-slate-500'}`}>{perm.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-bold text-sm rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
};
