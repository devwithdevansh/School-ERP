// June to May (All 12 months unpaid): jun to may
// July to May (June is paid; July onwards unpaid): jul to may
// August to May (June and July paid; August onwards unpaid): aug to may
// September to May (June to August paid; September onwards unpaid): sep to may
// October to May (June to September paid; October onwards unpaid): oct to may
// November to May (June to October paid; November onwards unpaid): nov to may
// December to May (June to November paid; December onwards unpaid): dec to may
// January to May (June to December paid; January onwards unpaid): jan to may
// February to May (June to December + Jan paid; February onwards unpaid): feb to may
// March to May (June to December + Jan and Feb paid; March onwards unpaid): mar to may
// April to May (June to December + Jan to Mar paid; April and May unpaid): apr to may
// May only unpaid (June to April paid; only May unpaid): may to may


import React, { useState, useRef } from 'react';
import { useApp } from '../store';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Database,
  Info,
  Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getActiveStandards } from '../utils/standardUtils';

const cleanMobileNumber = (val: any): string => {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  } else if (str.endsWith('.00')) {
    str = str.slice(0, -3);
  }
  let digits = str.replace(/\D/g, '');
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
};

interface ExcelRow {
  studentName: string;
  medium: string;
  standard: string;
  division: string;
  parentName: string;
  parentMobile: string;
  parentSecondaryMobile: string;
  transportType: string;
  transportStartMonth?: string;
  transportAllPaid?: boolean; // true = has transport but all months are paid
  isRTE: boolean | string;
  pendingFees?: Record<string, string>;
}

