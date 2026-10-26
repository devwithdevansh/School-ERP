import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../store';
import { brand } from '../config/brand';
import { printHTML } from '../utils/printUtils';
import {
  Award,
  IdCard,
  FileBadge,
  Printer,
  Search,
  Filter,
  Check,
  X,
  Plus,
  RefreshCw,
  Download,
  Calendar,
  User,
  Users,
  GraduationCap,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Settings,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
  Share2,
} from './icons';

// ── Types ──────────────────────────────────────────────────────────────────
export type DocumentTab = 'certificates' | 'id-cards' | 'registry';

export interface CertificateFormData {
  documentType: 'EVENT_CERTIFICATE' | 'BONAFIDE' | 'LEAVING_CERTIFICATE' | 'CHARACTER_CERTIFICATE' | 'APPRECIATION' | 'CUSTOM';
  templateId: 'classic-gold' | 'royal-indigo' | 'emerald-prestige' | 'minimal-modern';
  title: string;
  eventName: string;
  eventDate: string;
  achievement: string;
  bodyText: string;
  certificateNumber: string;
  issuedDate: string;
  signatory1Name: string;
  signatory1Title: string;
  signatory2Name: string;
  signatory2Title: string;
  schoolName: string;
  schoolAddress: string;
  schoolAffiliation: string;
}

export interface IdCardConfig {
  orientation: 'vertical' | 'horizontal';
  theme: 'navy' | 'emerald' | 'crimson' | 'slate' | 'teal';
  sides: 'front' | 'back' | 'both';
  showLanyardHole: boolean;
  academicYear: string;
  emergencyContactLabel: string;
  signatoryTitle: string;
}

