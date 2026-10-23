import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle2 } from './icons';
import { useApp } from '../store';
import { getActiveStandards } from '../utils/standardUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
  <div className={`space-y-1.5 ${className ?? ''}`}>
    <Label>{label}</Label>
    {children}
  </div>
);

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

  const text = (name: keyof typeof formData, placeholder?: string, type = 'text') => (
    <Input type={type} name={name} value={formData[name]} onChange={handleChange} placeholder={placeholder} />
  );

  return (
    <div className="flex-1 p-6 lg:p-8 min-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">New Admission</h2>
          <p className="text-sm text-muted-foreground mt-1">Fill in student and parent details. The parent sets their own login password on first sign-in.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
          <Card>
            <CardContent className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">Parent / Guardian (for app login)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Parent Name *">{text('parentName', 'PARENT NAME')}</Field>
                  <Field label="Parent Mobile *">{text('parentMobile', '9876543210', 'tel')}</Field>
                  <Field label="Secondary Mobile (Optional)">{text('parentSecondaryMobile', '9876543210', 'tel')}</Field>
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t">
                <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider">Student Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <Field label="Surname">{text('surname', 'SURNAME')}</Field>
                  <Field label="Student Name *">{text('studentName', 'STUDENT NAME')}</Field>

                  <Field label="Date of Birth">{text('dob', undefined, 'date')}</Field>
                  <Field label="Gender">
                    <NativeSelect name="gender" value={formData.gender} onChange={handleChange} className="w-full">
                      <option value="Male">MALE</option>
                      <option value="Female">FEMALE</option>
                    </NativeSelect>
                  </Field>

                  <Field label="Mother's Name">{text('motherName', "MOTHER'S NAME")}</Field>
                  <Field label="Father's Name">{text('fatherName', 'e.g. D. DABHI')}</Field>

                  <Field label="Category">
                    <NativeSelect name="category" value={formData.category} onChange={handleChange} className="w-full">
                      <option>General</option>
                      <option>OBC</option>
                      <option>SC</option>
                      <option>ST</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Caste / Sub-caste">{text('caste')}</Field>

                  <Field label="Birth Place">{text('birthPlace')}</Field>
                  <Field label="Aadhar Number">{text('aadharNo', 'XXXX XXXX XXXX')}</Field>

                  <Field label="Height (cm)">{text('height', '118')}</Field>
                  <Field label="Weight (kg)">{text('weight', '21')}</Field>

                  <Field label="GR Number (Optional)">{text('grNo', 'Leave blank to assign later')}</Field>
                  <Field label="PEN Number">{text('penNo')}</Field>

                  <Field label="Medical Remark / Disease No." className="md:col-span-2">{text('diseaseNo')}</Field>

                  <Field label="Standard">
                    <NativeSelect name="standard" value={formData.standard} onChange={handleChange} className="w-full">
                      {activeStandards.map(s => <option key={s}>{s}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Division">
                    <NativeSelect name="division" value={formData.division} onChange={handleChange} className="w-full">
                      {['A', 'B', 'C', 'D'].map(d => <option key={d}>{d}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Medium">
                    <NativeSelect name="medium" value={formData.medium} onChange={handleChange} className="w-full">
                      <option>Gujarati</option>
                      <option>English</option>
                    </NativeSelect>
                  </Field>
                </div>
              </section>

              <Button onClick={handleSave} disabled={isSubmitting} size="lg" className="w-full h-10">
                <Save />
                {isSubmitting ? 'Saving...' : 'Save Admission'}
              </Button>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-bold">
                <AlertCircle className="size-4 text-muted-foreground" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-b border-dashed pb-3">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Student Code</Label>
                <div className="text-sm font-semibold">Auto-generated on save</div>
              </div>
              <div className="border-b border-dashed pb-3">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Roll Number</Label>
                <div className="text-sm font-semibold">Assigned automatically at year-end</div>
              </div>
              <div className="pb-2">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Login Password</Label>
                <div className="text-sm font-semibold">Set by parent on first login</div>
              </div>

              <Alert className="bg-success-soft text-success-soft-foreground border-success/20">
                <CheckCircle2 />
                <AlertDescription>
                  This student is created directly as an active ERP record — no separate migration step needed.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
