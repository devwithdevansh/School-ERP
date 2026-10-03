import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../store';
import { getActiveStandards } from '../utils/standardUtils';

export const Admission: React.FC = () => {
  const { addStudent, setScreen, academicYears, feeStructures } = useApp();
  
  const activeYearName = React.useMemo(() => academicYears.find(y => y.isActive)?.name || academicYears[0]?.name || '', [academicYears]);
  const activeStandards = React.useMemo(() => {
    return getActiveStandards(feeStructures, activeYearName, undefined);
  }, [feeStructures, activeYearName]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    surname: '',
    studentName: '',
    dob: '',
    gender: 'Male',
    motherName: '',
    fatherName: '',
    category: 'General',
    caste: '',
    birthPlace: '',
    aadharNo: '',
    height: '',
    weight: '',
    penNo: '',
    grNo: '',
    diseaseNo: '',
    parentName: '',
    parentMobile: '',
    parentSecondaryMobile: '',
    standard: activeStandards[0] || '1',
    division: 'A',
    medium: 'Gujarati',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const noUppercase = ['dob', 'parentMobile', 'parentSecondaryMobile', 'gender', 'category', 'standard', 'division', 'medium'];
    setFormData(prev => ({ ...prev, [name]: noUppercase.includes(name) ? value : value.toUpperCase() }));
  };

  const handleSave = async () => {
    setError('');
    if (!formData.studentName.trim()) {
      setError('Student name is required.');
      return;
    }
    if (!formData.parentName.trim() || !formData.parentMobile.trim()) {
      setError('Parent name and mobile number are required so the parent can log in to the app.');
      return;
    }

    setIsSubmitting(true);
    const success = await addStudent({
      studentName: `${formData.studentName} ${formData.surname}`.trim(),
      surname: formData.surname || null,
      fatherName: formData.fatherName || null,
      motherName: formData.motherName || null,
      grNo: formData.grNo || null,
      gender: (formData.gender.charAt(0) + formData.gender.slice(1).toLowerCase()) as 'Male' | 'Female',
      dob: formData.dob ? new Date(formData.dob).toISOString() : null,
      aadharNo: formData.aadharNo || null,
      penNo: formData.penNo || null,
      profile: {
        birthPlace: formData.birthPlace || null,
        category: formData.category || null,
        caste: formData.caste || null,
        height: formData.height || null,
        weight: formData.weight || null,
        medicalRemark: formData.diseaseNo || null,
      },
      parentName: formData.parentName,
      parentMobile: formData.parentMobile,
      parentSecondaryMobile: formData.parentSecondaryMobile || undefined,
      medium: formData.medium as 'English' | 'Gujarati',
      standard: formData.standard,
      division: formData.division,
      isNewAdmission: true,
      isMigrated: true,
      isActive: true,
    } as any);

    if (success) {
      setScreen('students');
    } else {
      setError('Failed to save admission. The parent mobile number or student details may be invalid — check the Students list for details.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-slate-50/50 min-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">New Admission</h2>
            <p className="text-sm font-semibold text-slate-500 mt-1">Fill in student and parent details. The parent sets their own login password on first sign-in.</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-700 font-semibold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200">
            <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-4">Parent / Guardian (for app login)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Parent Name *</label>
                <input type="text" name="parentName" value={formData.parentName} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="PARENT NAME" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Parent Mobile *</label>
                <input type="tel" name="parentMobile" value={formData.parentMobile} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Secondary Mobile (Optional)</label>
                <input type="tel" name="parentSecondaryMobile" value={formData.parentSecondaryMobile} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="9876543210" />
              </div>
            </div>

            <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-4 pt-2 border-t border-slate-100">Student Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Surname</label>
                <input type="text" name="surname" value={formData.surname} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="SURNAME" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Student Name *</label>
                <input type="text" name="studentName" value={formData.studentName} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="STUDENT NAME" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                  <option value="Male">MALE</option>
                  <option value="Female">FEMALE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mother's Name</label>
                <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="MOTHER'S NAME" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Father's Name</label>
                <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="e.g. D. DABHI" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                  <option>General</option>
                  <option>OBC</option>
                  <option>SC</option>
                  <option>ST</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Caste / Sub-caste</label>
                <input type="text" name="caste" value={formData.caste} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Birth Place</label>
                <input type="text" name="birthPlace" value={formData.birthPlace} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Aadhar Number</label>
                <input type="text" name="aadharNo" value={formData.aadharNo} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="XXXX XXXX XXXX" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Height (cm)</label>
                <input type="text" name="height" value={formData.height} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="118" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Weight (kg)</label>
                <input type="text" name="weight" value={formData.weight} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="21" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GR Number (Optional)</label>
                <input type="text" name="grNo" value={formData.grNo} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300" placeholder="Leave blank to assign later" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">PEN Number</label>
                <input type="text" name="penNo" value={formData.penNo} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medical Remark / Disease No.</label>
                <input type="text" name="diseaseNo" value={formData.diseaseNo} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"></input>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Standard</label>
                <select name="standard" value={formData.standard} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                  {activeStandards.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Division</label>
                <select name="division" value={formData.division} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                  {['A', 'B', 'C', 'D'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Medium</label>
                <select name="medium" value={formData.medium} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                  <option>Gujarati</option>
                  <option>English</option>
                </select>
              </div>
            </div>

            <button onClick={handleSave} disabled={isSubmitting} className="mt-8 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Admission'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-200 h-fit border-t-4 border-t-indigo-500">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            Notes
          </h3>

          <div className="space-y-4">
            <div className="border-b border-dashed border-slate-200 pb-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Student Code</label>
              <div className="text-sm font-semibold text-slate-800">Auto-generated on save</div>
            </div>

            <div className="border-b border-dashed border-slate-200 pb-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Roll Number</label>
              <div className="text-sm font-semibold text-slate-800">Assigned automatically at year-end</div>
            </div>

            <div className="pb-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Login Password</label>
              <div className="text-sm font-semibold text-slate-800">
                Set by parent on first login
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 mt-6 flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 font-bold leading-relaxed">
                This student is created directly as an active ERP record — no separate migration step needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