export const DocumentsHub: React.FC = () => {
  const {
    students,
    academicYears,
    currentUser,
    client,
    authFetch,
  } = useApp();

  const currentAcademicYear = useMemo(() => {
    return academicYears.find((y) => y.isActive) || academicYears[0] || null;
  }, [academicYears]);

  const [activeTab, setActiveTab] = useState<DocumentTab>('certificates');

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 1: Certificate & School Documents State
  // ──────────────────────────────────────────────────────────────────────────
  const [certRecipientMode, setCertRecipientMode] = useState<'single' | 'class' | 'custom'>('single');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedClassStd, setSelectedClassStd] = useState<string>('Std 10');
  const [selectedClassDiv, setSelectedClassDiv] = useState<string>('A');

  const [certForm, setCertForm] = useState<CertificateFormData>({
    documentType: 'EVENT_CERTIFICATE',
    templateId: 'classic-gold',
    title: 'Certificate of Achievement',
    eventName: 'Annual Sports & Athletic Championship 2026',
    eventDate: new Date().toISOString().split('T')[0],
    achievement: 'First Prize - 100m Sprint',
    bodyText:
      'This certificate is proudly awarded to {studentName} of {standard} - {division} for demonstrating exemplary sportsmanship, vigor, and outstanding performance in the {eventName} held on {eventDate}.',
    certificateNumber: `CERT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
    issuedDate: new Date().toISOString().split('T')[0],
    signatory1Name: 'Dr. R. K. Sharma',
    signatory1Title: 'Principal',
    signatory2Name: 'Mrs. Ananya Verma',
    signatory2Title: 'Event & Sports In-Charge',
    schoolName: brand.schoolName || client?.name || 'Grand Heritage International Academy',
    schoolAddress: brand.address || 'Knowledge Park, Silicon Expressway, City Campus',
    schoolAffiliation: 'Affiliated with CBSE / State Board • U-DISE Code: 24070500128',
  });

  const [isIssuing, setIsIssuing] = useState(false);
  const [issueSuccessMsg, setIssueSuccessMsg] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 2: ID Card Generator State
  // ──────────────────────────────────────────────────────────────────────────
  const [idScope, setIdScope] = useState<'standard' | 'division' | 'whole' | 'single' | 'staff'>('standard');
  const [idStandard, setIdStandard] = useState<string>('All');
  const [idDivision, setIdDivision] = useState<string>('All');
  const [idSearchQuery, setIdSearchQuery] = useState<string>('');
  const [selectedForCard, setSelectedForCard] = useState<string[]>([]);
  const [idCardPreviewStudent, setIdCardPreviewStudent] = useState<any | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const [idConfig, setIdConfig] = useState<IdCardConfig>({
    orientation: 'vertical',
    theme: 'navy',
    sides: 'both',
    showLanyardHole: true,
    academicYear: currentAcademicYear?.name || '2026-2027',
    emergencyContactLabel: 'Emergency / Parent Contact',
    signatoryTitle: 'Authorized Principal Signature',
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 3: Issued Registry State
  // ──────────────────────────────────────────────────────────────────────────
  const [registryRecords, setRegistryRecords] = useState<any[]>([]);
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryTypeFilter, setRegistryTypeFilter] = useState('ALL');

  // Available Standards & Divisions derived from database students
  const availableStandards = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.standard && set.add(s.standard));
    const arr = Array.from(set);
    return arr.length > 0 ? arr.sort() : ['Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5', 'Std 6', 'Std 7', 'Std 8', 'Std 9', 'Std 10', 'Std 11', 'Std 12'];
  }, [students]);

  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.division && set.add(s.division));
    const arr = Array.from(set);
    return arr.length > 0 ? arr.sort() : ['A', 'B', 'C', 'D'];
  }, [students]);

  // Selected student for single certificate
  const selectedCertStudent = useMemo(() => {
    if (!selectedStudentId) return students[0] || null;
    return students.find((s) => (s._id || s.id) === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Filtered students for single certificate search modal/dropdown
  const searchedCertStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students.slice(0, 15);
    const q = studentSearchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.grNo && s.grNo.toLowerCase().includes(q)) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q)) ||
        s.standard.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [students, studentSearchQuery]);

  // Filtered students for ID Card Generator
  const filteredIdStudents = useMemo(() => {
    let list = students.filter((s) => s.isActive !== false);

    if (idScope === 'standard' && idStandard !== 'All') {
      list = list.filter((s) => s.standard === idStandard);
    } else if (idScope === 'division') {
      if (idStandard !== 'All') list = list.filter((s) => s.standard === idStandard);
      if (idDivision !== 'All') list = list.filter((s) => s.division === idDivision);
    } else if (idScope === 'single') {
      if (idSearchQuery.trim()) {
        const q = idSearchQuery.toLowerCase();
        list = list.filter(
          (s) =>
            s.studentName.toLowerCase().includes(q) ||
            (s.grNo && s.grNo.toLowerCase().includes(q)) ||
            (s.studentCode && s.studentCode.toLowerCase().includes(q))
        );
      }
    }

    if (idSearchQuery.trim() && idScope !== 'single') {
      const q = idSearchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          (s.grNo && s.grNo.toLowerCase().includes(q)) ||
          (s.studentCode && s.studentCode.toLowerCase().includes(q))
      );
    }

    return list;
  }, [students, idScope, idStandard, idDivision, idSearchQuery]);

  // Sync selected student for single ID card preview
  useEffect(() => {
    if (filteredIdStudents.length > 0 && !idCardPreviewStudent) {
      setIdCardPreviewStudent(filteredIdStudents[0]);
    } else if (filteredIdStudents.length === 0) {
      setIdCardPreviewStudent(null);
    }
  }, [filteredIdStudents, idCardPreviewStudent]);

  // Select all or deselect in ID Card table
  const handleToggleSelectAllCards = () => {
    if (selectedForCard.length === filteredIdStudents.length) {
      setSelectedForCard([]);
    } else {
      setSelectedForCard(filteredIdStudents.map((s) => s._id || s.id));
    }
  };

  const handleToggleCardSelection = (id: string) => {
    setSelectedForCard((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Certificate Text Interpolation Engine
  // ──────────────────────────────────────────────────────────────────────────
  const getInterpolatedBodyText = (student?: any) => {
    const s = student || selectedCertStudent;
    if (!s) return certForm.bodyText;

    let text = certForm.bodyText;
    text = text.replace(/\{studentName\}/g, s.studentName || 'Student Name');
    text = text.replace(/\{standard\}/g, s.standard || 'Std');
    text = text.replace(/\{division\}/g, s.division || 'A');
    text = text.replace(/\{grNo\}/g, s.grNo || s.studentCode || 'N/A');
    text = text.replace(/\{rollNo\}/g, String(s.rollNo || '-'));
    text = text.replace(/\{eventName\}/g, certForm.eventName || 'School Event');
    text = text.replace(/\{eventDate\}/g, certForm.eventDate || '');
    text = text.replace(/\{achievement\}/g, certForm.achievement || '');
    text = text.replace(/\{schoolName\}/g, certForm.schoolName || '');
    text = text.replace(/\{academicYear\}/g, currentAcademicYear?.name || '2026-2027');
    return text;
  };

  // Preset Template Selectors
  const applyCertificatePreset = (type: CertificateFormData['documentType']) => {
    switch (type) {
      case 'EVENT_CERTIFICATE':
        setCertForm((prev) => ({
          ...prev,
          documentType: type,
          templateId: 'classic-gold',
          title: 'Certificate of Achievement',
          eventName: 'Annual Sports & Athletic Championship',
          achievement: 'First Prize - 100m Sprint',
          bodyText:
            'This certificate is proudly awarded to {studentName} of {standard} - {division} for demonstrating exemplary sportsmanship, vigor, and outstanding performance in the {eventName} held on {eventDate}.',
        }));
        break;
      case 'BONAFIDE':
        setCertForm((prev) => ({
          ...prev,
          documentType: type,
          templateId: 'emerald-prestige',
          title: 'Bonafide Certificate',
          eventName: 'Official Academic Enrollment Record',
          achievement: 'Regular Enrolled Student',
          bodyText:
            'This is to officially certify that {studentName}, Son/Daughter of General Register (GR) No. {grNo}, is a bonafide student of this institution studying in {standard} - {division} during the Academic Year {academicYear}. His/Her conduct and character during the session have been satisfactory.',
        }));
        break;
      case 'LEAVING_CERTIFICATE':
        setCertForm((prev) => ({
          ...prev,
          documentType: type,
          templateId: 'minimal-modern',
          title: 'School Transfer / Leaving Certificate',
          eventName: 'Official Transfer Record',
          achievement: 'Successfully Passed & Completed Session',
          bodyText:
            'Certified that {studentName} (GR No: {grNo}, Roll No: {rollNo}) was admitted to this school and has attended classes in {standard} - {division}. All school dues have been settled in full. The student bears good moral character and has permission to seek admission elsewhere.',
        }));
        break;
      case 'CHARACTER_CERTIFICATE':
        setCertForm((prev) => ({
          ...prev,
          documentType: type,
          templateId: 'royal-indigo',
          title: 'Character & Conduct Certificate',
          eventName: 'Character & Behavioral Evaluation',
          achievement: 'Exemplary Discipline & Moral Character',
          bodyText:
            'This is to certify that {studentName}, studying in {standard} - {division} (GR No: {grNo}), is known to the administration for the past academic sessions. To the best of our knowledge and records, he/she bears an exemplary moral character and pleasant disposition.',
        }));
        break;
      case 'APPRECIATION':
        setCertForm((prev) => ({
          ...prev,
          documentType: type,
          templateId: 'classic-gold',
          title: 'Certificate of Special Appreciation',
          eventName: 'Science & Innovation Exhibition 2026',
          achievement: 'Excellence in Scientific Inquiry & Presentation',
          bodyText:
            'In recognition of exceptional diligence, creative excellence, and dedicated participation shown by {studentName} ({standard} - {division}) in {eventName}. The school commends your remarkable contribution.',
        }));
        break;
      case 'CUSTOM':
        setCertForm((prev) => ({
          ...prev,
          documentType: type,
          templateId: 'royal-indigo',
          title: 'Certificate of Distinction',
          eventName: 'Inter-School Cultural & Debate Competition',
          achievement: 'Outstanding Distinction & Recognition',
          bodyText:
            'Presented to {studentName} of {standard} - {division} in honor of commendable accomplishment and distinction in {eventName} on {eventDate}.',
        }));
        break;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Print Certificate Action
  // ──────────────────────────────────────────────────────────────────────────
  const handlePrintCertificate = () => {
    const s = selectedCertStudent;
    const body = getInterpolatedBodyText(s);

    const themeBorderColor =
      certForm.templateId === 'classic-gold'
        ? '#D97706'
        : certForm.templateId === 'royal-indigo'
        ? '#4F46E5'
        : certForm.templateId === 'emerald-prestige'
        ? '#059669'
        : '#334155';

    const themeAccentColor =
      certForm.templateId === 'classic-gold'
        ? '#B45309'
        : certForm.templateId === 'royal-indigo'
        ? '#4338CA'
        : certForm.templateId === 'emerald-prestige'
        ? '#047857'
        : '#0F172A';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${certForm.title} - ${s?.studentName || 'Student'}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            margin: 0;
            padding: 12mm;
            background: #FAFAFA;
            font-family: 'Times New Roman', Georgia, serif;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 297mm;
            height: 210mm;
          }
          .cert-outer-border {
            width: 100%;
            height: 100%;
            border: 8px solid ${themeBorderColor};
            padding: 5px;
            background: #FFFFFF;
            position: relative;
          }
          .cert-inner-border {
            width: 100%;
            height: 100%;
            border: 2px dashed ${themeBorderColor};
            padding: 24px 36px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            position: relative;
            background: radial-gradient(circle at center, #FFFFFF 0%, #FAFAFA 100%);
          }
          .watermark-emblem {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            height: 320px;
            opacity: 0.04;
            pointer-events: none;
          }
          .school-header h1 {
            margin: 0;
            font-size: 26pt;
            font-weight: 800;
            color: ${themeAccentColor};
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .school-header p {
            margin: 4px 0 0 0;
            font-size: 10pt;
            color: #64748B;
            font-family: Arial, sans-serif;
            letter-spacing: 0.5px;
          }
          .cert-title-container {
            margin: 12px 0 6px 0;
          }
          .cert-badge {
            display: inline-block;
            font-family: Arial, sans-serif;
            font-size: 8pt;
            font-weight: 800;
            color: ${themeAccentColor};
            text-transform: uppercase;
            letter-spacing: 3px;
            background: rgba(0,0,0,0.04);
            padding: 3px 12px;
            border-radius: 999px;
            border: 1px solid ${themeBorderColor};
            margin-bottom: 6px;
          }
          .cert-title {
            font-size: 28pt;
            font-weight: 700;
            color: #0F172A;
            margin: 0;
            letter-spacing: 1px;
            font-family: Georgia, serif;
          }
          .recipient-container {
            margin: 8px 0;
          }
          .presented-to {
            font-size: 11pt;
            font-style: italic;
            color: #64748B;
            margin-bottom: 4px;
          }
          .recipient-name {
            font-size: 26pt;
            font-weight: 800;
            color: ${themeAccentColor};
            text-decoration: underline;
            text-underline-offset: 6px;
            text-decoration-color: ${themeBorderColor};
            margin: 0;
            letter-spacing: 0.5px;
          }
          .cert-body {
            font-size: 12pt;
            line-height: 1.6;
            color: #334155;
            max-width: 820px;
            margin: 10px auto;
            font-family: Georgia, serif;
          }
          .achievement-pill {
            display: inline-block;
            margin-top: 4px;
            padding: 6px 16px;
            background: #FEF3C7;
            border: 1.5px solid #F59E0B;
            color: #92400E;
            font-family: Arial, sans-serif;
            font-weight: 700;
            font-size: 11pt;
            border-radius: 8px;
          }
          .cert-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 14px;
            border-top: 1px solid #E2E8F0;
            margin-top: 12px;
          }
          .signatory-box {
            width: 200px;
            text-align: center;
          }
          .sign-line {
            width: 160px;
            height: 1px;
            background: #94A3B8;
            margin: 0 auto 6px auto;
          }
          .sign-name {
            font-size: 11pt;
            font-weight: 700;
            color: #0F172A;
            margin: 0;
          }
          .sign-title {
            font-size: 9pt;
            color: #64748B;
            font-family: Arial, sans-serif;
            margin: 2px 0 0 0;
          }
          .cert-seal {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            border: 2px solid ${themeBorderColor};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            font-size: 7pt;
            font-weight: 800;
            color: ${themeAccentColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: #FFFBEB;
          }
          .cert-meta {
            position: absolute;
            bottom: 6px;
            left: 20px;
            right: 20px;
            display: flex;
            justify-content: space-between;
            font-family: monospace;
            font-size: 7.5pt;
            color: #94A3B8;
          }
        </style>
      </head>
      <body>
        <div class="cert-outer-border">
          <div class="cert-inner-border">
            <svg class="watermark-emblem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>

            <!-- School Header -->
            <div class="school-header">
              <h1>${certForm.schoolName}</h1>
              <p>${certForm.schoolAddress} • ${certForm.schoolAffiliation}</p>
            </div>

            <!-- Title -->
            <div class="cert-title-container">
              <span class="cert-badge">Honorable Recognition</span>
              <h2 class="cert-title">${certForm.title}</h2>
            </div>

            <!-- Recipient -->
            <div class="recipient-container">
              <div class="presented-to">This is proudly awarded and presented to</div>
              <h3 class="recipient-name">${s?.studentName || 'Recipient Name'}</h3>
            </div>

            <!-- Body -->
            <div class="cert-body">
              ${body}
              ${certForm.achievement ? `<br><span class="achievement-pill">🏆 ${certForm.achievement}</span>` : ''}
            </div>

            <!-- Signatures -->
            <div class="cert-footer">
              <div class="signatory-box">
                <div class="sign-line"></div>
                <div class="sign-name">${certForm.signatory1Name}</div>
                <div class="sign-title">${certForm.signatory1Title}</div>
              </div>

              <div class="cert-seal">
                <span>OFFICIAL</span>
                <span style="font-size: 9pt; font-weight: 900;">★ SEAL ★</span>
                <span>VERIFIED</span>
              </div>

              <div class="signatory-box">
                <div class="sign-line"></div>
                <div class="sign-name">${certForm.signatory2Name}</div>
                <div class="sign-title">${certForm.signatory2Title}</div>
              </div>
            </div>

            <div class="cert-meta">
              <span>CERTIFICATE ID: ${certForm.certificateNumber}</span>
              <span>DATE OF ISSUE: ${certForm.issuedDate}</span>
              <span>GR NO: ${s?.grNo || s?.studentCode || 'N/A'}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printHTML(html);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Save & Issue Certificate to DB
  // ──────────────────────────────────────────────────────────────────────────
  const handleSaveAndIssueCertificate = async () => {
    setIsIssuing(true);
    setIssueSuccessMsg(null);

    try {
      let recipients: any[] = [];

      if (certRecipientMode === 'single') {
        const s = selectedCertStudent;
        if (!s) throw new Error('No student selected');
        recipients = [
          {
            studentId: s._id || s.id,
            studentName: s.studentName,
            standard: s.standard,
            division: s.division,
            grNo: s.grNo || s.studentCode || '',
            rollNo: s.rollNo || null,
            achievement: certForm.achievement,
            bodyText: getInterpolatedBodyText(s),
          },
        ];
      } else if (certRecipientMode === 'class') {
        const classStudents = students.filter(
          (s) => s.standard === selectedClassStd && s.division === selectedClassDiv && s.isActive !== false
        );
        if (classStudents.length === 0) throw new Error(`No active students found in ${selectedClassStd} - ${selectedClassDiv}`);

        recipients = classStudents.map((s) => ({
          studentId: s._id || s.id,
          studentName: s.studentName,
          standard: s.standard,
          division: s.division,
          grNo: s.grNo || s.studentCode || '',
          rollNo: s.rollNo || null,
          achievement: certForm.achievement,
          bodyText: getInterpolatedBodyText(s),
        }));
      }

      const res = await authFetch('/api/v1/documents/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: certForm.documentType,
          title: certForm.title,
          academicYear: currentAcademicYear?.name || '2026-2027',
          academicYearId: currentAcademicYear?._id,
          eventName: certForm.eventName,
          eventDate: certForm.eventDate,
          achievement: certForm.achievement,
          bodyText: certForm.bodyText,
          templateId: certForm.templateId,
          signatory1: { name: certForm.signatory1Name, title: certForm.signatory1Title },
          signatory2: { name: certForm.signatory2Name, title: certForm.signatory2Title },
          recipients,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to issue documents');

      setIssueSuccessMsg(`Successfully issued ${data.count || recipients.length} certificate(s)!`);
      fetchRegistryRecords();
    } catch (err: any) {
      alert(err.message || 'Error issuing document');
    } finally {
      setIsIssuing(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 2: ID Card Printing Engine
  // ──────────────────────────────────────────────────────────────────────────
  const getThemePalette = (theme: IdCardConfig['theme']) => {
    switch (theme) {
      case 'navy':
        return { headerBg: '#1E3A8A', accent: '#3B82F6', light: '#EFF6FF', text: '#1E293B' };
      case 'emerald':
        return { headerBg: '#065F46', accent: '#10B981', light: '#ECFDF5', text: '#064E3B' };
      case 'crimson':
        return { headerBg: '#881337', accent: '#F43F5E', light: '#FFF1F2', text: '#4C0519' };
      case 'slate':
        return { headerBg: '#0F172A', accent: '#64748B', light: '#F8FAFC', text: '#0F172A' };
      case 'teal':
        return { headerBg: '#0F766E', accent: '#14B8A6', light: '#F0FDFA', text: '#134E4A' };
    }
  };

  // Print Batch / Sheet ID Cards
  const handlePrintIdCardsSheet = (studentsToPrint: any[]) => {
    if (studentsToPrint.length === 0) {
      alert('Please select at least one student to print ID cards.');
      return;
    }

    const pal = getThemePalette(idConfig.theme);
    const isVert = idConfig.orientation === 'vertical';
    const schoolName = brand.schoolName || client?.name || 'Grand Heritage International Academy';
    const schoolAddr = brand.address || 'Knowledge Park, City Campus, State';
    const schoolPhone = brand.phone || '+91 98765 43210';

    const cardWidth = isVert ? '54mm' : '85.6mm';
    const cardHeight = isVert ? '85.6mm' : '54mm';

    const cardsHTML = studentsToPrint
      .map((s, idx) => {
        const photoOrInitials = s.photoUrl
          ? `<img src="${s.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;">`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: ${pal.light}; color: ${pal.headerBg}; font-size: 16pt; font-weight: 800;">${(s.studentName || 'S').slice(0, 2).toUpperCase()}</div>`;

        // Front Card
        const frontCard = `
          <div class="id-card ${isVert ? 'id-card-vert' : 'id-card-horiz'}">
            ${idConfig.showLanyardHole ? '<div class="lanyard-hole"></div>' : ''}
            <div class="card-header">
              <div class="school-logo-pill">★</div>
              <div class="card-school-name">${schoolName}</div>
              <div class="card-school-sub">STUDENT IDENTITY CARD • ${idConfig.academicYear}</div>
            </div>

            <div class="card-body">
              <div class="photo-container">${photoOrInitials}</div>
              <div class="student-name-block">
                <div class="card-student-name">${s.studentName}</div>
                <div class="card-student-class">CLASS: <strong>${s.standard} - ${s.division}</strong></div>
              </div>

              <div class="card-meta-grid">
                <div class="meta-row"><span>ROLL NO:</span> <strong>${s.rollNo || '-'}</strong></div>
                <div class="meta-row"><span>GR NO:</span> <strong>${s.grNo || s.studentCode || 'N/A'}</strong></div>
                <div class="meta-row"><span>BLOOD GRP:</span> <strong>${s.profile?.bloodGroup || s.bloodGroup || 'O+'}</strong></div>
                <div class="meta-row"><span>DOB:</span> <strong>${s.dob ? new Date(s.dob).toLocaleDateString('en-GB') : 'N/A'}</strong></div>
                <div class="meta-row full-width"><span>PARENT:</span> <strong>${s.parentName || s.fatherName || 'Guardian'}</strong></div>
                <div class="meta-row full-width"><span>CONTACT:</span> <strong>${s.parentMobile || s.emergencyContact || schoolPhone}</strong></div>
              </div>
            </div>

            <div class="card-footer">
              <div class="barcode-fake">|||| | | ||||| | ||| |||| |</div>
              <div class="sign-block">
                <div class="sign-line-micro"></div>
                <span>PRINCIPAL</span>
              </div>
            </div>
          </div>
        `;

        // Back Card
        const backCard = `
          <div class="id-card ${isVert ? 'id-card-vert' : 'id-card-horiz'} back-card">
            ${idConfig.showLanyardHole ? '<div class="lanyard-hole"></div>' : ''}
            <div class="card-header back-header">
              <div class="card-school-name" style="font-size: 8.5pt;">${schoolName}</div>
              <div class="card-school-sub">EMERGENCY & INSTRUCTION MANUAL</div>
            </div>

            <div class="back-body">
              <div class="back-item">
                <span class="back-label">RESIDENTIAL ADDRESS:</span>
                <p class="back-val">${s.address || 'Address registered in school records'}</p>
              </div>

              <div class="back-item">
                <span class="back-label">EMERGENCY HELPLINE:</span>
                <p class="back-val"><strong>${s.parentMobile || s.emergencyContact || schoolPhone}</strong> / ${schoolPhone}</p>
              </div>

              <div class="back-item">
                <span class="back-label">TRANSPORT / ROUTE:</span>
                <p class="back-val">${s.transportType || 'Self Transport'}</p>
              </div>

              <div class="guidelines-box">
                <p>1. This card is non-transferable and must be displayed during school hours.</p>
                <p>2. In case of loss, report immediately to the administration office.</p>
                <p>3. Finder is requested to return to the school address listed above.</p>
              </div>
            </div>

            <div class="back-footer">
              <div class="qr-code-box">QR VERIFIED</div>
              <div class="valid-box">VALID TILL: <strong>31-MAR-2027</strong></div>
            </div>
          </div>
        `;

        if (idConfig.sides === 'front') return frontCard;
        if (idConfig.sides === 'back') return backCard;
        return `<div class="card-pair-wrapper">${frontCard}${backCard}</div>`;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ID Cards Print Sheet (${studentsToPrint.length} Cards)</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: #FFFFFF;
          }
          .sheet-grid {
            display: grid;
            grid-template-columns: repeat(${isVert ? 3 : 2}, 1fr);
            gap: 6mm;
            width: 100%;
          }
          .card-pair-wrapper {
            display: flex;
            gap: 4mm;
            page-break-inside: avoid;
            margin-bottom: 6mm;
          }
          .id-card {
            width: ${cardWidth};
            height: ${cardHeight};
            border: 1px solid #CBD5E1;
            border-radius: 4mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            background: #FFFFFF;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            page-break-inside: avoid;
          }
          .lanyard-hole {
            width: 12mm;
            height: 3mm;
            background: #E2E8F0;
            border: 1px dashed #94A3B8;
            border-radius: 2mm;
            margin: 2mm auto 1mm auto;
          }
          .card-header {
            background: ${pal.headerBg};
            color: #FFFFFF;
            padding: 2.5mm 3mm;
            text-align: center;
          }
          .school-logo-pill {
            display: inline-block;
            background: ${pal.accent};
            color: white;
            font-size: 7pt;
            padding: 1px 4px;
            border-radius: 999px;
            margin-bottom: 1mm;
          }
          .card-school-name {
            font-size: 8pt;
            font-weight: 800;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            line-height: 1.1;
          }
          .card-school-sub {
            font-size: 5.5pt;
            font-weight: 600;
            color: rgba(255,255,255,0.8);
            letter-spacing: 0.4px;
            margin-top: 1px;
          }
          .card-body {
            padding: 2.5mm 3.5mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            flex: 1;
          }
          .photo-container {
            width: 22mm;
            height: 25mm;
            border-radius: 2mm;
            border: 1.5px solid ${pal.headerBg};
            overflow: hidden;
            margin-bottom: 2mm;
            background: #F1F5F9;
          }
          .student-name-block {
            margin-bottom: 2mm;
          }
          .card-student-name {
            font-size: 9.5pt;
            font-weight: 800;
            color: ${pal.text};
            line-height: 1.1;
          }
          .card-student-class {
            font-size: 7.5pt;
            color: ${pal.accent};
            font-weight: 700;
            margin-top: 1px;
          }
          .card-meta-grid {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1mm 2mm;
            font-size: 6.5pt;
            text-align: left;
            background: ${pal.light};
            padding: 2mm;
            border-radius: 1.5mm;
            border: 0.5px solid #E2E8F0;
          }
          .meta-row span {
            color: #64748B;
          }
          .meta-row strong {
            color: #0F172A;
          }
          .meta-row.full-width {
            grid-column: span 2;
          }
          .card-footer {
            padding: 1.5mm 3mm;
            border-top: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #FAFAFA;
          }
          .barcode-fake {
            font-family: monospace;
            font-size: 8pt;
            letter-spacing: 1.5px;
            color: #0F172A;
            font-weight: 900;
          }
          .sign-block {
            text-align: center;
            font-size: 5pt;
            color: #64748B;
          }
          .sign-line-micro {
            width: 15mm;
            height: 0.5px;
            background: #64748B;
            margin-bottom: 1px;
          }

          /* Back Card Styling */
          .back-card {
            background: #FFFFFF;
          }
          .back-header {
            background: #334155;
          }
          .back-body {
            padding: 3mm;
            font-size: 6.5pt;
            text-align: left;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
          }
          .back-label {
            font-weight: 800;
            color: #475569;
            font-size: 6pt;
          }
          .back-val {
            margin: 0.5mm 0 0 0;
            color: #0F172A;
          }
          .guidelines-box {
            background: #F8FAFC;
            padding: 2mm;
            border-radius: 1mm;
            font-size: 5.5pt;
            color: #64748B;
            line-height: 1.25;
            margin-top: auto;
          }
          .guidelines-box p { margin: 1px 0; }
          .back-footer {
            padding: 2mm 3mm;
            background: #F1F5F9;
            border-top: 1px solid #CBD5E1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 6pt;
          }
          .qr-code-box {
            font-weight: 800;
            color: #0F172A;
            border: 1px solid #94A3B8;
            padding: 1px 3px;
            border-radius: 1px;
          }
        </style>
      </head>
      <body>
        <div class="${idConfig.sides === 'both' ? 'sheet-pairs' : 'sheet-grid'}">
          ${cardsHTML}
        </div>
      </body>
      </html>
    `;

    printHTML(html);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Tab 3: Registry Fetching
  // ──────────────────────────────────────────────────────────────────────────
  const fetchRegistryRecords = async () => {
    setLoadingRegistry(true);
    try {
      const res = await authFetch('/api/v1/documents?limit=100');
      if (res.ok) {
        const data = await res.json();
        setRegistryRecords(data.documents || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingRegistry(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'registry') {
      fetchRegistryRecords();
    }
  }, [activeTab]);

  const filteredRegistry = useMemo(() => {
    let list = registryRecords;
    if (registryTypeFilter !== 'ALL') {
      list = list.filter((r) => r.documentType === registryTypeFilter);
    }
    if (registrySearch.trim()) {
      const q = registrySearch.toLowerCase();
      list = list.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.certificateNumber.toLowerCase().includes(q) ||
          (r.eventName && r.eventName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [registryRecords, registryTypeFilter, registrySearch]);

  // ──────────────────────────────────────────────────────────────────────────
  // Main Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <Award className="h-3.5 w-3.5" /> Official Documents & ID System
            </span>
            <span className="text-xs font-bold text-slate-400">
              Session: {currentAcademicYear?.name || '2026-2027'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            Documents & Identity Cards Hub
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Issue customized school certificates, award recognitions, and print database-synced student ID cards in bulk or individually.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === 'certificates'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileBadge className="h-4 w-4" />
            Certificates & Documents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('id-cards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === 'id-cards'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <IdCard className="h-4 w-4" />
            ID Card Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === 'registry'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            Issued Registry
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CERTIFICATES & DOCUMENTS DESIGNER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'certificates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form & Customization Controls */}
          <div className="lg:col-span-5 space-y-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            {/* 1. Certificate Type Presets */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                1. Select Document / Certificate Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'EVENT_CERTIFICATE', label: 'Sports & Events', icon: '🏆' },
                  { id: 'BONAFIDE', label: 'Bonafide Certificate', icon: '📜' },
                  { id: 'LEAVING_CERTIFICATE', label: 'Transfer / LC', icon: '🎓' },
                  { id: 'CHARACTER_CERTIFICATE', label: 'Character Certificate', icon: '🎖️' },
                  { id: 'APPRECIATION', label: 'Special Appreciation', icon: '⭐' },
                  { id: 'CUSTOM', label: 'Custom Certificate', icon: '✏️' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyCertificatePreset(item.id as any)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      certForm.documentType === item.id
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Recipient Selection */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                2. Target Recipient(s)
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setCertRecipientMode('single')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border ${
                    certRecipientMode === 'single'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Single Student
                </button>
                <button
                  type="button"
                  onClick={() => setCertRecipientMode('class')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border ${
                    certRecipientMode === 'class'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Entire Class / Batch
                </button>
              </div>

              {certRecipientMode === 'single' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student by name, roll no, or GR..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                    {searchedCertStudents.map((s) => (
                      <div
                        key={s._id || s.id}
                        onClick={() => setSelectedStudentId(s._id || s.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          (selectedStudentId || students[0]?._id || students[0]?.id) === (s._id || s.id)
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>{s.studentName}</div>
                          <div className={`text-[10px] ${selectedStudentId === (s._id || s.id) ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {s.standard} - {s.division} • GR: {s.grNo || s.studentCode || 'N/A'} • Roll: {s.rollNo || '-'}
                          </div>
                        </div>
                        {(selectedStudentId || students[0]?._id || students[0]?.id) === (s._id || s.id) && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Standard</label>
                    <select
                      value={selectedClassStd}
                      onChange={(e) => setSelectedClassStd(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                    >
                      {availableStandards.map((std) => (
                        <option key={std} value={std}>{std}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Division</label>
                    <select
                      value={selectedClassDiv}
                      onChange={(e) => setSelectedClassDiv(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                    >
                      {availableDivisions.map((div) => (
                        <option key={div} value={div}>Division {div}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 text-[11px] text-slate-500 font-semibold mt-1">
                    Will batch-generate certificates for all active students in {selectedClassStd} - {selectedClassDiv}.
                  </div>
                </div>
              )}
            </div>

            {/* 3. Certificate Theme Template */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                3. Certificate Border & Styling Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'classic-gold', name: 'Classic Gold Guilloche', bg: 'bg-amber-500' },
                  { id: 'royal-indigo', name: 'Royal Indigo Modern', bg: 'bg-indigo-600' },
                  { id: 'emerald-prestige', name: 'Emerald Heritage', bg: 'bg-emerald-600' },
                  { id: 'minimal-modern', name: 'Minimalist Slate', bg: 'bg-slate-700' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setCertForm((prev) => ({ ...prev, templateId: tpl.id as any }))}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold text-left ${
                      certForm.templateId === tpl.id
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-slate-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${tpl.bg}`} />
                    <span className="truncate">{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Event & Citation Fields */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                4. Event & Citation Customization
              </label>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Certificate Title</label>
                <input
                  type="text"
                  value={certForm.title}
                  onChange={(e) => setCertForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Event / Competition Name</label>
                <input
                  type="text"
                  value={certForm.eventName}
                  onChange={(e) => setCertForm((prev) => ({ ...prev, eventName: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Event Date</label>
                  <input
                    type="date"
                    value={certForm.eventDate}
                    onChange={(e) => setCertForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Achievement / Rank</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Position"
                    value={certForm.achievement}
                    onChange={(e) => setCertForm((prev) => ({ ...prev, achievement: e.target.value }))}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                  <span>Citation Body Text</span>
                  <span className="text-slate-400 font-normal">Supports {'{studentName}'}, {'{standard}'}, etc.</span>
                </label>
                <textarea
                  rows={3}
                  value={certForm.bodyText}
                  onChange={(e) => setCertForm((prev) => ({ ...prev, bodyText: e.target.value }))}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs leading-relaxed outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Signatory 1 (Principal)</label>
                  <input
                    type="text"
                    value={certForm.signatory1Name}
                    onChange={(e) => setCertForm((prev) => ({ ...prev, signatory1Name: e.target.value }))}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Signatory 2 (In-Charge)</label>
                  <input
                    type="text"
                    value={certForm.signatory2Name}
                    onChange={(e) => setCertForm((prev) => ({ ...prev, signatory2Name: e.target.value }))}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-100 pt-4 flex gap-2">
              <button
                type="button"
                onClick={handlePrintCertificate}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
              >
                <Printer className="h-4 w-4" />
                Print Certificate
              </button>
              <button
                type="button"
                onClick={handleSaveAndIssueCertificate}
                disabled={isIssuing}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all disabled:opacity-50"
              >
                {isIssuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Issue to Registry
              </button>
            </div>

            {issueSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {issueSuccessMsg}
              </div>
            )}
          </div>

          {/* Right Column: Live High-Definition Certificate Preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">
              <span>Live Visual Preview (A4 Landscape Formatted)</span>
              <span className="text-indigo-600 font-bold flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Interactive WYSIWYG
              </span>
            </div>

            {/* Certificate Canvas Preview Card */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden aspect-[1.414/1]">
              <div
                className={`w-full h-full border-4 ${
                  certForm.templateId === 'classic-gold'
                    ? 'border-amber-600 bg-amber-50/20'
                    : certForm.templateId === 'royal-indigo'
                    ? 'border-indigo-600 bg-indigo-50/20'
                    : certForm.templateId === 'emerald-prestige'
                    ? 'border-emerald-600 bg-emerald-50/20'
                    : 'border-slate-800 bg-slate-50/30'
                } p-2 rounded-lg flex flex-col justify-between text-center relative`}
              >
                <div className="w-full h-full border border-dashed border-slate-400/80 p-5 flex flex-col justify-between">
                  {/* Watermark Crest */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <Award className="w-64 h-64 text-slate-900" />
                  </div>

                  {/* Header */}
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
                      {certForm.schoolName}
                    </h2>
                    <p className="text-[10px] text-slate-500 tracking-wide font-sans mt-0.5">
                      {certForm.schoolAddress}
                    </p>
                  </div>

                  {/* Title & Badge */}
                  <div>
                    <span className="inline-block px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-300">
                      ★ Recognition of Excellence ★
                    </span>
                    <h3 className="text-2xl font-serif font-black text-slate-900 mt-1">
                      {certForm.title}
                    </h3>
                  </div>

                  {/* Recipient */}
                  <div>
                    <p className="text-[11px] font-serif italic text-slate-500">
                      This certificate is proudly awarded to
                    </p>
                    <h4 className="text-2xl font-serif font-black text-indigo-950 underline decoration-amber-500 underline-offset-4 mt-0.5">
                      {selectedCertStudent?.studentName || 'Student Full Name'}
                    </h4>
                  </div>

                  {/* Body & Citation */}
                  <div className="px-4">
                    <p className="text-[11.5px] font-serif text-slate-700 leading-relaxed max-w-xl mx-auto">
                      {getInterpolatedBodyText(selectedCertStudent)}
                    </p>
                    {certForm.achievement && (
                      <div className="inline-block mt-2 px-3 py-1 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs font-black shadow-xs">
                        🏆 {certForm.achievement}
                      </div>
                    )}
                  </div>

                  {/* Footer & Signatories */}
                  <div className="flex justify-between items-end border-t border-slate-200/80 pt-3">
                    <div className="w-36 text-center">
                      <div className="w-28 h-px bg-slate-400 mx-auto mb-1" />
                      <div className="text-xs font-bold text-slate-800">{certForm.signatory1Name}</div>
                      <div className="text-[9px] text-slate-500 font-sans">{certForm.signatory1Title}</div>
                    </div>

                    <div className="w-16 h-16 rounded-full border-2 border-amber-600 bg-amber-50 flex flex-col items-center justify-center text-[7px] font-black text-amber-900 tracking-tighter">
                      <span>OFFICIAL</span>
                      <span className="text-[10px]">★ SEAL ★</span>
                      <span>ACCREDITED</span>
                    </div>

                    <div className="w-36 text-center">
                      <div className="w-28 h-px bg-slate-400 mx-auto mb-1" />
                      <div className="text-xs font-bold text-slate-800">{certForm.signatory2Name}</div>
                      <div className="text-[9px] text-slate-500 font-sans">{certForm.signatory2Title}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
              <span>Verified Certificate ID: <strong className="font-mono text-slate-800">{certForm.certificateNumber}</strong></span>
              <span>Class: <strong className="text-slate-800">{selectedCertStudent?.standard || 'Std 10'} - {selectedCertStudent?.division || 'A'}</strong></span>
              <span>Issue Date: <strong className="text-slate-800">{certForm.issuedDate}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ID CARD GENERATOR (I-CARD ENGINE) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'id-cards' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Scope filter selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'standard', label: 'Std Wise' },
                  { id: 'division', label: 'Div Wise' },
                  { id: 'whole', label: 'Whole School' },
                  { id: 'single', label: 'Single Student' },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setIdScope(sc.id as any);
                      setSelectedForCard([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      idScope === sc.id
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handlePrintIdCardsSheet(
                      selectedForCard.length > 0
                        ? filteredIdStudents.filter((s) => selectedForCard.includes(s._id || s.id))
                        : filteredIdStudents
                    )
                  }
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Printer className="h-4 w-4" />
                  Print A4 Sheet ({selectedForCard.length > 0 ? selectedForCard.length : filteredIdStudents.length} Cards)
                </button>
              </div>
            </div>

            {/* Filter Dropdowns row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {/* Standard Dropdown */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">Standard / Class</label>
                <select
                  value={idStandard}
                  onChange={(e) => setIdStandard(e.target.value)}
                  disabled={idScope === 'whole'}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none disabled:opacity-50"
                >
                  <option value="All">All Standards</option>
                  {availableStandards.map((std) => (
                    <option key={std} value={std}>{std}</option>
                  ))}
                </select>
              </div>

              {/* Division Dropdown */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">Division / Section</label>
                <select
                  value={idDivision}
                  onChange={(e) => setIdDivision(e.target.value)}
                  disabled={idScope === 'whole' || idScope === 'standard'}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none disabled:opacity-50"
                >
                  <option value="All">All Divisions</option>
                  {availableDivisions.map((div) => (
                    <option key={div} value={div}>Division {div}</option>
                  ))}
                </select>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">Card Palette</label>
                <select
                  value={idConfig.theme}
                  onChange={(e) => setIdConfig((prev) => ({ ...prev, theme: e.target.value as any }))}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="navy">Navy Blue Classic</option>
                  <option value="emerald">Emerald Forest</option>
                  <option value="crimson">Crimson Regal</option>
                  <option value="slate">Slate Modern</option>
                  <option value="teal">Teal Vibrant</option>
                </select>
              </div>

              {/* Sides to Print */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">Sides & Layout</label>
                <select
                  value={idConfig.sides}
                  onChange={(e) => setIdConfig((prev) => ({ ...prev, sides: e.target.value as any }))}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="both">Both Sides (Front & Back)</option>
                  <option value="front">Front View Only</option>
                  <option value="back">Back View Only</option>
                </select>
              </div>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by Name, GR No, or Roll Number to filter ID cards..."
                value={idSearchQuery}
                onChange={(e) => setIdSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Cards & Student Selection Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Students Table with checkboxes */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedForCard.length > 0 && selectedForCard.length === filteredIdStudents.length}
                    onChange={handleToggleSelectAllCards}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-extrabold text-slate-800">
                    {filteredIdStudents.length} Students Available
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-600">
                  {selectedForCard.length} Selected for Print
                </span>
              </div>

              <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                {filteredIdStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active student records match the selected scope and filters.
                  </div>
                ) : (
                  filteredIdStudents.map((s) => {
                    const isSelected = selectedForCard.includes(s._id || s.id);
                    const isCurrentPreview = (idCardPreviewStudent?._id || idCardPreviewStudent?.id) === (s._id || s.id);

                    return (
                      <div
                        key={s._id || s.id}
                        className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                          isCurrentPreview ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setIdCardPreviewStudent(s)}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleCardSelection(s._id || s.id);
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 overflow-hidden">
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (s.studentName || 'S').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{s.studentName}</div>
                            <div className="text-[10px] text-slate-400">
                              {s.standard} - {s.division} • GR: {s.grNo || s.studentCode || 'N/A'} • Blood: {s.profile?.bloodGroup || 'O+'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintIdCardsSheet([s]);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-indigo-600 transition-colors"
                            title="Print this single ID card"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Interactive 3D/Flat ID Card Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">
                <span>Selected Card Preview</span>
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200/60 hover:bg-indigo-100 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Flip to {isFlipped ? 'Front' : 'Back'}
                </button>
              </div>

              {idCardPreviewStudent ? (
                <div className="flex flex-col items-center">
                  {/* Card Shell */}
                  <div className="w-[300px] h-[460px] bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between relative transition-all duration-300">
                    {/* Lanyard Punch Hole Indicator */}
                    {idConfig.showLanyardHole && (
                      <div className="w-16 h-3 bg-slate-200 border border-dashed border-slate-400 rounded-full mx-auto mt-2" />
                    )}

                    {!isFlipped ? (
                      /* FRONT SIDE */
                      <>
                        <div
                          className={`p-3 text-center text-white ${
                            idConfig.theme === 'navy'
                              ? 'bg-blue-900'
                              : idConfig.theme === 'emerald'
                              ? 'bg-emerald-900'
                              : idConfig.theme === 'crimson'
                              ? 'bg-rose-950'
                              : idConfig.theme === 'slate'
                              ? 'bg-slate-900'
                              : 'bg-teal-900'
                          }`}
                        >
                          <span className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-white/20 mb-1">
                            ★ STUDENT IDENTITY CARD ★
                          </span>
                          <h4 className="font-black text-xs uppercase tracking-tight">
                            {brand.schoolName || client?.name || 'Grand Heritage Academy'}
                          </h4>
                          <p className="text-[9px] text-white/70 font-semibold mt-0.5">
                            ACADEMIC YEAR {idConfig.academicYear}
                          </p>
                        </div>

                        <div className="p-4 flex flex-col items-center text-center flex-1">
                          <div className="w-24 h-28 rounded-xl border-2 border-indigo-600 bg-slate-100 overflow-hidden shadow-inner mb-3">
                            {idCardPreviewStudent.photoUrl ? (
                              <img src={idCardPreviewStudent.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl font-black text-indigo-900 bg-indigo-50">
                                {(idCardPreviewStudent.studentName || 'S').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <h5 className="font-extrabold text-sm text-slate-900">
                            {idCardPreviewStudent.studentName}
                          </h5>
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-black bg-indigo-50 text-indigo-700 mt-1">
                            Class: {idCardPreviewStudent.standard} - {idCardPreviewStudent.division}
                          </span>

                          <div className="w-full grid grid-cols-2 gap-1.5 text-left text-[10px] mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <div><span className="text-slate-400 font-bold">ROLL NO:</span> <strong className="text-slate-800">{idCardPreviewStudent.rollNo || '-'}</strong></div>
                            <div><span className="text-slate-400 font-bold">GR NO:</span> <strong className="text-slate-800">{idCardPreviewStudent.grNo || idCardPreviewStudent.studentCode || 'N/A'}</strong></div>
                            <div><span className="text-slate-400 font-bold">BLOOD GRP:</span> <strong className="text-slate-800">{idCardPreviewStudent.profile?.bloodGroup || idCardPreviewStudent.bloodGroup || 'O+'}</strong></div>
                            <div><span className="text-slate-400 font-bold">DOB:</span> <strong className="text-slate-800">{idCardPreviewStudent.dob ? new Date(idCardPreviewStudent.dob).toLocaleDateString('en-GB') : 'N/A'}</strong></div>
                            <div className="col-span-2"><span className="text-slate-400 font-bold">PARENT:</span> <strong className="text-slate-800">{idCardPreviewStudent.parentName || idCardPreviewStudent.fatherName || 'Guardian'}</strong></div>
                            <div className="col-span-2"><span className="text-slate-400 font-bold">PHONE:</span> <strong className="text-slate-800">{idCardPreviewStudent.parentMobile || idCardPreviewStudent.emergencyContact || 'Registered'}</strong></div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-600">
                          <div className="font-mono tracking-widest font-black text-slate-900">|||| | | ||||| | |||</div>
                          <div className="text-center">
                            <div className="w-16 h-px bg-slate-400 mb-0.5" />
                            <span className="font-bold">PRINCIPAL</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* BACK SIDE */
                      <>
                        <div className="p-3 text-center text-white bg-slate-800">
                          <h4 className="font-bold text-xs uppercase tracking-tight">
                            EMERGENCY DETAILS & RULES
                          </h4>
                          <p className="text-[9px] text-white/70">Campus Helpline: +91 98765 43210</p>
                        </div>

                        <div className="p-4 space-y-3 text-left text-[10.5px] flex-1">
                          <div>
                            <span className="block text-[9px] font-black uppercase text-slate-400">Residential Address</span>
                            <p className="text-slate-700 leading-tight mt-0.5">
                              {idCardPreviewStudent.address || 'Address registered on file in school records.'}
                            </p>
                          </div>

                          <div>
                            <span className="block text-[9px] font-black uppercase text-slate-400">Transport Route</span>
                            <p className="text-slate-700 font-bold mt-0.5">
                              {idCardPreviewStudent.transportType || 'Self Transportation'}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[9px] text-slate-500 leading-relaxed space-y-1">
                            <p>• This ID Card is the property of the school and non-transferable.</p>
                            <p>• Must be worn during all academic days & school excursions.</p>
                            <p>• If found, kindly return to the administrative office.</p>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-600">
                          <span className="font-bold font-mono">SCANNABLE QR VERIFIED</span>
                          <span className="font-bold text-slate-800">EXP: 31-MAR-2027</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintIdCardsSheet([idCardPreviewStudent])}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Single Card
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  Select a student from the list to preview ID Card.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: ISSUED DOCUMENTS REGISTRY & HISTORY */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'registry' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-base text-slate-900">Issued Document Registry</h3>
              <p className="text-xs text-slate-500">Historical archive of certificates and documents issued to students.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={registryTypeFilter}
                onChange={(e) => setRegistryTypeFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="ALL">All Document Types</option>
                <option value="EVENT_CERTIFICATE">Sports & Events</option>
                <option value="BONAFIDE">Bonafide</option>
                <option value="LEAVING_CERTIFICATE">Leaving / LC</option>
                <option value="CHARACTER_CERTIFICATE">Character</option>
                <option value="APPRECIATION">Appreciation</option>
              </select>

              <button
                type="button"
                onClick={fetchRegistryRecords}
                className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                title="Refresh Registry"
              >
                <RefreshCw className={`h-4 w-4 ${loadingRegistry ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search registry by Student Name, Certificate ID, or Event Title..."
              value={registrySearch}
              onChange={(e) => setRegistrySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Cert ID</th>
                  <th className="py-3 px-3">Document Title</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Class</th>
                  <th className="py-3 px-3">Issue Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRegistry.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      {loadingRegistry ? 'Fetching issued document records...' : 'No issued documents found in the registry.'}
                    </td>
                  </tr>
                ) : (
                  filteredRegistry.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">{item.certificateNumber}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{item.title}</td>
                      <td className="py-3 px-3">{item.studentName}</td>
                      <td className="py-3 px-3">{item.standard} - {item.division}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {item.issuedDate ? new Date(item.issuedDate).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'ISSUED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setCertForm((prev) => ({
                              ...prev,
                              title: item.title,
                              eventName: item.eventName || prev.eventName,
                              achievement: item.achievement || prev.achievement,
                              bodyText: item.bodyText || prev.bodyText,
                              certificateNumber: item.certificateNumber,
                            }));
                            setActiveTab('certificates');
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          View & Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsHub;
