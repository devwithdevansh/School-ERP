import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../store';
import { Printer, GraduationCap, Award, Users, CheckCircle2, ChevronRight, FileText, Loader2 } from '../icons';
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [exam?._id]);

  // Aggregate scorecard per student
  const studentCards = useMemo(() => {
    const classStudents = students.filter(s =>
      s.standard === exam.standard &&
      s.medium === exam.medium &&
      s.division === selectedDivision &&
      s.isActive !== false &&
      s.isMigrated === true
    ).sort((a, b) => {
      if (a.rollNo != null && b.rollNo != null) return a.rollNo - b.rollNo;
      return a.studentName.localeCompare(b.studentName);
    });

    const examSubjects = exam.subjects || [];
    const maxTotal = examSubjects.reduce((acc: number, s: any) => acc + (s.maxMarks || 0), 0);

    return classStudents.map(st => {
      const studentResults = rawResults.filter(
        r => (r.studentId?._id || r.studentId?.id || r.studentId)?.toString() === (st._id || st.id)?.toString()
      );

      let totalObtained = 0;
      let hasFailed = false;
      let allAbsent = true;
      let anyMark = false;

      const subjectRows = examSubjects.map((sub: any) => {
        const subIdStr = (sub.subjectId?._id || sub.subjectId)?.toString();
        const r = studentResults.find(res => (res.subjectId?._id || res.subjectId)?.toString() === subIdStr);

        const attendance = r?.attendance || 'PRESENT';
        const marks = attendance === 'PRESENT' && r?.marksObtained != null ? Number(r.marksObtained) : null;
        const grade = r?.gradeObtained || (marks != null && sub.maxMarks ? getGrade(marks, sub.maxMarks) : '-');

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
          grade
        };
      });

      const percentage = maxTotal > 0 ? Math.round((totalObtained / maxTotal) * 1000) / 10 : 0;
      const overallGrade = getGrade(totalObtained, maxTotal);
      const result = allAbsent && !anyMark ? 'ABSENT' : hasFailed || percentage < 33 ? 'FAIL' : 'PASS';

      return {
        studentId: st._id || st.id,
        studentName: st.studentName,
        rollNo: st.rollNo,
        division: st.division,
        standard: st.standard,
        medium: st.medium,
        subjectRows,
        totalObtained,
        maxTotal,
        percentage,
        overallGrade,
        result
      };
    });
  }, [students, rawResults, exam, selectedDivision]);

  useEffect(() => {
    if (studentCards.length > 0 && !selectedStudentId) {
      setSelectedStudentId(studentCards[0].studentId);
    }
  }, [studentCards, selectedStudentId]);

  const activeCard = useMemo(() => {
    return studentCards.find(c => c.studentId === selectedStudentId) || studentCards[0] || null;
  }, [studentCards, selectedStudentId]);

  function getGrade(obtained: number, max: number): string {
    if (!max) return '-';
    const pct = (obtained / max) * 100;
    if (pct >= 90) return 'A1';
    if (pct >= 80) return 'A2';
    if (pct >= 70) return 'B1';
    if (pct >= 60) return 'B2';
    if (pct >= 50) return 'C1';
    if (pct >= 40) return 'C2';
    if (pct >= 33) return 'D';
    return 'E';
  }

  const generateSingleReportHTML = (card: typeof activeCard) => {
    if (!card) return '';
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; max-width: 800px; margin: 0 auto; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px;">${brand.schoolName || brand.productName || 'School ERP'}</h1>
          <h3 style="margin: 6px 0 0; font-size: 16px; color: #4338ca;">STUDENT REPORT CARD</h3>
          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b; font-weight: 600;">${exam.examName} · Academic Year</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: 13px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div>Student Name: <strong>${card.studentName}</strong></div>
          <div>Roll Number: <strong>${card.rollNo || '-'}</strong></div>
          <div>Standard & Division: <strong>Std ${card.standard}-${card.division}</strong></div>
          <div>Medium of Instruction: <strong>${card.medium}</strong></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f1f5f9; color: #475569; text-transform: uppercase;">
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Subject</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Max Marks</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Pass Marks</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Marks Obtained</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${card.subjectRows.map((sub: any) => `
              <tr>
                <td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 600;">${sub.subjectName}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${sub.maxMarks}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${sub.passingMarks}</td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-weight: bold; ${sub.attendance === 'ABSENT' ? 'color: #e11d48;' : sub.marksObtained != null && sub.marksObtained < sub.passingMarks ? 'color: #e11d48;' : ''}">
                  ${sub.attendance === 'ABSENT' ? 'ABSENT' : sub.marksObtained ?? '-'}
                </td>
                <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-weight: bold;">${sub.grade}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold; font-size: 13px;">
              <td style="border: 1px solid #cbd5e1; padding: 10px;">Grand Total</td>
              <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">${card.maxTotal}</td>
              <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">-</td>
              <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; color: #4338ca;">${card.totalObtained}</td>
              <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">${card.overallGrade}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 12px 18px; margin-bottom: 40px;">
          <div>Percentage: <strong style="font-size: 16px; color: #3730a3;">${card.percentage}%</strong></div>
          <div>Overall Grade: <strong style="font-size: 16px; color: #3730a3;">${card.overallGrade}</strong></div>
          <div>Final Result: <strong style="font-size: 16px; color: ${card.result === 'PASS' ? '#059669' : '#dc2626'}; text-transform: uppercase;">${card.result}</strong></div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 60px; font-size: 12px; font-weight: bold; color: #64748b; padding: 0 20px;">
          <div style="text-align: center; border-top: 1px solid #94a3b8; width: 140px; padding-top: 6px;">Class Teacher</div>
          <div style="text-align: center; border-top: 1px solid #94a3b8; width: 140px; padding-top: 6px;">Principal</div>
          <div style="text-align: center; border-top: 1px solid #94a3b8; width: 140px; padding-top: 6px;">Parent Signature</div>
        </div>
      </div>
    `;
  };

  const handlePrintSingle = () => {
    if (!activeCard) return;
    printHTML(generateSingleReportHTML(activeCard));
  };

  const handlePrintAll = () => {
    if (studentCards.length === 0) return;
    const combinedHTML = studentCards
      .map(card => `<div style="page-break-after: always;">${generateSingleReportHTML(card)}</div>`)
      .join('');
    printHTML(combinedHTML);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Division:</label>
          <select
            value={selectedDivision}
            onChange={e => { setSelectedDivision(e.target.value); setSelectedStudentId(null); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(exam.divisions?.length ? exam.divisions : ['A', 'B', 'C', 'D']).map((d: string) => (
              <option key={d} value={d}>Division {d}</option>
            ))}
          </select>
          <span className="text-xs font-semibold text-slate-400">
            ({studentCards.length} Students)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintSingle}
            disabled={!activeCard}
            className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print Current
          </button>
          <button
            onClick={handlePrintAll}
            disabled={studentCards.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print All ({studentCards.length})
          </button>
        </div>
      </div>

      {/* Main Split: Student List on left, Report Card Preview on right */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Student Selector List */}
        <div className="w-full lg:w-72 shrink-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[620px]">
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 font-extrabold text-xs text-slate-700 uppercase tracking-wider">
            Students List
          </div>
          <div className="overflow-y-auto p-2 space-y-1.5 flex-1">
            {studentCards.map(c => {
              const isSelected = activeCard?.studentId === c.studentId;
              return (
                <div
                  key={c.studentId}
                  onClick={() => setSelectedStudentId(c.studentId)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-indigo-50 border border-indigo-300 font-bold text-indigo-950 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {c.rollNo ?? '-'}
                    </span>
                    <span className="truncate">{c.studentName}</span>
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    c.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : c.result === 'FAIL' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {c.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="flex-1 w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
          {activeCard ? (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div className="text-center border-b border-slate-200 pb-4">
                <h3 className="font-black text-xl text-slate-900 tracking-tight">{brand.schoolName || brand.productName || 'School ERP'}</h3>
                <div className="text-xs font-black text-indigo-600 uppercase tracking-wider mt-0.5">Student Academic Report Card</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">{exam.examName}</div>
              </div>

              {/* Student Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>Student Name: <strong className="text-slate-900">{activeCard.studentName}</strong></div>
                <div>Roll Number: <strong className="text-slate-900">{activeCard.rollNo || '-'}</strong></div>
                <div>Class: <strong className="text-slate-900">Std {activeCard.standard}-{activeCard.division}</strong></div>
                <div>Medium: <strong className="text-slate-900">{activeCard.medium}</strong></div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase">
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3 text-center">Max</th>
                      <th className="py-2.5 px-3 text-center">Pass</th>
                      <th className="py-2.5 px-3 text-center">Marks</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeCard.subjectRows.map((s: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{s.subjectName}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{s.maxMarks}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{s.passingMarks}</td>
                        <td className={`py-2.5 px-3 text-center font-black ${
                          s.attendance === 'ABSENT' ? 'text-rose-600' : s.marksObtained != null && s.marksObtained < s.passingMarks ? 'text-rose-600' : 'text-slate-800'
                        }`}>
                          {s.attendance === 'ABSENT' ? 'ABSENT' : s.marksObtained ?? '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-700">{s.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 font-black border-t border-slate-200">
                      <td className="py-3 px-3">Grand Total</td>
                      <td className="py-3 px-3 text-center">{activeCard.maxTotal}</td>
                      <td className="py-3 px-3 text-center">-</td>
                      <td className="py-3 px-3 text-center text-indigo-700">{activeCard.totalObtained}</td>
                      <td className="py-3 px-3 text-center text-indigo-700">{activeCard.overallGrade}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Result Pill */}
              <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs font-bold text-indigo-950">
                <div>Percentage: <span className="text-base font-black text-indigo-700">{activeCard.percentage}%</span></div>
                <div>Grade: <span className="text-base font-black text-indigo-700">{activeCard.overallGrade}</span></div>
                <div>
                  Result:{' '}
                  <span className={`text-sm font-black px-3 py-1 rounded-full ${
                    activeCard.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeCard.result}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              Select a student to preview report card
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