export const ImportExcel: React.FC = () => {
  const { importStudents, autoPromoteBatch, setScreen, academicYears, feeStructures } = useApp();
  const activeYearName = React.useMemo(() => academicYears.find(y => y.isActive)?.name || academicYears[0]?.name || '', [academicYears]);
  
  const activeStandards = React.useMemo(() => {
    return getActiveStandards(feeStructures, activeYearName, undefined);
  }, [feeStructures, activeYearName]);

  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [previewData, setPreviewData] = useState<ExcelRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<{
    successCount: number;
    failCount: number;
    results: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContext, setEditContext] = useState<'preview' | 'report' | null>(null);
  const [editForm, setEditForm] = useState<ExcelRow | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleAutoPromote = async () => {
    if (!successReport) return;
    const successIds = successReport.results
      .filter((r: any) => r.status === 'success' && r.id)
      .map((r: any) => r.id);
    if (successIds.length === 0) return;

    setIsPromoting(true);
    setPromoteMsg(null);
    try {
      const res = await autoPromoteBatch(successIds);
      let text = `✅ Auto-promoted ${res.promotedCount} student(s).`;
      if (res.skippedCount > 0) {
        text += ` ⚠️ Skipped ${res.skippedCount} student(s) — `;
        // Show the first unique reason
        const firstReason = res.skipped?.[0]?.reason;
        if (firstReason) text += firstReason;
        else text += 'see server logs for details.';
      }
      if (res.groupErrors?.length > 0) {
        text += ` ❌ ${res.groupErrors.length} group(s) failed: ${res.groupErrors[0]?.error}`;
      }
      setPromoteMsg({ type: res.promotedCount > 0 ? 'success' : 'error', text });
    } catch (err: any) {
      setPromoteMsg({ type: 'error', text: err.message || 'Auto-promotion failed. Please check server logs.' });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleEditClick = (idx: number, context: 'preview' | 'report') => {
    setEditingIndex(idx);
    setEditContext(context);
    const original = context === 'preview' ? previewData[idx] : successReport?.results[idx]?.originalData;
    setEditForm(original ? { ...original } : null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !editForm) return;
    setEditError(null);

    // Basic validation check before saving
    if (!String(editForm.studentName || '').trim()) {
      setEditError("Student Name is required");
      return;
    }
    if (!editForm.medium || !['English', 'Gujarati'].includes(editForm.medium)) {
      setEditError("Medium must be 'English' or 'Gujarati'");
      return;
    }
    if (!String(editForm.standard || '').trim()) {
      setEditError("Standard is required");
      return;
    }
    if (!String(editForm.division || '').trim()) {
      setEditError("Division is required");
      return;
    }
    if (!String(editForm.parentName || '').trim()) {
      setEditError("Parent Name is required");
      return;
    }
    const cleanMobile = cleanMobileNumber(editForm.parentMobile);
    if (!cleanMobile) {
      setEditError("Parent Mobile number is required");
      return;
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setEditError("Enter a valid 10-digit Indian parent mobile number");
      return;
    }

    if (editForm.parentSecondaryMobile) {
      const cleanSec = cleanMobileNumber(editForm.parentSecondaryMobile);
      if (cleanSec && !/^[6-9]\d{9}$/.test(cleanSec)) {
        setEditError("Enter a valid 10-digit secondary mobile number");
        return;
      }
    }

    if (editContext === 'preview') {
      // In preview, just update local state
      // Recompute transportAllPaid: if transport type is set but no pending month → all paid
      const recomputedAllPaid = !!(editForm.transportType && editForm.transportType !== 'None' && !editForm.transportStartMonth);
      const updated = [...previewData];
      updated[editingIndex] = {
        ...editForm,
        transportAllPaid: recomputedAllPaid,
        parentMobile: cleanMobile,
        parentSecondaryMobile: editForm.parentSecondaryMobile ? cleanMobileNumber(editForm.parentSecondaryMobile) : ''
      };
      setPreviewData(updated);
      setEditingIndex(null);
      setEditContext(null);
      setEditForm(null);
    } else if (editContext === 'report' && successReport) {
      // In report, retry import of this specific row
      setIsRetrying(true);
      try {
        const cleanedRow = {
          ...editForm,
          parentMobile: cleanMobile,
          parentSecondaryMobile: editForm.parentSecondaryMobile ? cleanMobileNumber(editForm.parentSecondaryMobile) : ''
        };
        const report = await importStudents([cleanedRow]);
        const singleResult = report.results[0];

        if (singleResult.status === 'success') {
          const updatedResults = [...successReport.results];
          const previousStatus = updatedResults[editingIndex].status;

          updatedResults[editingIndex] = {
            ...updatedResults[editingIndex],
            status: 'success',
            studentCode: singleResult.studentCode,
            transportStartMonth: singleResult.transportStartMonth,
            originalData: cleanedRow,
            error: undefined
          };

          const diffSuccess = previousStatus === 'failed' ? 1 : 0;
          const diffFail = previousStatus === 'failed' ? -1 : 0;

          setSuccessReport({
            successCount: successReport.successCount + diffSuccess,
            failCount: successReport.failCount + diffFail,
            results: updatedResults
          });

          setEditingIndex(null);
          setEditContext(null);
          setEditForm(null);
        } else {
          setEditError(singleResult.error || "Retry failed");
        }
      } catch (err: any) {
        setEditError(err.message || "An unexpected error occurred during retry");
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const fieldsSchema = [
    { name: 'Student Name', dbName: 'studentName', required: true, example: 'Dhruv Solanki', desc: 'Full name of the student' },
    { name: 'Medium', dbName: 'medium', required: true, example: 'English', desc: 'Must be "English" or "Gujarati"' },
    { name: 'Standard', dbName: 'standard', required: true, example: activeStandards[0] || '1', desc: `Class standard (e.g. ${activeStandards.slice(0, 5).join(', ')} ...)` },
    { name: 'Division', dbName: 'division', required: true, example: 'A', desc: 'Section/division (A, B, C)' },
    { name: 'Parent Name', dbName: 'parentName', required: true, example: 'Bhavesh Solanki', desc: 'Full name of parent or guardian' },
    { name: 'Parent Mobile', dbName: 'parentMobile', required: true, example: '9009637290', desc: '10-digit Indian mobile number (no country code)' },
    { name: 'Parent Secondary Mobile', dbName: 'parentSecondaryMobile', required: false, example: '9191421620', desc: 'Optional second contact number. Leave blank if none.' },
    { name: 'Transport Type', dbName: 'transportType', required: false, example: 'Railnagar', desc: 'Write the exact Zone Name configured in Fee Structures, or "None". Leave blank for "None".' },
    { name: 'Transport fees pending from month', dbName: 'transportStartMonth', required: false, example: 'June', desc: 'Only fill this if the student has PENDING transport fees. Write the month from which fees are due (e.g. "June", "August"). Leave blank if transport fees are fully paid.' },
    { name: 'Is RTE', dbName: 'isRTE', required: false, example: 'No', desc: 'Is the student admitted under Right to Education (RTE) scheme? Write "Yes" or "No". Leave blank = No.' },
    { name: `Year YYYY-YYYY (e.g. Year ${activeYearName || '2026-2027'})`, dbName: 'pendingFees', required: false, example: 'oct to may', desc: 'Education fee pending status. Write "paid" / "gov paid" if fully paid, or a month range like "oct to may" if fees are pending from October.' },
  ];

  const downloadTemplate = () => {
    const sampleData = [
      {
        "Student Name": "Dhruv Solanki",
        "Medium": "English",
        "Standard": "Nursery",
        "Division": "B",
        "Parent Name": "Bhavesh Solanki",
        "Parent Mobile": "9009637290",
        "Parent Secondary Mobile": "9191421620",
        "Transport Type": "Railnagar",
        "Transport fees pending from month": "June",
        "Is RTE": "No",
        [`Year ${activeYearName || '2026-2027'}`]: "may to may"
      },
      {
        "Student Name": "Parth Trivedi",
        "Medium": "English",
        "Standard": "Nursery",
        "Division": "A",
        "Parent Name": "Rajesh Trivedi",
        "Parent Mobile": "9809300592",
        "Parent Secondary Mobile": "9904481848",
        "Transport Type": "Outside Railnagar",
        "Transport fees pending from month": "July",
        "Is RTE": "No",
        [`Year ${activeYearName || '2026-2027'}`]: "nov to may"
      },
      {
        "Student Name": "Aditya Makwana",
        "Medium": "English",
        "Standard": "LKG",
        "Division": "B",
        "Parent Name": "Rajesh Makwana",
        "Parent Mobile": "9533666586",
        "Parent Secondary Mobile": "",
        "Transport Type": "Railnagar",
        "Transport fees pending from month": "",
        "Is RTE": "Yes",
        [`Year ${activeYearName || '2026-2027'}`]: "gov paid"
      },
      {
        "Student Name": "Jiya Mehta",
        "Medium": "English",
        "Standard": "LKG",
        "Division": "B",
        "Parent Name": "Manish Mehta",
        "Parent Mobile": "9417949139",
        "Parent Secondary Mobile": "",
        "Transport Type": "None",
        "Transport fees pending from month": "",
        "Is RTE": "Yes",
        [`Year ${activeYearName || '2026-2027'}`]: "gov paid"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students Import Template");

    // Auto fit column widths
    const maxLens = sampleData.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const val = String((row as any)[key] || '');
        acc[key] = Math.max(acc[key] || 10, val.length, key.length);
      });
      return acc;
    }, {} as Record<string, number>);
    worksheet["!cols"] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));

    XLSX.writeFile(workbook, "students_import_template.xlsx");
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setErrorMsg("Invalid file type. Please upload an Excel sheet (.xlsx, .xls) or CSV file.");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson = XLSX.utils.sheet_to_json(ws);

        if (rawJson.length === 0) {
          setErrorMsg("The selected file is empty.");
          return;
        }

        // Validate Headers (using first row's keys)
        const headers = Object.keys(rawJson[0] as object);
        
        // 1. Strict YYYY-YYYY validation for any 'Year' columns
        const invalidYearCol = headers.find(key => {
          if (key.toLowerCase().startsWith('year ')) {
            return !/^year\s+\d{4}-\d{4}$/i.test(key);
          }
          return false;
        });

        if (invalidYearCol) {
          setErrorMsg(`Invalid column format: "${invalidYearCol}". Year columns must strictly follow the YYYY-YYYY format (e.g., "Year 2026-2027"). Please fix the column name in your Excel file and try again.`);
          return;
        }

        // 2. Validate required columns exist
        const requiredHeaders = ["Student Name", "Medium", "Standard", "Division", "Parent Name", "Parent Mobile"];
        const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, ''));
        const missingHeaders = requiredHeaders.filter(req => !normalizedHeaders.includes(req.toLowerCase().replace(/\s+/g, '')));
        
        if (missingHeaders.length > 0) {
          setErrorMsg(`Missing required columns: ${missingHeaders.join(', ')}. Please use the downloaded template.`);
          return;
        }

        const mapped: ExcelRow[] = rawJson.map((row: any) => {
          const getExcelValue = (targetKey: string): string => {
            const normalizedTarget = targetKey.toLowerCase().replace(/\s+/g, '');
            const k = Object.keys(row).find(keyStr => keyStr.toLowerCase().replace(/\s+/g, '') === normalizedTarget);
            return k ? String(row[k] || '').trim() : '';
          };

          // Normalize RTE flag
          const parseRTE = getExcelValue("Is RTE") || row["isRTE"] || "";

          // Parse any dynamic academic year columns (e.g. Year 2026-2027)
          const pendingFees: Record<string, string> = {};
          Object.keys(row).forEach(key => {
            const match = key.match(/^year\s+(\d{4}-\d{4})$/i);
            if (match) {
              const year = match[1];
              pendingFees[year] = String(row[key] || '').trim();
            }
          });

          const sName = getExcelValue("Student Name") || row["studentName"] || "";
          const med = getExcelValue("Medium") || row["medium"] || "";
          const std = getExcelValue("Standard") || row["standard"] || "";
          const div = getExcelValue("Division") || row["division"] || "";
          const pName = getExcelValue("Parent Name") || row["parentName"] || "";
          const pMobile = cleanMobileNumber(getExcelValue("Parent Mobile") || row["parentMobile"]);
          const pSecMobile = cleanMobileNumber(getExcelValue("Parent Secondary Mobile") || row["parentSecondaryMobile"]);

          // Transport Type logic:
          // blank or 'None' → no transport
          // has value + blank pending month → transport exists, all months PAID
          // has value + pending month specified → transport PENDING from that month
          const rawTransport = (getExcelValue("Transport Type") || row["transportType"] || '').trim();
          const tType = !rawTransport || rawTransport.toLowerCase() === 'none' ? 'None' : rawTransport;

          const startMonthVal = tType !== 'None'
            ? (getExcelValue("Transport fees pending from month") || getExcelValue("Transport Start Month") || row["transportStartMonth"] || '').trim()
            : '';

          let transportStartMonth: string | undefined = undefined;
          let transportAllPaid = false;
          if (tType !== 'None') {
            if (!startMonthVal) {
              // No pending month specified → all transport fees are paid
              transportAllPaid = true;
            } else {
              const clean = startMonthVal.toLowerCase();
              const monthPrefixes = ['jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may'];
              const fullMonthNames = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
              for (let idx = 0; idx < monthPrefixes.length; idx++) {
                if (clean.includes(monthPrefixes[idx])) {
                  transportStartMonth = fullMonthNames[idx];
                  break;
                }
              }
            }
          }

          return {
            studentName: sName,
            medium: med,
            standard: std,
            division: div,
            parentName: pName,
            parentMobile: pMobile,
            parentSecondaryMobile: pSecMobile,
            transportType: tType,
            transportStartMonth,
            transportAllPaid,
            isRTE: parseRTE,
            isNewAdmission: false, // Always false for migration imports (not new admissions)
            pendingFees,
          };
        });

        console.log('[ImportExcel] Parsed rows:', mapped.map(r => ({
          name: r.studentName,
          transportType: r.transportType,
          transportStartMonth: r.transportStartMonth
        })));
        setPreviewData(mapped);
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Failed to parse the Excel file. Make sure columns are formatted correctly.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleImportSubmit = async () => {
    if (previewData.length === 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const report = await importStudents(previewData);
      const enrichedResults = report.results.map((res: any, idx: number) => ({
        ...res,
        originalData: previewData[idx]
      }));
      setSuccessReport({
        ...report,
        results: enrichedResults
      });
      setPreviewData([]);
      setPromoteMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during import.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPreviewData([]);
    setSuccessReport(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Basic row-level validation warnings displayed directly in frontend preview table
  const validateRow = (row: ExcelRow) => {
    const errors: string[] = [];
    if (!String(row.studentName || '').trim()) errors.push("Name missing");
    if (!row.medium || !['English', 'Gujarati'].includes(row.medium)) errors.push("Medium must be English/Gujarati");
    if (!String(row.standard || '').trim()) errors.push("Standard missing");
    if (!String(row.division || '').trim()) errors.push("Division missing");
    if (!String(row.parentName || '').trim()) errors.push("Parent name missing");

    const mobileClean = String(row.parentMobile || '').replace(/\D/g, '');
    if (!mobileClean) {
      errors.push("Primary mobile missing");
    } else if (!/^[6-9]\d{9}$/.test(mobileClean)) {
      errors.push("Invalid Indian mobile (needs 10 digits)");
    }

    if (row.parentSecondaryMobile) {
      const secMobile = String(row.parentSecondaryMobile || '').replace(/\D/g, '');
      if (secMobile && !/^[6-9]\d{9}$/.test(secMobile)) {
        errors.push("Invalid backup mobile");
      }
    }

    if (row.pendingFees) {
      Object.keys(row.pendingFees).forEach(year => {
        const val = String(row.pendingFees![year] || '').toLowerCase();
        if (val && val !== 'paid' && val !== 'gov paid') {
          if (!/^[a-z0-9\- ]+ to may$/i.test(val)) {
            errors.push(`Invalid ${year} status (e.g. "oct to may")`);
          }
        }
      });
    }

    return errors;
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <button
            onClick={() => setScreen('students')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Students
          </button>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-blue-600" />
            Import Excel Spreadsheet
          </h2>
          <p className="text-xs font-semibold text-slate-400">
            Import student profiles and automatically register parents & create fee structures.
          </p>
        </div>

        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01] active:scale-[0.99] shrink-0"
        >
          <Download className="h-4 w-4" />
          Download Excel Template
        </button>
      </header>

      {/* Main Section */}
      {!successReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instructions and Database Schema Alignment */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5 lg:col-span-1">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="h-5 w-5 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Fields Schema Mapping</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                To guarantee clean data inserts, your Excel file columns must align exactly with the school database fields. Use the visual guide below:
              </p>

              <div className="space-y-3.5 overflow-y-auto max-h-[380px] pr-1.5 custom-scrollbar">
                {fieldsSchema.map((field) => (
                  <div key={field.name} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">{field.name}</span>
                      {field.required ? (
                        <span className="text-[9px] font-bold bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.2 rounded uppercase">Required</span>
                      ) : (
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.2 rounded uppercase">Optional</span>
                      )}
                    </div>
                    <span className="text-[10px] block font-mono text-blue-600 mt-1">Schema ID: {field.dbName}</span>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1.5">{field.desc}</p>
                    <div className="mt-1 bg-white border border-slate-200/50 rounded px-2 py-0.5 inline-block text-[9px] text-slate-500">
                      Example: <strong className="font-bold text-slate-600">{field.example}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 flex gap-2.5">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-800 leading-relaxed font-medium">
                  <strong>🚌 Transport Rules:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li><strong>Transport Type = None</strong> or blank → Student has no transport.</li>
                    <li><strong>Transport Type filled + month blank</strong> → Student uses transport but all fees are already paid.</li>
                    <li><strong>Transport Type filled + month written</strong> (e.g. "August") → Transport fees are pending from that month onwards.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-[10px] text-blue-800 leading-relaxed font-medium">
                  <strong>📋 Education Fees Column (Year {activeYearName || '2026-2027'}):</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Write <code>paid</code> if the student has paid all education fees.</li>
                    <li>Write <code>gov paid</code> if fees are covered by the government (RTE).</li>
                    <li>Write <code>oct to may</code> if fees are pending from October onwards.</li>
                    <li>Write <code>may to may</code> if only May month is pending.</li>
                    <li>Leave blank if all fees are unpaid (pending from June).</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-3.5 flex gap-2.5">
                <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-green-800 leading-relaxed font-medium">
                  <strong>👨‍👩‍👧 Parent Sync:</strong> If a parent's mobile already exists in the system, the new student is automatically linked to that parent as a sibling — no duplicate parent created.
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 flex gap-2.5">
                <Info className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-purple-800 leading-relaxed font-medium">
                  <strong>🎓 Standards & Promotion:</strong> When importing old students, enter their standard from the <strong>PREVIOUS</strong> academic year to match their old fees accurately. Once imported, simply use the "Promote Students" tool to bump them to their new standard.
                </p>
              </div>
            </div>
          </div>

          {/* Upload and Live Preview Section */}
          <div className="lg:col-span-2 space-y-6">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {previewData.length === 0 ? (
              /* Drag & Drop Area */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-white border-2 border-dashed rounded-3xl p-12 text-center transition-all flex flex-col items-center justify-center space-y-4 cursor-pointer min-h-[360px] shadow-sm ${isDragging
                    ? 'border-blue-500 bg-blue-50/20'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/30'
                  }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-blue-50 text-blue-600 p-5 rounded-full border border-blue-100">
                  <Upload className="h-8 w-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-slate-800">Drag & drop student Excel sheet here</h4>
                  <p className="text-xs text-slate-400 font-semibold">Supports .xlsx, .xls, and .csv formats</p>
                </div>
                <span className="text-xs font-bold text-slate-400 py-1.5 px-4 bg-slate-100 rounded-full">Or browse local files</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
              </div>
            ) : (
              /* Live Preview Table */
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Spreadsheet Preview</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Loaded {previewData.length} records. Review columns before finalizing import.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleReset}
                      disabled={isLoading}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50"
                    >
                      Clear File
                    </button>
                    <button
                      onClick={handleImportSubmit}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isLoading ? "Importing..." : "Finalize & Import Dues"}
                      {!isLoading && <ChevronRight className="h-4 w-4 stroke-[3]" />}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-[420px] custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] bg-slate-50">
                        <th className="py-3 px-4">Row</th>
                        <th className="py-3 px-4">Student Info</th>
                        <th className="py-3 px-4">Medium/Class</th>
                        <th className="py-3 px-4">Parent Details</th>
                        <th className="py-3 px-4">Transport</th>
                        <th className="py-3 px-4">Other Flags</th>
                        <th className="py-3 px-4 text-center">Validation</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {previewData.map((row, idx) => {
                        const rowErrors = validateRow(row);
                        const hasErrors = rowErrors.length > 0;
                        return (
                          <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${hasErrors ? 'bg-amber-50/20' : ''}`}>
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-slate-800 block">{row.studentName || <span className="text-red-400 italic">Empty</span>}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-600 block">Std {row.standard || '-'}-{row.division || '-'}</span>
                              <span className="text-[10px] text-slate-400">{row.medium}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-700 block">{row.parentName || '-'}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{row.parentMobile || '-'}</span>
                            </td>
                            {/* Dedicated Transport column */}
                            <td className="py-3 px-4">
                              {row.transportType && row.transportType !== 'None' ? (
                                <div className="space-y-1">
                                  <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase block">
                                    {row.transportType}
                                  </span>
                                  {row.transportAllPaid ? (
                                    <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded block">
                                      ✓ All Paid
                                    </span>
                                  ) : row.transportStartMonth ? (
                                    <span className="bg-amber-50 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded block">
                                      Pending from: {row.transportStartMonth}
                                    </span>
                                  ) : (
                                    <span className="bg-amber-50 text-amber-600 text-[8px] font-bold px-1.5 py-0.5 rounded block">
                                      Pending from: June
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[9px]">— No Transport</span>
                              )}
                            </td>
                            <td className="py-3 px-4 space-y-1">
                              <div className="flex gap-1.5 flex-wrap">
                                {(String(row.isRTE).toLowerCase() === 'yes' || row.isRTE === 'true' || row.isRTE === true) && (
                                  <span className="bg-purple-50 text-purple-600 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">RTE</span>
                                )}
                                {row.pendingFees && Object.keys(row.pendingFees).map(yr => (
                                  <span key={yr} className="bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    {yr}: {row.pendingFees?.[yr]}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hasErrors ? (
                                <div className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded-lg py-1 px-2.5 text-left max-w-[200px]" title={rowErrors.join(', ')}>
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{rowErrors[0]}</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-lg py-1 px-2.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  Ready
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleEditClick(idx, 'preview')}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center justify-center"
                                title="Edit Row"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Report Dashboard */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 max-w-4xl mx-auto">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Total Imported</span>
              <strong className="text-2xl font-extrabold text-slate-800">{successReport.successCount + successReport.failCount}</strong>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
              <span className="text-emerald-500 font-bold uppercase tracking-wider text-[10px] block mb-1">Success</span>
              <strong className="text-2xl font-extrabold text-emerald-600">{successReport.successCount}</strong>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
              <span className="text-red-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Failed</span>
              <strong className="text-2xl font-extrabold text-red-500">{successReport.failCount}</strong>
            </div>
          </div>

          {/* Detailed results logs */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Import Status Details</h3>
            <div className="border border-slate-100 rounded-xl overflow-x-auto max-h-[300px] custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] bg-slate-50">
                    <th className="py-2.5 px-4">Row</th>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Details</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {successReport.results.map((res: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/30">
                      <td className="py-2.5 px-4 font-mono text-slate-400">{res.row}</td>
                      <td className="py-2.5 px-4 font-extrabold text-slate-800">{res.studentName}</td>
                      <td className="py-2.5 px-4">
                        {res.status === 'success' ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[9px] border border-emerald-100 uppercase tracking-wider">Success</span>
                        ) : (
                          <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-bold text-[9px] border border-red-100 uppercase tracking-wider">Failed</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold">
                        {res.status === 'success' ? (
                          <div className="space-y-0.5">
                            <span className="text-slate-400 font-mono block">Code: {res.studentCode}</span>
                            {res.transportStartMonth ? (
                              <span className="text-green-600 font-bold block text-[9px] uppercase">
                                ✓ Transport from: {res.transportStartMonth}
                              </span>
                            ) : (
                              <span className="text-orange-500 font-bold block text-[9px] uppercase">
                                ⚠ TransportStartMonth: null/none
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            {res.error}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {res.status === 'failed' && (
                          <button
                            onClick={() => handleEditClick(idx, 'report')}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center justify-center"
                            title="Edit & Retry Row"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-end pt-4 border-t border-slate-100">
            <div className="max-w-md">
              {promoteMsg && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-start gap-2.5 ${promoteMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {promoteMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <span>{promoteMsg.text}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-5 py-2.5 rounded-xl text-xs transition-all"
              >
                Import Another File
              </button>
              {successReport.successCount > 0 && !promoteMsg && (
                <button
                  onClick={handleAutoPromote}
                  disabled={isPromoting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-purple-500/10 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isPromoting ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Auto-Promote Imported Batch
                </button>
              )}
              <button
                onClick={() => setScreen('students')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all"
              >
                Go to Students Screen
              </button>
            </div>
          </div>
        </div>
      )}
        {/* Edit Row Modal */}
      {editingIndex !== null && editForm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 animate-in fade-in zoom-in duration-200">
            <header className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Pencil className="h-5 w-5 text-blue-600" />
                Edit Row {editingIndex + 1} ({editContext === 'preview' ? 'Preview' : 'Failed Record'})
              </h3>
              <button
                onClick={() => { setEditingIndex(null); setEditForm(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 animate-none text-slate-400" />
              </button>
            </header>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-bold flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {/* Student Name */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Student Name *</label>
                <input
                  type="text"
                  value={editForm.studentName || ''}
                  onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Medium */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Medium *</label>
                <select
                  value={editForm.medium || ''}
                  onChange={(e) => setEditForm({ ...editForm, medium: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select Medium</option>
                  <option value="English">English</option>
                  <option value="Gujarati">Gujarati</option>
                </select>
              </div>

              {/* Standard */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Standard *</label>
                <select
                  value={editForm.standard || ''}
                  onChange={(e) => setEditForm({ ...editForm, standard: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select Standard</option>
                  {activeStandards.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Division */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Division *</label>
                <input
                  type="text"
                  value={editForm.division || ''}
                  onChange={(e) => setEditForm({ ...editForm, division: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Parent Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Parent Name *</label>
                <input
                  type="text"
                  value={editForm.parentName || ''}
                  onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Parent Mobile */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Parent Mobile *</label>
                <input
                  type="text"
                  value={editForm.parentMobile || ''}
                  onChange={(e) => setEditForm({ ...editForm, parentMobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              {/* Parent Secondary Mobile */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Secondary Mobile</label>
                <input
                  type="text"
                  value={editForm.parentSecondaryMobile || ''}
                  onChange={(e) => setEditForm({ ...editForm, parentSecondaryMobile: e.target.value })}
                  placeholder="Optional backup contact"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>

              {/* Transport Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Transport Type</label>
                <input
                  type="text"
                  placeholder="e.g. Outside Railnagar, or None"
                  value={editForm.transportType || 'None'}
                  onChange={(e) => setEditForm({ ...editForm, transportType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Transport Pending Month */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Transport Fees Pending From Month</label>
                <select
                  value={editForm.transportStartMonth || ''}
                  onChange={(e) => setEditForm({ ...editForm, transportStartMonth: e.target.value || undefined })}
                  disabled={!editForm.transportType || editForm.transportType === 'None'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-40"
                >
                  <option value="">Blank = All transport fees already paid</option>
                  {['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'].map(m => (
                    <option key={m} value={m}>{m} onwards is pending</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Pending Fees */}
              {editForm.pendingFees && Object.keys(editForm.pendingFees).map(year => (
                <div key={year} className="space-y-1.5 col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Fees: {year}</label>
                  <input
                    type="text"
                    value={editForm.pendingFees?.[year] || ''}
                    onChange={(e) => {
                      const updatedFees = { ...editForm.pendingFees, [year]: e.target.value };
                      setEditForm({ ...editForm, pendingFees: updatedFees });
                    }}
                    placeholder='e.g. paid, gov paid, oct to may'
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              ))}

              {/* RTE */}
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="rte-checkbox"
                  checked={String(editForm.isRTE).toLowerCase() === 'yes' || editForm.isRTE === 'true' || editForm.isRTE === true}
                  onChange={(e) => setEditForm({ ...editForm, isRTE: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="rte-checkbox" className="text-xs font-extrabold text-slate-600 select-none">
                  Right To Education (RTE) Quota
                </label>
              </div>



            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-150">
              <button
                type="button"
                onClick={() => { setEditingIndex(null); setEditForm(null); }}
                disabled={isRetrying}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isRetrying}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all disabled:opacity-50"
              >
                {isRetrying ? "Processing..." : editContext === 'preview' ? "Save Changes" : "Save & Retry Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
