import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../store';
import { Search, ChevronDown, ChevronUp, Plus, X, Trash2, Pencil, Phone, Users, Landmark, History, RotateCcw, Loader2, Camera, Upload } from './icons';
import { getActiveStandards } from '../utils/standardUtils';

export const Students: React.FC = () => {
  const {
    students,
    addStudent,
    setScreen,
    checkMobile,
    deleteStudent,
    restoreStudent,
    updateStudent,
    setSelectedStudentIdForFee,
    ledgerEntries,
    transactions,
    reversePayment,
    currentUser,
    academicYears,
    transportFeeStructures,
    feeStructures,
    authFetch,
    isSuperAdmin,
    setActivePortal,
  } = useApp();

  const activeYearName = useMemo(() => academicYears.find(y => y.isActive)?.name || academicYears[0]?.name || '', [academicYears]);
  const activeYearFeeStructures = useMemo(() => {
    return feeStructures.filter(f => f.academicYear === activeYearName || (!f.academicYear && (activeYearName === academicYears[0]?.name)));
  }, [feeStructures, activeYearName, academicYears]);

  const dynamicStandards = useMemo(() => {
    return getActiveStandards(feeStructures, activeYearName, undefined);
  }, [feeStructures, activeYearName]);

  const dynamicMediums = useMemo(() => {
    const medSet = new Set(activeYearFeeStructures.map(f => f.medium));
    const list = Array.from(medSet);
    if (list.length === 0) {
      return ['English', 'Gujarati'];
    }
    return list;
  }, [activeYearFeeStructures]);

  const activeYearTransportStructures = useMemo(() => {
    const byYear = transportFeeStructures.filter(t => t.academicYear === activeYearName);
    if (byYear.length > 0) return byYear;
    // Legacy fallback — show unscoped records for the first/default year only
    const isDefaultYear = activeYearName === academicYears[0]?.name;
    return isDefaultYear ? transportFeeStructures.filter(t => !t.academicYear) : [];
  }, [transportFeeStructures, activeYearName, academicYears]);

  // Local input search state (instant typing response)
  const [searchVal, setSearchVal] = useState('');
  // Debounced search query state (throttles filter processing)
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'parent' | 'ledger' | 'history'>('parent');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('All Classes');
  const [divFilter, setDivFilter] = useState('All Divisions');
  const [medFilter, setMedFilter] = useState('All Mediums');

  // Quick filter chips: 'ALL' | 'RTE' | 'TRANSPORT'
  const [chipFilter, setChipFilter] = useState<'ALL' | 'RTE' | 'TRANSPORT'>('ALL');
  const [showInactive, setShowInactive] = useState(false);

  // Pagination states (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Add Student Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSName, setNewSName] = useState('');
  const [newSParentMobile, setNewSParentMobile] = useState('');
  const [newSParentSecondaryMobile, setNewSParentSecondaryMobile] = useState('');
  const [newSParentName, setNewSParentName] = useState('');
  const [newSMedium, setNewSMedium] = useState<'English' | 'Gujarati'>('English');
  const [newSStandard, setNewSStandard] = useState('1');
  const [newSDivision, setNewSDivision] = useState('A');
  const [newSTransport, setNewSTransport] = useState<string>('None');
  const [newSIsRTE, setNewSIsRTE] = useState(false);
  const [newSIsNewAdmission, setNewSIsNewAdmission] = useState(true);
  const [newSBuyBagKit, setNewSBuyBagKit] = useState(false);
  const [newSAdmissionMonth, setNewSAdmissionMonth] = useState('June');
  const [newSTransportStartMonth, setNewSTransportStartMonth] = useState('June');

  // Edit Student Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editSName, setEditSName] = useState('');
  const [editSPhotoUrl, setEditSPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // Upload a selected file to Cloudinary via the backend and set the returned URL
  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately so the user gets instant feedback
    const localPreview = URL.createObjectURL(file);
    setEditSPhotoUrl(localPreview);
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      // authFetch handles Authorization header + token refresh automatically
      const res = await authFetch('/api/v1/upload/student-photo', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.url) {
        // Replace local blob URL with the real Cloudinary URL
        URL.revokeObjectURL(localPreview);
        setEditSPhotoUrl(json.url);
      } else {
        alert(`Photo upload failed: ${json.message || 'Unknown error'}`);
        URL.revokeObjectURL(localPreview);
        setEditSPhotoUrl('');
      }
    } catch (err) {
      console.error('Photo upload error', err);
      alert('Network error while uploading photo. Please try again.');
      setEditSPhotoUrl('');
    } finally {
      setPhotoUploading(false);
      // Reset file input so the same file can be re-selected if needed
      if (photoFileRef.current) photoFileRef.current.value = '';
    }
  }, [authFetch]);
  
  // Migration Tool State
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [migratingStudent, setMigratingStudent] = useState<any>(null);
  const [migrationForm, setMigrationForm] = useState({
    grNo: '',
    fatherName: '',
    motherName: '',
    gender: 'Male',
    dob: '',
    aadharNo: '',
    penNo: '',
  });
  const [editSMedium, setEditSMedium] = useState<'English' | 'Gujarati'>('English');
  const [editSStandard, setEditSStandard] = useState('5');
  const [editSDivision, setEditSDivision] = useState('A');
  const [editSTransport, setEditSTransport] = useState<string>('None');
  const [originalTransport, setOriginalTransport] = useState<string>('None');
  const [editSTransportStartMonth, setEditSTransportStartMonth] = useState('June');
  const [originalTransportStartMonth, setOriginalTransportStartMonth] = useState('June');
  const [editSParentName, setEditSParentName] = useState('');
  const [editSParentMobile, setEditSParentMobile] = useState('');
  const [editSParentSecondaryMobile, setEditSParentSecondaryMobile] = useState('');
  const [editSIsRTE, setEditSIsRTE] = useState(false);
  const [editSAdmissionMonth, setEditSAdmissionMonth] = useState('June');
  const [editSBuyBagKit, setEditSBuyBagKit] = useState(false);
  const [editSAllowOtpReset, setEditSAllowOtpReset] = useState(false);

  // Sibling Modal State
  const [siblingModalData, setSiblingModalData] = useState<{ parentName: string, parentId: string } | null>(null);

  // Inline action loading state
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);

  // Debounce search query updates by 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // Reset pagination page on filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [chipFilter, classFilter, divFilter, medFilter, searchQuery]);

  // Sync modal standard & medium defaults with dynamic options
  useEffect(() => {
    if (dynamicStandards.length > 0 && !dynamicStandards.includes(newSStandard)) {
      setNewSStandard(dynamicStandards[0]);
    }
  }, [dynamicStandards, newSStandard]);

  useEffect(() => {
    if (dynamicMediums.length > 0 && !dynamicMediums.includes(newSMedium)) {
      setNewSMedium(dynamicMediums[0] as any);
    }
  }, [dynamicMediums, newSMedium]);

  useEffect(() => {
    if ((newSStandard === '11' || newSStandard === '12') && newSMedium === 'English') {
      setNewSMedium('Gujarati');
    }
  }, [newSStandard, newSMedium]);

  useEffect(() => {
    const allMonths = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
    const admIdx = allMonths.indexOf(newSAdmissionMonth);
    const trIdx = allMonths.indexOf(newSTransportStartMonth);
    if (trIdx < admIdx && admIdx !== -1) {
      setNewSTransportStartMonth(newSAdmissionMonth);
    }
  }, [newSAdmissionMonth, newSTransportStartMonth]);

  useEffect(() => {
    const allMonths = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
    const admIdx = allMonths.indexOf(editSAdmissionMonth);
    const trIdx = allMonths.indexOf(editSTransportStartMonth);
    if (trIdx < admIdx && admIdx !== -1) {
      setEditSTransportStartMonth(editSAdmissionMonth);
    }
  }, [editSAdmissionMonth, editSTransportStartMonth]);

  useEffect(() => {
    if (dynamicStandards.length > 0 && !dynamicStandards.includes(editSStandard)) {
      setEditSStandard(dynamicStandards[0]);
    }
  }, [dynamicStandards, editSStandard]);

  useEffect(() => {
    if (dynamicMediums.length > 0 && !dynamicMediums.includes(editSMedium)) {
      setEditSMedium(dynamicMediums[0] as any);
    }
  }, [dynamicMediums, editSMedium]);

  useEffect(() => {
    if ((editSStandard === '11' || editSStandard === '12') && editSMedium === 'English') {
      setEditSMedium('Gujarati');
    }
  }, [editSStandard, editSMedium]);

  // Helper to get parent ID string
  const getParentIdStr = (student: any) => {
    if (!student.parentId) return null;
    if (typeof student.parentId === 'object') return student.parentId._id || student.parentId.id;
    return student.parentId;
  };

  // Pre-calculate lookup maps for O(N + M) complexity
  const { studentLedgersMap, studentTransactionsMap, siblingGroupMap, studentMap } = useMemo(() => {
    const ledgersMap = new Map<string, typeof ledgerEntries>();
    const txsMap = new Map<string, typeof transactions>();
    const sMap = new Map<string, typeof students[0]>();
    
    // Group ledgers by student ID
    ledgerEntries.forEach((l) => {
      if (!ledgersMap.has(l.studentId)) {
        ledgersMap.set(l.studentId, []);
      }
      ledgersMap.get(l.studentId)!.push(l);
    });

    // Group transactions by student ID
    transactions.forEach((t) => {
      if (t.studentId) {
        if (!txsMap.has(t.studentId)) {
          txsMap.set(t.studentId, []);
        }
        txsMap.get(t.studentId)!.push(t);
      }
    });

    // Group student IDs by parentId and parentMobile
    const pIdMap = new Map<string, string[]>();
    const pMobileMap = new Map<string, string[]>();
    
    students.forEach((student) => {
      const sId = student._id || student.id;
      sMap.set(sId, student);
      const pId = getParentIdStr(student);
      if (pId) {
        if (!pIdMap.has(pId)) pIdMap.set(pId, []);
        pIdMap.get(pId)!.push(sId);
      }
      if (student.parentMobile) {
        if (!pMobileMap.has(student.parentMobile)) pMobileMap.set(student.parentMobile, []);
        pMobileMap.get(student.parentMobile)!.push(sId);
      }
    });

    // Map from student ID to sibling student IDs
    const siblingMap = new Map<string, string[]>();
    students.forEach((student) => {
      const sId = student._id || student.id;
      const siblingIds = new Set<string>();
      
      const pId = getParentIdStr(student);
      if (pId && pIdMap.has(pId)) {
        pIdMap.get(pId)!.forEach(id => {
          if (id !== sId) siblingIds.add(id);
        });
      }
      
      if (student.parentMobile && pMobileMap.has(student.parentMobile)) {
        pMobileMap.get(student.parentMobile)!.forEach(id => {
          if (id !== sId) siblingIds.add(id);
        });
      }
      
      siblingMap.set(sId, Array.from(siblingIds));
    });

    return {
      studentLedgersMap: ledgersMap,
      studentTransactionsMap: txsMap,
      siblingGroupMap: siblingMap,
      studentMap: sMap
    };
  }, [students, ledgerEntries, transactions]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Active status filter
      if (showInactive) {
        if (s.isActive !== false) return false;
      } else {
        if (s.isActive === false) return false;
      }

      // Quick filter chips
      if (chipFilter === 'RTE' && !s.isRTE) return false;
      if (chipFilter === 'TRANSPORT' && s.transportType === 'None') return false;

      // Dropdown filters
      if (classFilter !== 'All Classes' && s.standard !== classFilter.replace('Class ', '')) return false;
      if (divFilter !== 'All Divisions' && s.division !== divFilter.replace('Division ', '')) return false;
      if (medFilter !== 'All Mediums' && s.medium !== medFilter.replace(' Medium', '')) return false;

      // Search query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (s.studentName ?? '').toLowerCase().includes(q) ||
          (s.studentCode ?? '').toLowerCase().includes(q) ||
          (s.parentMobile ?? '').includes(q)
        );
      }
      return true;
    });
  }, [students, chipFilter, classFilter, divFilter, medFilter, searchQuery, showInactive]);

  // Slice list for pagination
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);



  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSName || !newSParentMobile || !newSParentName) return;

    setIsSubmitting(true);
    // Check if mobile numbers already exist
    const checkRes = await checkMobile(newSParentMobile, newSParentSecondaryMobile);
    if (checkRes && checkRes.exists && checkRes.parent) {
      setSiblingModalData({ parentName: checkRes.parent.parentName, parentId: checkRes.parent._id });
      setIsSubmitting(false);
    } else {
      await submitStudentCreation();
    }
  };

  const submitStudentCreation = async (existingParentId?: string) => {
    const success = await addStudent({
      studentCode: `STU${Date.now()}`,
      studentName: newSName,
      parentName: newSParentName,
      parentMobile: newSParentMobile,
      parentSecondaryMobile: newSParentSecondaryMobile || undefined,
      parentId: existingParentId,
      medium: newSMedium,
      standard: newSStandard,
      division: newSDivision,
      transportType: newSTransport,
      isRTE: newSIsRTE,
      isNewAdmission: newSIsNewAdmission,
      buyBagKit: newSBuyBagKit,
      admissionMonth: newSAdmissionMonth,
      transportStartMonth: newSTransportStartMonth,
      isActive: true
    });

    // Reset states
    if (success) {
      setNewSName('');
      setNewSParentMobile('');
      setNewSParentSecondaryMobile('');
      setNewSParentName('');
      setNewSMedium('English');
      setNewSStandard('1');
      setNewSDivision('A');
      setNewSTransport('None');
      setNewSIsRTE(false);
      setNewSIsNewAdmission(true);
      setNewSBuyBagKit(false);
      setNewSAdmissionMonth('June');
      setNewSTransportStartMonth('June');
      setIsModalOpen(false);
    }
    setIsSubmitting(false);
  };

  const openEditModal = (s: any) => {
    setEditingStudentId(s._id || s.id);
    setEditSName(s.studentName);
    setEditSPhotoUrl(s.photoUrl || '');
    setEditSMedium(s.medium);
    setEditSStandard(s.standard);
    setEditSDivision(s.division);
    setEditSTransport(s.transportType || 'None');
    setOriginalTransport(s.transportType || 'None');
    setEditSTransportStartMonth(s.transportStartMonth || 'June');
    setOriginalTransportStartMonth(s.transportStartMonth || 'June');
    setEditSAdmissionMonth(s.admissionMonth || 'June');
    setEditSParentName(s.parentName || '');
    setEditSParentMobile(s.parentMobile || '');
    setEditSParentSecondaryMobile(s.parentSecondaryMobile || '');
    setEditSIsRTE(s.isRTE || false);
    setEditSBuyBagKit(s.buyBagKit || false);
    setEditSAllowOtpReset(s.parentAllowOtpReset || false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId) return;

    setIsSubmitting(true);
    const updates: any = {
      studentName: editSName,
      photoUrl: editSPhotoUrl || null,
      medium: editSMedium,
      standard: editSStandard,
      division: editSDivision,
      transportType: editSTransport,
      transportStartMonth: editSTransportStartMonth,
      parentName: editSParentName,
      parentMobile: editSParentMobile,
      parentSecondaryMobile: editSParentSecondaryMobile || null,
      parentAllowOtpReset: editSAllowOtpReset,
      isRTE: editSIsRTE,
      buyBagKit: editSBuyBagKit,
    };

    // Calculate remaining months for transport adjustment (mirroring backend logic)
    const activeYear = academicYears.find((y) => y.isActive) || academicYears[0];
    let remainingMonths = 0;
    if (activeYear) {
      const now = new Date();
      const end = new Date(activeYear.endDate);
      if (now < end) {
        const yearsDiff = end.getFullYear() - now.getFullYear();
        const monthsDiff = end.getMonth() - now.getMonth();
        remainingMonths = yearsDiff * 12 + monthsDiff + 1;
        if (remainingMonths > 12) remainingMonths = 12;
        if (remainingMonths < 0) remainingMonths = 0;
      }
    }
    // Include remaining months for backend processing (optional)
    if (remainingMonths > 0) {
      updates.transportMonths = remainingMonths;
    }

    const result = await updateStudent(editingStudentId, updates);
    setIsSubmitting(false);
    if (result.success) {
      setIsEditModalOpen(false);
    } else {
      alert(result.error || "Failed to update student");
    }
  };

  const openMigrationModal = (s: any) => {
    setMigratingStudent(s);
    setMigrationForm({
      grNo: s.grNo || '',
      fatherName: s.fatherName || '',
      motherName: s.motherName || '',
      gender: s.gender || 'Male',
      dob: s.dob ? new Date(s.dob).toISOString().split('T')[0] : '',
      aadharNo: s.aadharNo || '',
      penNo: s.penNo || '',
    });
    setIsMigrationModalOpen(true);
  };

  const handleMigrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migratingStudent) return;
    setIsSubmitting(true);
    
    const result = await updateStudent(migratingStudent._id || migratingStudent.id, {
      ...migrationForm,
      gender: migrationForm.gender as 'Male' | 'Female',
      isMigrated: true
    });
    if (result.success) {
      setIsMigrationModalOpen(false);
      setMigratingStudent(null);
    } else {
      alert(result.error || 'Failed to migrate student.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex-1 p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Top Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Students</h2>
          <p className="text-xs font-semibold text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search student name..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full md:w-64 bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setScreen('collect-fee')}
            className="flex items-center gap-1.5 bg-[#F59E0B] hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-[0.98] text-sm shrink-0"
          >
            Collect Fee
          </button>
        </div>
      </header>

      {/* Filter Options & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
        {/* Dropdown selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Selector */}
          <div className="relative">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 focus:outline-none hover:border-slate-300 shadow-sm"
            >
              <option value="All Classes">All Classes</option>
              {dynamicStandards.map((cls) => (
                <option key={cls} value={`Class ${cls}`}>{isNaN(Number(cls)) ? cls : `Std ${cls}`}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Division Selector */}
          <div className="relative">
            <select
              value={divFilter}
              onChange={(e) => setDivFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 focus:outline-none hover:border-slate-300 shadow-sm"
            >
              <option value="All Divisions">All Divisions</option>
              <option value="Division A">Division A</option>
              <option value="Division B">Division B</option>
              <option value="Division C">Division C</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Medium Selector */}
          <div className="relative">
            <select
              value={medFilter}
              onChange={(e) => setMedFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-slate-600 focus:outline-none hover:border-slate-300 shadow-sm"
            >
              <option value="All Mediums">All Mediums</option>
              {dynamicMediums.map((med) => (
                <option key={med} value={`${med} Medium`}>{med}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Quick Chip Filters & Add Student Trigger */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 w-full">
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 flex flex-wrap">
            <button
              onClick={() => setChipFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${chipFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setChipFilter('RTE')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${chipFilter === 'RTE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              RTE Only
            </button>
            <button
              onClick={() => setChipFilter('TRANSPORT')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${chipFilter === 'TRANSPORT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              With Transport
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${showInactive
                  ? 'bg-red-100 text-red-700 shadow-sm border border-red-200'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </button>
          </div>

          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
            <button
              onClick={() => {
                // Admission lives in the ERP module (super admin only); others keep the quick-add modal.
                if (isSuperAdmin) { setActivePortal('ERP'); setScreen('admission'); }
                else setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              Add Student
            </button>
          )}
        </div>
      </div>

      {/* Student Card Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedStudents.length === 0 ? (
          <div className="col-span-2 text-center text-xs text-slate-400 py-10">
            No students found matching your criteria.
          </div>
        ) : (
          paginatedStudents.map((s) => {
            const initials = (s.studentName ?? '')
              .split(' ')
              .map((n) => n[0])
              .join('');
            const isExpanded = expandedStudentId === (s._id || s.id);

            // Look up pre-calculated siblings
            const siblingIds = siblingGroupMap.get(s._id || s.id) || [];
            const siblings = siblingIds
              .map(id => studentMap.get(id))
              .filter((sib): sib is typeof students[0] => !!sib);

            // Look up pre-calculated ledger entries for this student, filtered by active academic year
            const allStudentLedgers = studentLedgersMap.get(s._id || s.id) || [];
            const studentLedgers = allStudentLedgers.filter(l => 
              l.academicYear === activeYearName || (!l.academicYear && (activeYearName === academicYears[0]?.name))
            );
            const totalLedgerAmount = studentLedgers.reduce((sum, l) => sum + (l.totalAmount || 0), 0);
            const totalPaidLedgerAmount = studentLedgers.reduce((sum, l) => sum + (l.paidAmount || 0), 0);
            const totalConcessionLedgerAmount = studentLedgers.reduce((sum, l) => sum + (l.concessionAmount || 0), 0);
            const totalRemainingLedgerAmount = studentLedgers.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);

            // Look up pre-calculated transactions for this student
            const studentTransactions = studentTransactionsMap.get(s._id || s.id) || [];

            // Backend does not provide a `status` field; default to empty string.
            const status = s.status ?? '';
            let badgeStyle = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
            if (status === '2 DUE') badgeStyle = 'bg-red-50 text-red-500 border border-red-200';
            else if (status === '1 DUE') badgeStyle = 'bg-blue-50 text-blue-500 border border-blue-200';
            else if (status === '3+ DUE') badgeStyle = 'bg-red-100 text-red-700 border border-red-300';
            else if (status === 'PARTIAL') badgeStyle = 'bg-amber-50 text-amber-500 border border-amber-200';
            else if (status === 'RTE') badgeStyle = 'bg-purple-50 text-purple-600 border border-purple-200';

            return (
              <div
                key={s._id}
                className={`bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 relative ${isExpanded ? 'md:col-span-2 border-blue-200 shadow-md ring-1 ring-blue-500/10' : ''
                  }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 w-full">
                  <div className="flex items-start gap-4">
                    {/* Photo, falling back to initials bubble */}
                    {s.photoUrl ? (
                      <img
                        src={s.photoUrl}
                        alt={s.studentName}
                        className="h-12 w-12 rounded-2xl object-cover border border-amber-100 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 font-bold text-base flex items-center justify-center border border-amber-100 uppercase shrink-0 ${s.photoUrl ? 'hidden' : ''}`}>
                      {initials}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-800 text-base">{s.studentName}</h4>
                        {s.isRTE && (
                          <span className="bg-purple-100 text-purple-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            RTE
                          </span>
                        )}
                        {s.isNewAdmission && (
                          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            New
                          </span>
                        )}
                        {s.isActive === false && (
                          <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Deleted
                          </span>
                        )}
                        {!s.isMigrated && isSuperAdmin && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); openMigrationModal(s); }}
                            className="bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            Requires ERP Migration
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">
                        Std {s.standard} · Division {s.division} ·{' '}
                        <span className="font-medium">{s.medium} Medium</span>
                      </p>

                      <span className="text-slate-400 text-[10px] block font-mono">
                        {s.studentCode}
                      </span>

                      <div className="pt-1.5 flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Parent: {s.parentMobile ?? 'N/A'}
                        </span>
                        {s.transportType !== 'None' && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] text-blue-500 font-bold tracking-wide uppercase">
                              {s.transportType} Transport
                            </span>
                          </>
                        )}
                        {s.isRTE && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] text-purple-500 font-bold uppercase">Govt pays</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side stats & buttons */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 shrink-0 mt-2 md:mt-0">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${badgeStyle}`}>
                      {status === '3+ DUE' ? '3+ DUE' : status}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!isExpanded) {
                            setActiveTab('parent');
                          }
                          setExpandedStudentId(isExpanded ? null : (s._id || s.id));
                        }}
                        className={`border font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all flex items-center gap-1 ${isExpanded
                            ? 'bg-slate-800 border-slate-800 text-white hover:bg-slate-700'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {isExpanded ? (
                          <>
                            Collapse
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            View
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                      {s.isActive === false ? (
                        <button
                          onClick={async () => {
                            if (window.confirm("Are you sure you want to restore this deleted student?")) {
                              setProcessingActionId(`restore-${s._id || s.id}`);
                              await restoreStudent(s._id || s.id);
                              setProcessingActionId(null);
                            }
                          }}
                          disabled={processingActionId === `restore-${s._id || s.id}`}
                          className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
                          title="Restore Student"
                        >
                          {processingActionId === `restore-${s._id || s.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </button>
                      ) : (
                        <>
                          {!s.isRTE && (
                            <button
                              onClick={() => {
                                setSelectedStudentIdForFee(s._id || s.id);
                                setScreen('collect-fee');
                              }}
                              className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow-sm transition-all"
                            >
                              Collect
                            </button>
                          )}
                          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') && (
                            <button
                              onClick={() => openEditModal(s)}
                              className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold p-1.5 rounded-xl shadow-sm transition-all"
                              title="Edit Student"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={async () => {
                                if (window.confirm("Are you sure you want to delete this student? If they have payments, they will be marked as inactive. If no payments exist, they will be permanently deleted.")) {
                                  setProcessingActionId(`delete-${s._id || s.id}`);
                                  await deleteStudent(s._id || s.id);
                                  setProcessingActionId(null);
                                }
                              }}
                              disabled={processingActionId === `delete-${s._id || s.id}`}
                              className="bg-red-50 hover:bg-red-100 disabled:opacity-50 border border-red-200 text-red-600 font-bold p-1.5 rounded-xl shadow-sm transition-all flex items-center justify-center"
                              title="Delete Student"
                            >
                              {processingActionId === `delete-${s._id || s.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="w-full mt-4 border-t border-slate-100 pt-5 space-y-4">

                    {/* Premium tab bar */}
                    <div className="flex border-b border-slate-100/80 -mx-5 px-5 overflow-x-auto scrollbar-none">
                      <button
                        onClick={() => setActiveTab('parent')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 -mb-px shrink-0 outline-none ${activeTab === 'parent'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        <Users className="h-4 w-4" />
                        Parent & Siblings
                      </button>
                      <button
                        onClick={() => setActiveTab('ledger')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 -mb-px shrink-0 outline-none ${activeTab === 'ledger'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        <Landmark className="h-4 w-4" />
                        Fee Balance Ledgers ({studentLedgers.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold transition-all border-b-2 -mb-px shrink-0 outline-none ${activeTab === 'history'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        <History className="h-4 w-4" />
                        Payment History ({studentTransactions.length})
                      </button>
                    </div>

                    <div className="pt-2">
                      {/* Section 1: Parent & Sibling Info */}
                      {activeTab === 'parent' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 rounded-2xl p-6">
                          {/* Parent Details Card */}
                          <div className="space-y-4">
                            <h5 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-200/60">
                              <Users className="h-4 w-4 text-blue-500" />
                              Parent Details
                            </h5>
                            <div className="space-y-3.5 text-xs">
                              <div>
                                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Parent Name</span>
                                <span className="font-bold text-slate-700 text-sm">{s.parentName || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Primary Mobile Number</span>
                                <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5 mt-0.5">
                                  <Phone className="h-4 w-4 text-slate-400" />
                                  {s.parentMobile || 'N/A'}
                                </span>
                              </div>
                              {s.parentSecondaryMobile && (
                                <div>
                                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Secondary Mobile Number</span>
                                  <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5 mt-0.5">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    {s.parentSecondaryMobile}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Siblings Card */}
                          <div className="space-y-4">
                            <h5 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-200/60">
                              <Users className="h-4 w-4 text-blue-500" />
                              School Siblings
                            </h5>
                            {siblings.length === 0 ? (
                              <span className="text-slate-400 text-xs italic block pt-2">No siblings registered under this parent's contact info.</span>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {siblings.map((sib) => (
                                  <div key={sib._id || sib.id} className="flex items-center justify-between bg-white border border-slate-200/65 rounded-xl p-3 hover:bg-slate-50/50 hover:shadow-sm transition-all">
                                    <div>
                                      <span className="font-bold text-slate-700 text-xs block">{sib.studentName}</span>
                                      <span className="text-[10px] text-slate-400 block mt-0.5">Std {sib.standard} · Division {sib.division}</span>
                                    </div>
                                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${sib.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        sib.status === 'RTE' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                          sib.status === '2 DUE' ? 'bg-red-50 text-red-500 border border-red-100' :
                                            'bg-amber-50 text-amber-500 border border-amber-100'
                                      }`}>
                                      {sib.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Fee Ledger Summary */}
                      {activeTab === 'ledger' && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col space-y-4">
                          <h5 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-200/60">
                            <Landmark className="h-4 w-4 text-blue-500" />
                            Fee Ledger Balance Breakdown
                          </h5>
                          <div className="overflow-x-auto">
                            {studentLedgers.length === 0 ? (
                              <div className="text-slate-400 text-xs italic py-10 text-center">No fee ledgers have been generated for this student.</div>
                            ) : (
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                    <th className="py-2.5 pr-3">Category</th>
                                    <th className="py-2.5 px-3">Fee Period / Slot</th>
                                    <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                                    <th className="py-2.5 px-3 text-right">Paid Amount (₹)</th>
                                    <th className="py-2.5 px-3 text-right">Concession (₹)</th>
                                    <th className="py-2.5 px-3 text-right">Remaining Balance (₹)</th>
                                    <th className="py-2.5 pl-3 text-center">Payment Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {studentLedgers.map((l) => (
                                    <tr key={l._id || l.id} className="hover:bg-slate-100/50 transition-colors">
                                      <td className="py-3 pr-3 font-extrabold text-slate-800">
                                        {(l.feeType as string) === 'EDUCATION' ? 'Education' :
                                          (l.feeType as string) === 'TRANSPORT' ? 'Transport' :
                                            (l.feeType as string) === 'TERM' ? 'Term' :
                                              (l.feeType as string) === 'ADMISSION' ? 'Admission' :
                                                (l.feeType as string) === 'BAG_KIT' ? 'Bag & Kit' : l.feeType}
                                      </td>
                                      <td className="py-3 px-3 text-slate-500 font-medium">{l.feePeriod}</td>
                                      <td className="py-3 px-3 text-right font-semibold">₹{l.totalAmount.toLocaleString('en-IN')}</td>
                                      <td className="py-3 px-3 text-right text-emerald-600 font-bold">₹{l.paidAmount.toLocaleString('en-IN')}</td>
                                      <td className="py-3 px-3 text-right text-purple-600 font-semibold">₹{(l.concessionAmount || 0).toLocaleString('en-IN')}</td>
                                      <td className={`py-3 px-3 text-right font-extrabold ${l.remainingAmount > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        ₹{l.remainingAmount.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-3 pl-3 text-center">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${l.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            l.status === 'PARTIAL' ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                                              'bg-red-50 text-red-500 border border-red-100'
                                          }`}>
                                          {l.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-slate-200 bg-slate-100/60 font-extrabold text-slate-800 text-sm">
                                    <td className="py-3.5 pr-3" colSpan={2}>Aggregate Outstanding</td>
                                    <td className="py-3.5 px-3 text-right">₹{totalLedgerAmount.toLocaleString('en-IN')}</td>
                                    <td className="py-3.5 px-3 text-right text-emerald-700">₹{totalPaidLedgerAmount.toLocaleString('en-IN')}</td>
                                    <td className="py-3.5 px-3 text-right text-purple-700">₹{totalConcessionLedgerAmount.toLocaleString('en-IN')}</td>
                                    <td className="py-3.5 px-3 text-right text-red-600">₹{totalRemainingLedgerAmount.toLocaleString('en-IN')}</td>
                                    <td className="py-3.5 pl-3 text-center">
                                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${totalRemainingLedgerAmount === 0
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                          : 'bg-red-100 text-red-800 border-red-200'
                                        }`}>
                                        {totalRemainingLedgerAmount === 0 ? 'NO BALANCE' : 'DUE FEES'}
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Recent Transactions */}
                      {activeTab === 'history' && (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col space-y-4">
                          <h5 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-200/60">
                            <History className="h-4 w-4 text-blue-500" />
                            Recent Payments & Reversals History
                          </h5>
                          <div className="overflow-x-auto">
                            {studentTransactions.length === 0 ? (
                              <div className="text-slate-400 text-xs italic py-10 text-center">No payment transactions recorded for this student yet.</div>
                            ) : (
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                    <th className="py-2.5 px-3 w-[10px]"></th>
                                    <th className="py-2.5 px-3">Payment Date</th>
                                    <th className="py-2.5 px-3">Time</th>
                                    <th className="py-2.5 px-3">Fee Type Details Summary</th>
                                    <th className="py-2.5 px-3 text-right">Paid Amount (₹)</th>
                                    <th className="py-2.5 px-3 text-right">Concession (₹)</th>
                                    <th className="py-2.5 px-3 text-center">Method</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {studentTransactions.map((tx) => {
                                    const isTxExpanded = expandedTxId === tx.id;
                                    return (
                                      <React.Fragment key={tx.id}>
                                        <tr className="hover:bg-slate-100/50 transition-colors">
                                          <td className="py-3 px-3">
                                            <button
                                              onClick={() => setExpandedTxId(isTxExpanded ? null : tx.id)}
                                              className="p-1 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center"
                                            >
                                              {isTxExpanded ? (
                                                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                                              ) : (
                                                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                                              )}
                                            </button>
                                          </td>
                                          <td className="py-3 px-3 font-semibold text-slate-700">{tx.date}</td>
                                          <td className="py-3 px-3 text-slate-400 font-medium">{tx.time}</td>
                                          <td className="py-3 px-3 font-bold text-slate-800">
                                            <div className="max-w-[180px] truncate">
                                              {tx.feeType.split('\n').join(', ')}
                                            </div>
                                          </td>
                                          <td className="py-3 px-3 text-right font-extrabold text-slate-800">₹{tx.amount.toLocaleString('en-IN')}</td>
                                          <td className="py-3 px-3 text-right font-semibold text-purple-600">₹{(tx.concessionAmount || 0).toLocaleString('en-IN')}</td>
                                          <td className="py-3 px-3 text-center">
                                            <span className="bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                                              {tx.method}
                                            </span>
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${tx.status === 'REVERSED' ? 'bg-red-50 text-red-500 border-red-100' :
                                                tx.status === 'PARTIALLY_REVERSED' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                                                  tx.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-500 border-blue-100'
                                              }`}>
                                              {tx.status}
                                            </span>
                                          </td>
                                        </tr>
                                        {isTxExpanded && (
                                          <tr className="bg-slate-100/30">
                                            <td colSpan={8} className="py-3 px-6 border-t border-b border-slate-200/50">
                                              <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
                                                <h6 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                  <span>Payment Items</span>
                                                  <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full border border-slate-200">{(tx.subItems || []).length} item{(tx.subItems || []).length !== 1 ? 's' : ''}</span>
                                                </h6>
                                                <table className="w-full text-left text-[11px] border-collapse">
                                                  <thead>
                                                    <tr className="border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider text-[8px]">
                                                      <th className="py-1.5 px-2">Fee Type Details</th>
                                                      <th className="py-1.5 px-2 text-right">Amount (₹)</th>
                                                      <th className="py-1.5 px-2 text-right">Concession (₹)</th>
                                                      <th className="py-1.5 px-2 text-center">Method</th>
                                                      <th className="py-1.5 px-2 text-center">Status</th>
                                                      <th className="py-1.5 px-2 text-right">Reversal Action</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                    {(tx.subItems || []).map((sub: any) => (
                                                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-2 px-2 font-bold text-slate-800">{sub.description}</td>
                                                        <td className="py-2 px-2 text-right font-extrabold text-slate-800">₹{sub.amount.toLocaleString('en-IN')}</td>
                                                        <td className="py-2 px-2 text-right font-semibold text-purple-600">₹{(sub.concessionAmount || 0).toLocaleString('en-IN')}</td>
                                                        <td className="py-2 px-2 text-center">
                                                          <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-200/50 uppercase">
                                                            {sub.method}
                                                          </span>
                                                        </td>
                                                        <td className="py-2 px-2 text-center">
                                                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${sub.status === 'REVERSED' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            }`}>
                                                            {sub.status}
                                                          </span>
                                                        </td>
                                                        <td className="py-2 px-2 text-right">
                                                          {sub.status !== 'REVERSED' && sub.method !== 'GOVT' ? (
                                                            <button
                                                              onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to reverse payment of ₹${sub.amount.toLocaleString('en-IN')} for ${sub.description}? This will restore the balance back to the ledger.`)) {
                                                                  setProcessingActionId(`reverse-${sub.id}`);
                                                                  await reversePayment(sub.id);
                                                                  setProcessingActionId(null);
                                                                }
                                                              }}
                                                              disabled={processingActionId === `reverse-${sub.id}`}
                                                              className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 border border-red-200/50 hover:border-red-300 font-bold px-2 py-0.5 rounded-lg text-[9px] tracking-wide transition-all shadow-sm active:scale-[0.98]"
                                                            >
                                                              {processingActionId === `reverse-${sub.id}` ? (
                                                                <Loader2 className="h-2 w-2 animate-spin" />
                                                              ) : (
                                                                <RotateCcw className="h-2 w-2" />
                                                              )}
                                                              Reverse Item
                                                            </button>
                                                          ) : (
                                                            <span className="text-slate-300 text-[9px] italic pr-2 font-medium">Not reversible</span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">
            Showing <span className="font-extrabold text-slate-800">{Math.min(filteredStudents.length, (currentPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
            <span className="font-extrabold text-slate-800">{Math.min(filteredStudents.length, currentPage * PAGE_SIZE)}</span> of{' '}
            <span className="font-extrabold text-slate-800">{filteredStudents.length}</span> students
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
              })
              .map((page, index, arr) => {
                const showEllipsis = index > 0 && page - arr[index - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="text-slate-400 px-1 text-xs">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        currentPage === page
                          ? 'bg-blue-600 border border-blue-600 text-white shadow-md shadow-blue-500/10'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-650 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Student Modal Panel */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            {/* Top title bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h3 className="text-base font-extrabold text-slate-800">Add New Student Profile</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Student Name</label>
                  <input
                    type="text"
                    required
                    value={newSName}
                    onChange={(e) => setNewSName(e.target.value)}
                    placeholder="Enter student's full name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Parent Name</label>
                  <input
                    type="text"
                    required
                    value={newSParentName}
                    onChange={(e) => setNewSParentName(e.target.value)}
                    placeholder="Enter parent's full name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Parent Mobile</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newSParentMobile}
                    onChange={(e) => setNewSParentMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Secondary Mobile</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={newSParentSecondaryMobile}
                    onChange={(e) => setNewSParentSecondaryMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Optional secondary number"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Medium of Instruction</label>
                  <select
                    value={newSMedium}
                    onChange={(e) => setNewSMedium(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {dynamicMediums
                      .filter(med => !(med === 'English' && (newSStandard === '11' || newSStandard === '12')))
                      .map((med) => (
                      <option key={med} value={med}>{med} Medium</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Standard</label>
                  <select
                    value={newSStandard}
                    onChange={(e) => setNewSStandard(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {dynamicStandards.map((std) => (
                      <option key={std} value={std}>{isNaN(Number(std)) ? std : `Std ${std}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Division</label>
                  <select
                    value={newSDivision}
                    onChange={(e) => setNewSDivision(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Transport Zone</label>
                  <select
                    value={newSTransport}
                    onChange={(e) => setNewSTransport(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="None">None</option>
                    {activeYearTransportStructures.map((t) => (
                      <option key={t._id} value={t.transportType}>{t.transportType} (+₹{t.amount})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Transport Start Month</label>
                  <select
                    value={newSTransportStartMonth}
                    disabled={newSTransport === 'None'}
                    onChange={(e) => setNewSTransportStartMonth(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May']
                      .filter(m => {
                        const all = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
                        return all.indexOf(m) >= all.indexOf(newSAdmissionMonth);
                      })
                      .map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Fee Starting Month</label>
                  <select
                    value={newSAdmissionMonth}
                    onChange={(e) => setNewSAdmissionMonth(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="rteCheckbox"
                  checked={newSIsRTE}
                  onChange={(e) => setNewSIsRTE(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="rteCheckbox" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  Student admitted under RTE (Right to Education) quota
                </label>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="newAdmissionCheckbox"
                  checked={newSIsNewAdmission}
                  onChange={(e) => setNewSIsNewAdmission(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="newAdmissionCheckbox" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  New Admission (charges Admission fees)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="newBuyBagKitCheckbox"
                  checked={newSBuyBagKit}
                  onChange={(e) => setNewSBuyBagKit(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="newBuyBagKitCheckbox" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  Include Bag & Kit Fee (Optional)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Student Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal Panel */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            {/* Top title bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h3 className="text-base font-extrabold text-slate-800">Edit Student Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Student Name</label>
                  <input
                    type="text"
                    required
                    value={editSName}
                    onChange={(e) => setEditSName(e.target.value)}
                    placeholder="Enter student's full name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Parent Name</label>
                  <input
                    type="text"
                    required
                    value={editSParentName}
                    onChange={(e) => setEditSParentName(e.target.value)}
                    placeholder="Enter parent's full name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Profile Photo</label>
                <div className="flex items-center gap-4">
                  {/* Preview avatar */}
                  <div className="relative shrink-0">
                    {editSPhotoUrl && !photoUploading ? (
                      <img
                        src={editSPhotoUrl}
                        alt="Preview"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-100 shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                        {photoUploading
                          ? <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                          : <Camera className="h-6 w-6 text-slate-400" />}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    {/* Hidden real file input */}
                    <input
                      ref={photoFileRef}
                      id="student-photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={photoUploading}
                    />

                    <button
                      type="button"
                      onClick={() => photoFileRef.current?.click()}
                      disabled={photoUploading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-600 text-sm font-semibold rounded-xl border border-blue-200 transition-colors w-fit"
                    >
                      <Upload className="h-4 w-4" />
                      {photoUploading ? 'Uploading…' : editSPhotoUrl ? 'Change Photo' : 'Upload Photo'}
                    </button>

                    {editSPhotoUrl && !photoUploading && (
                      <button
                        type="button"
                        onClick={() => setEditSPhotoUrl('')}
                        className="text-xs text-red-400 hover:text-red-600 font-medium w-fit transition-colors"
                      >
                        ✕ Remove photo
                      </button>
                    )}

                    <p className="text-[11px] text-slate-400">JPG, PNG, WEBP · Max 5 MB · Auto-compressed</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Parent Mobile</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editSParentMobile}
                    onChange={(e) => setEditSParentMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Secondary Mobile</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editSParentSecondaryMobile}
                    onChange={(e) => setEditSParentSecondaryMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="Optional secondary number"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Medium</label>
                  <select
                    value={editSMedium}
                    onChange={(e) => setEditSMedium(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {dynamicMediums
                      .filter(med => !(med === 'English' && (editSStandard === '11' || editSStandard === '12')))
                      .map((med) => (
                      <option key={med} value={med}>{med} Medium</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Standard (Class)</label>
                  <select
                    value={editSStandard}
                    onChange={(e) => setEditSStandard(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {dynamicStandards.map((cls) => (
                      <option key={cls} value={cls}>{isNaN(Number(cls)) ? cls : `Std ${cls}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Division</label>
                  <select
                    value={editSDivision}
                    onChange={(e) => setEditSDivision(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="A">Division A</option>
                    <option value="B">Division B</option>
                    <option value="C">Division C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Transport Zone</label>
                  <select
                    value={editSTransport}
                    onChange={(e) => setEditSTransport(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="None">None</option>
                    {activeYearTransportStructures.map((t) => (
                      <option key={t._id} value={t.transportType}>{t.transportType} (+₹{t.amount})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Transport Start Month</label>
                  <select
                    value={editSTransportStartMonth}
                    disabled={editSTransport === 'None'}
                    onChange={(e) => setEditSTransportStartMonth(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May']
                      .filter(m => {
                        const all = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
                        return all.indexOf(m) >= all.indexOf(editSAdmissionMonth);
                      })
                      .map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                  </select>
                </div>
                <div />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="editRteCheckbox"
                  checked={editSIsRTE}
                  onChange={(e) => setEditSIsRTE(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="editRteCheckbox" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  Student admitted under RTE (Right to Education) quota
                </label>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="editBuyBagKitCheckbox"
                  checked={editSBuyBagKit}
                  onChange={(e) => setEditSBuyBagKit(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="editBuyBagKitCheckbox" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                  Include Bag & Kit Fee (Optional)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-dashed border-slate-205 mt-2">
                <input
                  type="checkbox"
                  id="editAllowOtpResetCheckbox"
                  checked={editSAllowOtpReset}
                  onChange={(e) => setEditSAllowOtpReset(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="editAllowOtpResetCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Allow Parent to Reset Password via OTP (Forgot Password)
                </label>
              </div>

              {(editSTransport !== originalTransport || editSTransportStartMonth !== originalTransportStartMonth) && editSTransport !== 'None' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-800 font-semibold">
                    The transport fee will be automatically calculated based on the current active academic year and remaining months.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sibling Check Modal */}
      {siblingModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">Number Already Exists</h3>
            <p className="text-sm text-slate-600 mb-6">
              The mobile number provided already belongs to parent <strong>{siblingModalData.parentName}</strong>. Is this new student a sibling?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  submitStudentCreation(siblingModalData.parentId);
                  setSiblingModalData(null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all"
              >
                Yes, this is a sibling
              </button>
              <button
                onClick={() => {
                  setSiblingModalData(null);
                  alert("Please enter a different mobile number for this new parent. Unique numbers are required for distinct parents.");
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl transition-all"
              >
                No, this is a different parent
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Migration Modal */}
      {isMigrationModalOpen && migratingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h3 className="text-base font-extrabold text-slate-800">ERP Data Migration: {migratingStudent.studentName}</h3>
              <button onClick={() => setIsMigrationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMigrationSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-800 font-semibold">
                  Please fill in the missing ERP fields to migrate this legacy student into the new system.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">GR Number</label>
                  <input
                    type="text"
                    required
                    value={migrationForm.grNo}
                    onChange={(e) => setMigrationForm({...migrationForm, grNo: e.target.value})}
                    placeholder="Enter GR No."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Gender</label>
                  <select
                    value={migrationForm.gender}
                    onChange={(e) => setMigrationForm({...migrationForm, gender: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Father's Name</label>
                  <input
                    type="text"
                    required
                    value={migrationForm.fatherName}
                    onChange={(e) => setMigrationForm({...migrationForm, fatherName: e.target.value})}
                    placeholder="Enter Father's Name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Mother's Name</label>
                  <input
                    type="text"
                    required
                    value={migrationForm.motherName}
                    onChange={(e) => setMigrationForm({...migrationForm, motherName: e.target.value})}
                    placeholder="Enter Mother's Name"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={migrationForm.dob}
                    onChange={(e) => setMigrationForm({...migrationForm, dob: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Aadhar No (Optional)</label>
                  <input
                    type="text"
                    value={migrationForm.aadharNo}
                    onChange={(e) => setMigrationForm({...migrationForm, aadharNo: e.target.value})}
                    placeholder="Aadhar Number"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMigrationModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-amber-500/10 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Migrating...' : 'Migrate to ERP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
