import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../store';
import {
  Printer,
  GraduationCap,
  Award,
  Users,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  Check,
  AlertCircle,
} from '../icons';
import { printHTML } from '../../utils/printUtils';
import { brand } from '../../config/brand';

interface ReportCardsTabProps {
  exam: any;
}

export const ReportCardsTab: React.FC<ReportCardsTabProps> = ({ exam }) => {
  const { authFetch, students } = useApp();

  const [rawResults, setRawResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState(exam.divisions?.[0] || 'A');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Batch Selection & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL' | 'ABSENT'>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchResults = async () => {
      if (!exam?._id) return;
      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/erp/exams/${exam._id}/results`);
        if (res.ok) {
          const json = await res.json();
          setRawResults(json.data || []);
        }
      } catch (err) {
        console.error('Error fetching exam results:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [exam?._id]);

  // Grade helper
  const getGradeInfo = (obtained: number | null, max: number): { grade: string; remark: string } => {
    if (obtained === null || !max) return { grade: '-', remark: '-' };
    const pct = (obtained / max) * 100;
    if (pct >= 91) return { grade: 'A1', remark: 'Outstanding' };
    if (pct >= 81) return { grade: 'A2', remark: 'Excellent' };
    if (pct >= 71) return { grade: 'B1', remark: 'Very Good' };
    if (pct >= 61) return { grade: 'B2', remark: 'Good' };
    if (pct >= 51) return { grade: 'C1', remark: 'Fair' };
    if (pct >= 41) return { grade: 'C2', remark: 'Average' };
    if (pct >= 33) return { grade: 'D', remark: 'Pass' };
    return { grade: 'E', remark: 'Needs Improvement' };
  };

  // Aggregate scorecard per student with ranks
  const studentCards = useMemo(() => {
    const classStudents = students
      .filter(
        (s) =>
          s.standard === exam.standard &&
          s.medium === exam.medium &&
          s.division === selectedDivision &&
          s.isActive !== false &&
          s.isMigrated === true
      )
      .sort((a, b) => {
        if (a.rollNo != null && b.rollNo != null) return a.rollNo - b.rollNo;
        return a.studentName.localeCompare(b.studentName);
      });

    const examSubjects = exam.subjects || [];
    const maxTotal = examSubjects.reduce((acc: number, s: any) => acc + (s.maxMarks || 0), 0);

    const cards = classStudents.map((st) => {
      const studentResults = rawResults.filter(
        (r) =>
          (r.studentId?._id || r.studentId?.id || r.studentId)?.toString() ===
          (st._id || st.id)?.toString()
      );

      let totalObtained = 0;
      let hasFailed = false;
      let allAbsent = true;
      let anyMark = false;

      const subjectRows = examSubjects.map((sub: any) => {
        const subIdStr = (sub.subjectId?._id || sub.subjectId)?.toString();
        const r = studentResults.find(
          (res) => (res.subjectId?._id || res.subjectId)?.toString() === subIdStr
        );

        const attendance = r?.attendance || 'PRESENT';
        const marks =
          attendance === 'PRESENT' && r?.marksObtained != null ? Number(r.marksObtained) : null;
        const gradeInfo = getGradeInfo(marks, sub.maxMarks || 100);
        const grade =
          r?.gradeObtained || (attendance === 'ABSENT' ? 'AB' : gradeInfo.grade);

        if (attendance === 'PRESENT' && marks != null) {
          totalObtained += marks;
          anyMark = true;
          allAbsent = false;
          if (sub.passingMarks && marks < sub.passingMarks) {
            hasFailed = true;
          }
        } else if (attendance === 'ABSENT') {
          hasFailed = true;
        }

        return {
          subjectName: sub.subjectId?.subjectName || 'Subject',
          subjectCode: sub.subjectId?.subjectCode || '',
          maxMarks: sub.maxMarks || 100,
          passingMarks: sub.passingMarks || 35,
          marksObtained: marks,
          attendance,
          grade,
          remark: gradeInfo.remark,
        };
      });

      const percentage = maxTotal > 0 ? Math.round((totalObtained / maxTotal) * 1000) / 10 : 0;
      const overallGrade = allAbsent && !anyMark ? 'AB' : getGradeInfo(totalObtained, maxTotal).grade;
      const result =
        allAbsent && !anyMark
          ? 'ABSENT'
          : hasFailed || percentage < 33
          ? 'FAIL'
          : 'PASS';

      // Pedagogical appraisal remarks
      let teacherRemarks = '';
      if (result === 'ABSENT') {
        teacherRemarks = 'Student was absent for the scheduled examinations.';
      } else if (percentage >= 90) {
        teacherRemarks = 'Outstanding performance! Consistently exhibits exceptional dedication and academic brilliance.';
      } else if (percentage >= 80) {
        teacherRemarks = 'Excellent scholastic achievement. Demonstrates keen analytical understanding and discipline.';
      } else if (percentage >= 70) {
        teacherRemarks = 'Very good progress. Shows solid conceptual grasp with great potential for higher honors.';
      } else if (percentage >= 55) {
        teacherRemarks = 'Good effort with steady progress. Encouraged to participate actively and revise core concepts.';
      } else if (percentage >= 33) {
        teacherRemarks = 'Satisfactory progress. Needs targeted practice and consistent homework review to strengthen foundational skills.';
      } else {
        teacherRemarks = 'Needs remedial attention and dedicated parental support to improve academic performance.';
      }

      return {
        studentId: st._id || st.id,
        studentName: st.studentName,
        rollNo: st.rollNo,
        grNo: st.grNo || st.studentCode || '-',
        fatherName: st.fatherName || '-',
        motherName: st.motherName || '-',
        dob: st.dob ? new Date(st.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
        division: st.division,
        standard: st.standard,
        medium: st.medium,
        subjectRows,
        totalObtained,
        maxTotal,
        percentage,
        overallGrade,
        result,
        teacherRemarks,
        rank: 0,
      };
    });

    // Compute ranks among students who attended and passed or scored marks
    const scoredCards = [...cards]
      .filter((c) => c.result !== 'ABSENT')
      .sort((a, b) => b.totalObtained - a.totalObtained);

    let currentRank = 1;
    scoredCards.forEach((c, idx) => {
      if (idx > 0 && c.totalObtained < scoredCards[idx - 1].totalObtained) {
        currentRank = idx + 1;
      }
      c.rank = currentRank;
    });

    return cards;
  }, [students, rawResults, exam, selectedDivision]);

  // Keep all students selected by default when class loads
  useEffect(() => {
    if (studentCards.length > 0) {
      setSelectedStudentIds(new Set(studentCards.map((c) => c.studentId)));
      if (!selectedStudentId || !studentCards.some((c) => c.studentId === selectedStudentId)) {
        setSelectedStudentId(studentCards[0].studentId);
      }
    } else {
      setSelectedStudentIds(new Set());
      setSelectedStudentId(null);
    }
  }, [studentCards, selectedDivision]);

  // Filtered students based on search and status
  const filteredCards = useMemo(() => {
    return studentCards.filter((c) => {
      if (statusFilter === 'PASS' && c.result !== 'PASS') return false;
      if (statusFilter === 'FAIL' && c.result !== 'FAIL') return false;
      if (statusFilter === 'ABSENT' && c.result !== 'ABSENT') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = c.studentName.toLowerCase().includes(query);
        const matchesRoll = String(c.rollNo || '').includes(query);
        const matchesGr = String(c.grNo || '').toLowerCase().includes(query);
        return matchesName || matchesRoll || matchesGr;
      }
      return true;
    });
  }, [studentCards, statusFilter, searchQuery]);

  const activeCard = useMemo(() => {
    return studentCards.find((c) => c.studentId === selectedStudentId) || filteredCards[0] || null;
  }, [studentCards, filteredCards, selectedStudentId]);

  // Toggle single student selection
  const toggleStudentSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all visible
  const toggleSelectAll = () => {
    const visibleIds = filteredCards.map((c) => c.studentId);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.has(id));

    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Generate High-DPI A4 Report Card HTML
  const generateSingleReportHTML = (card: typeof activeCard) => {
    if (!card) return '';

    const passingStatusColor =
      card.result === 'PASS' ? '#047857' : card.result === 'FAIL' ? '#b91c1c' : '#475569';
    const passingStatusBg =
      card.result === 'PASS' ? '#ecfdf5' : card.result === 'FAIL' ? '#fef2f2' : '#f1f5f9';
    const passingStatusBorder =
      card.result === 'PASS' ? '#a7f3d0' : card.result === 'FAIL' ? '#fecaca' : '#cbd5e1';

    return `
      <div class="report-card-container">
        <!-- Outer Decorative Border -->
        <div class="report-card-border">
          
          <!-- Header -->
          <div class="rc-header">
            <div class="school-title">${brand.schoolName.toUpperCase()}</div>
            <div class="school-subtitle">${brand.medium} Medium • Affiliated & Recognized Education Institution</div>
            <div class="school-address">${brand.address} • Ph: ${brand.phone} • Email: ${brand.email}</div>
            <div class="exam-title-badge">${exam.examName.toUpperCase()}</div>
            <div class="exam-subtext">PROGRESS & EVALUATION REPORT CARD (ACADEMIC YEAR)</div>
          </div>

          <!-- Student Profile Grid -->
          <div class="student-profile-grid">
            <div class="profile-row">
              <div class="profile-cell"><span class="lbl">Student Name:</span> <span class="val">${card.studentName}</span></div>
              <div class="profile-cell"><span class="lbl">Roll No:</span> <span class="val">${card.rollNo ?? '-'}</span></div>
              <div class="profile-cell"><span class="lbl">GR / Scholar No:</span> <span class="val">${card.grNo}</span></div>
            </div>
            <div class="profile-row">
              <div class="profile-cell"><span class="lbl">Class & Section:</span> <span class="val">Std ${card.standard} - Division ${card.division}</span></div>
              <div class="profile-cell"><span class="lbl">Medium:</span> <span class="val">${card.medium}</span></div>
              <div class="profile-cell"><span class="lbl">Date of Birth:</span> <span class="val">${card.dob}</span></div>
            </div>
            <div class="profile-row">
              <div class="profile-cell"><span class="lbl">Father's Name:</span> <span class="val">${card.fatherName}</span></div>
              <div class="profile-cell"><span class="lbl">Mother's Name:</span> <span class="val">${card.motherName}</span></div>
              <div class="profile-cell"><span class="lbl">Class Rank:</span> <span class="val">${card.rank > 0 ? `#${card.rank}` : '-'}</span></div>
            </div>
          </div>

          <!-- Scholastic Table -->
          <div class="table-title">PART 1: SCHOLASTIC PERFORMANCE</div>
          <table class="marks-table">
            <thead>
              <tr>
                <th style="width: 38px; text-align: center;">#</th>
                <th style="text-align: left;">Subject Name</th>
                <th style="width: 80px; text-align: center;">Max Marks</th>
                <th style="width: 80px; text-align: center;">Pass Marks</th>
                <th style="width: 100px; text-align: center;">Marks Obtained</th>
                <th style="width: 70px; text-align: center;">Grade</th>
                <th style="width: 120px; text-align: left;">Remark</th>
              </tr>
            </thead>
            <tbody>
              ${card.subjectRows
                .map(
                  (sub: any, idx: number) => `
                <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
                  <td style="text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
                  <td style="font-weight: 700; color: #0f172a;">${sub.subjectName}</td>
                  <td style="text-align: center;">${sub.maxMarks}</td>
                  <td style="text-align: center; color: #64748b;">${sub.passingMarks}</td>
                  <td style="text-align: center; font-weight: 800; ${
                    sub.attendance === 'ABSENT'
                      ? 'color: #dc2626;'
                      : sub.marksObtained != null && sub.marksObtained < sub.passingMarks
                      ? 'color: #dc2626;'
                      : 'color: #1e293b;'
                  }">
                    ${sub.attendance === 'ABSENT' ? 'ABSENT' : sub.marksObtained ?? '-'}
                  </td>
                  <td style="text-align: center; font-weight: 800; color: #3730a3;">${sub.grade}</td>
                  <td style="font-size: 8pt; color: #475569;">${sub.remark}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2" style="text-align: left; font-weight: 800;">GRAND TOTAL</td>
                <td style="text-align: center;">${card.maxTotal}</td>
                <td style="text-align: center;">-</td>
                <td style="text-align: center; color: #3730a3; font-weight: 900; font-size: 11pt;">${card.totalObtained}</td>
                <td style="text-align: center; color: #3730a3; font-weight: 900; font-size: 11pt;">${card.overallGrade}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <!-- Performance & Summary Highlights -->
          <div class="summary-card">
            <div class="sum-col">
              <span class="sum-lbl">Percentage</span>
              <span class="sum-val" style="color: #3730a3;">${card.percentage}%</span>
            </div>
            <div class="sum-col">
              <span class="sum-lbl">Overall Grade</span>
              <span class="sum-val" style="color: #3730a3;">${card.overallGrade}</span>
            </div>
            <div class="sum-col">
              <span class="sum-lbl">Class Rank</span>
              <span class="sum-val" style="color: #047857;">${card.rank > 0 ? `Rank ${card.rank}` : '-'}</span>
            </div>
            <div class="sum-col">
              <span class="sum-lbl">Final Status</span>
              <span class="status-pill" style="color: ${passingStatusColor}; background: ${passingStatusBg}; border: 1px solid ${passingStatusBorder};">
                ${card.result}
              </span>
            </div>
          </div>

          <!-- Teacher's Remarks -->
          <div class="remarks-box">
            <span class="remarks-title">Class Teacher's Appraisal & Remarks:</span>
            <span class="remarks-content">"${card.teacherRemarks}"</span>
          </div>

          <!-- Grading Scale Reference -->
          <div class="grading-scale-container">
            <div class="scale-header">GRADING SCALE (CBSE & STATE BOARD CURRICULUM SCALE)</div>
            <div class="scale-grid">
              <div class="scale-item"><b>A1:</b> 91-100% (Outstanding)</div>
              <div class="scale-item"><b>A2:</b> 81-90% (Excellent)</div>
              <div class="scale-item"><b>B1:</b> 71-80% (Very Good)</div>
              <div class="scale-item"><b>B2:</b> 61-70% (Good)</div>
              <div class="scale-item"><b>C1:</b> 51-60% (Fair)</div>
              <div class="scale-item"><b>C2:</b> 41-50% (Average)</div>
              <div class="scale-item"><b>D:</b> 33-40% (Pass)</div>
              <div class="scale-item"><b>E:</b> Below 33% (Needs Help)</div>
            </div>
          </div>

          <!-- Signatures -->
          <div class="signatures-row">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-title">Class Teacher</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-title">Examination In-Charge</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-title">Principal</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-title">Parent / Guardian</div>
            </div>
          </div>

          <!-- Footer Metadata -->
          <div class="rc-footer-meta">
            <span>Report Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span>Student UID: ${card.studentId}</span>
            <span>Official Computer-Generated Progress Record</span>
          </div>

        </div>
      </div>
    `;
  };

  const getFullPrintHTML = (innerContent: string) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Academic Report Cards</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .report-card-container {
      width: 100%;
      height: 100%;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    .report-card-container:last-child {
      page-break-after: avoid;
    }

    .report-card-border {
      border: 2.5px solid #1e1b4b;
      outline: 1px solid #94a3b8;
      outline-offset: -5px;
      padding: 16px 20px;
      position: relative;
      background: #ffffff;
      min-height: 275mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .rc-header {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }

    .school-title {
      font-family: 'Cinzel', serif;
      font-size: 18pt;
      font-weight: 800;
      color: #1e1b4b;
      letter-spacing: 0.8px;
      line-height: 1.2;
    }

    .school-subtitle {
      font-size: 8.5pt;
      font-weight: 700;
      color: #3730a3;
      margin-top: 3px;
      letter-spacing: 0.3px;
    }

    .school-address {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 2px;
    }

    .exam-title-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 14px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 9999px;
      color: #312e81;
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .exam-subtext {
      font-size: 7pt;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.6px;
      margin-top: 3px;
    }

    .student-profile-grid {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }

    .profile-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 3.5px 0;
      border-bottom: 1px dashed #e2e8f0;
    }

    .profile-row:last-child {
      border-bottom: none;
    }

    .profile-cell {
      flex: 1;
      font-size: 8.5pt;
    }

    .profile-cell .lbl {
      color: #64748b;
      font-weight: 600;
      font-size: 8pt;
      margin-right: 4px;
    }

    .profile-cell .val {
      color: #0f172a;
      font-weight: 700;
    }

    .table-title {
      font-size: 8pt;
      font-weight: 800;
      color: #475569;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .marks-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 12px;
    }

    .marks-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7.5pt;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
    }

    .marks-table td {
      padding: 5.5px 8px;
      border: 1px solid #e2e8f0;
    }

    .marks-table tr.even {
      background: #fafaf9;
    }

    .marks-table .total-row td {
      background: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 800;
      padding: 7px 8px;
    }

    .summary-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 16px;
      margin-bottom: 10px;
    }

    .sum-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .sum-lbl {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .sum-val {
      font-size: 12pt;
      font-weight: 900;
    }

    .status-pill {
      font-size: 8pt;
      font-weight: 900;
      padding: 2px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .remarks-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 8pt;
      color: #854d0e;
    }

    .remarks-title {
      font-weight: 800;
      margin-right: 6px;
      color: #713f12;
    }

    .remarks-content {
      font-style: italic;
      font-weight: 600;
    }

    .grading-scale-container {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 14px;
      background: #ffffff;
    }

    .scale-header {
      font-size: 6.5pt;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }

    .scale-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px 8px;
      font-size: 7pt;
      color: #475569;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 18px;
      margin-bottom: 6px;
      padding: 0 10px;
    }

    .sig-box {
      text-align: center;
      width: 120px;
    }

    .sig-line {
      height: 1px;
      background: #94a3b8;
      margin-bottom: 4px;
    }

    .sig-title {
      font-size: 7.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }

    .rc-footer-meta {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      padding-top: 4px;
      font-size: 6.5pt;
      color: #94a3b8;
      font-family: monospace;
    }
  </style>
</head>
<body>
  ${innerContent}
</body>
</html>`;
  };

  // Print single active card
  const handlePrintSingle = () => {
    if (!activeCard) return;
    const html = getFullPrintHTML(generateSingleReportHTML(activeCard));
    printHTML(html);
  };

  // Print all selected cards (or all if none selected)
  const handlePrintBatch = () => {
    const cardsToPrint =
      selectedStudentIds.size > 0
        ? studentCards.filter((c) => selectedStudentIds.has(c.studentId))
        : filteredCards;

    if (cardsToPrint.length === 0) return;

    const combinedBody = cardsToPrint.map((c) => generateSingleReportHTML(c)).join('');
    const fullHTML = getFullPrintHTML(combinedBody);
    printHTML(fullHTML);
  };

  const selectedCount = studentCards.filter((c) => selectedStudentIds.has(c.studentId)).length;
  const isAllFilteredSelected =
    filteredCards.length > 0 && filteredCards.every((c) => selectedStudentIds.has(c.studentId));

  return (
    <div className="space-y-5">
      {/* Top Controls & Batch Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Division & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Division:</label>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setSelectedStudentId(null);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {(exam.divisions?.length ? exam.divisions : ['A', 'B', 'C', 'D']).map((d: string) => (
                <option key={d} value={d}>
                  Division {d}
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {(
              [
                { id: 'ALL', label: `All (${studentCards.length})` },
                { id: 'PASS', label: `Passed (${studentCards.filter((c) => c.result === 'PASS').length})` },
                { id: 'FAIL', label: `Needs Help (${studentCards.filter((c) => c.result === 'FAIL').length})` },
                { id: 'ABSENT', label: `Absent (${studentCards.filter((c) => c.result === 'ABSENT').length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                    : 'hover:text-slate-900 text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Print Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintSingle}
            disabled={!activeCard}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Print only the report card currently displayed in preview"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Current</span>
          </button>

          <button
            type="button"
            onClick={handlePrintBatch}
            disabled={selectedCount === 0}
            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            title="Batch print all selected student report cards on separate A4 pages"
          >
            <Printer className="w-4 h-4" />
            <span>Print Batch ({selectedCount} Selected)</span>
          </button>
        </div>
      </div>

      {/* Main Content: Left Student List & Right High-Fidelity Preview */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: Students Batch List */}
        <div className="w-full lg:w-80 shrink-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[680px]">
          {/* Search & Select All Header */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, roll no, GR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Select All ({filteredCards.length})</span>
              </label>

              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                {selectedCount} Selected
              </span>
            </div>
          </div>

          {/* Scrollable Student Items */}
          <div className="overflow-y-auto p-2 space-y-1 flex-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs font-semibold">Loading student scorecards...</span>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No students match the current filters.
              </div>
            ) : (
              filteredCards.map((c) => {
                const isSelected = activeCard?.studentId === c.studentId;
                const isChecked = selectedStudentIds.has(c.studentId);

                return (
                  <div
                    key={c.studentId}
                    onClick={() => setSelectedStudentId(c.studentId)}
                    className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-300 font-bold text-indigo-950 shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => toggleStudentSelection(c.studentId, e)}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                      />

                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-black flex items-center justify-center text-[10px] shrink-0">
                        {c.rollNo ?? '-'}
                      </span>

                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-900 leading-tight">
                          {c.studentName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold truncate">
                          GR: {c.grNo} • Rank: {c.rank > 0 ? `#${c.rank}` : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-slate-700">{c.percentage}%</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                          c.result === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.result === 'FAIL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.overallGrade}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Live Report Card Preview */}
        <div className="flex-1 w-full bg-slate-100/60 rounded-3xl border border-slate-200 p-4 sm:p-6 overflow-hidden">
          {activeCard ? (
            <div className="max-w-2xl mx-auto bg-white border border-slate-300 rounded-2xl shadow-md p-6 sm:p-8 space-y-5">
              {/* Report Card Header Preview */}
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="font-serif text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {brand.schoolName.toUpperCase()}
                </h2>
                <div className="text-xs font-extrabold text-indigo-700 tracking-wide mt-0.5">
                  {brand.medium} Medium • Affiliated & Recognized Education Institution
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{brand.address} • Ph: {brand.phone}</div>
                <div className="inline-block mt-3 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-black text-indigo-900 uppercase tracking-wider">
                  {exam.examName} · Progress Report
                </div>
              </div>

              {/* Student Metadata Box */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Student Name</span>
                  <strong className="text-slate-900">{activeCard.studentName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Roll No & GR</span>
                  <strong className="text-slate-900">Roll: {activeCard.rollNo ?? '-'} · GR: {activeCard.grNo}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Class & Div</span>
                  <strong className="text-slate-900">Std {activeCard.standard}-{activeCard.division}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Father's Name</span>
                  <strong className="text-slate-800">{activeCard.fatherName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Date of Birth</span>
                  <strong className="text-slate-800">{activeCard.dob}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Class Rank</span>
                  <strong className="text-emerald-700">{activeCard.rank > 0 ? `Rank #${activeCard.rank}` : '-'}</strong>
                </div>
              </div>

              {/* Scholastic Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                      <th className="py-2 px-3">Subject</th>
                      <th className="py-2 px-3 text-center">Max</th>
                      <th className="py-2 px-3 text-center">Pass</th>
                      <th className="py-2 px-3 text-center">Obtained</th>
                      <th className="py-2 px-3 text-center">Grade</th>
                      <th className="py-2 px-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeCard.subjectRows.map((s: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-3 font-bold text-slate-800">{s.subjectName}</td>
                        <td className="py-2 px-3 text-center text-slate-500">{s.maxMarks}</td>
                        <td className="py-2 px-3 text-center text-slate-500">{s.passingMarks}</td>
                        <td
                          className={`py-2 px-3 text-center font-black ${
                            s.attendance === 'ABSENT'
                              ? 'text-rose-600'
                              : s.marksObtained != null && s.marksObtained < s.passingMarks
                              ? 'text-rose-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {s.attendance === 'ABSENT' ? 'ABSENT' : s.marksObtained ?? '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-black text-indigo-700">{s.grade}</td>
                        <td className="py-2 px-3 text-[11px] text-slate-500 font-medium">{s.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                      <td className="py-2.5 px-3">GRAND TOTAL</td>
                      <td className="py-2.5 px-3 text-center">{activeCard.maxTotal}</td>
                      <td className="py-2.5 px-3 text-center">-</td>
                      <td className="py-2.5 px-3 text-center text-indigo-700 text-sm">{activeCard.totalObtained}</td>
                      <td className="py-2.5 px-3 text-center text-indigo-700 text-sm">{activeCard.overallGrade}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Result Summary Pill */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Percentage</span>
                  <span className="text-base font-black text-indigo-900">{activeCard.percentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Grade</span>
                  <span className="text-base font-black text-indigo-900">{activeCard.overallGrade}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Rank</span>
                  <span className="text-base font-black text-emerald-700">
                    {activeCard.rank > 0 ? `#${activeCard.rank}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Final Result</span>
                  <span
                    className={`inline-block text-xs font-black px-2.5 py-0.5 rounded-full uppercase mt-0.5 ${
                      activeCard.result === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeCard.result === 'FAIL'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {activeCard.result}
                  </span>
                </div>
              </div>

              {/* Teacher Remarks Box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-extrabold text-amber-950 block mb-0.5">Class Teacher's Appraisal:</span>
                <p className="italic font-medium">"{activeCard.teacherRemarks}"</p>
              </div>

              {/* Signature Lines */}
              <div className="grid grid-cols-4 gap-4 pt-6 text-center text-[10px] font-bold text-slate-500 uppercase">
                <div className="border-t border-slate-300 pt-1.5">Class Teacher</div>
                <div className="border-t border-slate-300 pt-1.5">Exam In-Charge</div>
                <div className="border-t border-slate-300 pt-1.5">Principal</div>
                <div className="border-t border-slate-300 pt-1.5">Parent / Guardian</div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-400 text-xs">
              Select a student to view and preview their academic progress report card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
