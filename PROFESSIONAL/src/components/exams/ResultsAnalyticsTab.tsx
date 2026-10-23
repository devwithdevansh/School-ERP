import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../store';
import { Award, Printer, BarChart3, CheckCircle2, XCircle, Users, Loader2 } from '../icons';
import { printHTML } from '../../utils/printUtils';

interface ResultsAnalyticsTabProps {
  exam: any;
}

export const ResultsAnalyticsTab: React.FC<ResultsAnalyticsTabProps> = ({ exam }) => {
  const { authFetch, students } = useApp();

  const [rawResults, setRawResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState('');

  useEffect(() => {
    const fetchAllResults = async () => {
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

    fetchAllResults();
  }, [exam?._id]);

  // Aggregate student scorecards
  const studentScorecards = useMemo(() => {
    // Unique students from results or active migrated students
    const studentMap: { [studentId: string]: any } = {};

    // First populate from store students matching this exam standard & medium
    const classStudents = students.filter(s =>
      s.standard === exam.standard &&
      s.medium === exam.medium &&
      s.isActive !== false &&
      s.isMigrated === true &&
      (!divisionFilter || s.division === divisionFilter) &&
      (!exam.divisions?.length || exam.divisions.includes(s.division))
    );

    classStudents.forEach(st => {
      studentMap[st._id || st.id] = {
        studentId: st._id || st.id,
        studentName: st.studentName,
        rollNo: st.rollNo,
        division: st.division,
        subjectMarks: {},
        totalObtained: 0,
        maxTotal: 0,
        hasFailedSubject: false,
        allAbsent: true,
        anyMarkPresent: false
      };
    });

    // Populate with fetched results
    rawResults.forEach(r => {
      const stId = (r.studentId?._id || r.studentId?.id || r.studentId)?.toString();
      if (!stId) return;

      if (!studentMap[stId]) {
        if (divisionFilter && r.studentId?.division !== divisionFilter) return;
        studentMap[stId] = {
          studentId: stId,
          studentName: r.studentId?.studentName || 'Student',
          rollNo: r.studentId?.rollNo,
          division: r.studentId?.division || 'A',
          subjectMarks: {},
          totalObtained: 0,
          maxTotal: 0,
          hasFailedSubject: false,
          allAbsent: true,
          anyMarkPresent: false
        };
      }

      const card = studentMap[stId];
      const subIdStr = (r.subjectId?._id || r.subjectId)?.toString();

      card.subjectMarks[subIdStr] = {
        marks: r.marksObtained,
        grade: r.gradeObtained,
        attendance: r.attendance || 'PRESENT',
        maxMarks: r.maxMarks,
        passingMarks: r.passingMarks
      };

      if (r.attendance === 'PRESENT' && r.marksObtained != null) {
        card.totalObtained += Number(r.marksObtained);
        card.anyMarkPresent = true;
        card.allAbsent = false;
        if (r.passingMarks && Number(r.marksObtained) < r.passingMarks) {
          card.hasFailedSubject = true;
        }
      } else if (r.attendance === 'ABSENT') {
        card.hasFailedSubject = true;
      }
    });

    // Calculate max total and percentage
    const examSubjects = exam.subjects || [];
    const fullMaxTotal = examSubjects.reduce((acc: number, s: any) => acc + (s.maxMarks || 0), 0);

    const cards = Object.values(studentMap).map((card: any) => {
      card.maxTotal = fullMaxTotal;
      const pct = card.maxTotal > 0 ? (card.totalObtained / card.maxTotal) * 100 : 0;
      card.percentage = Math.round(pct * 10) / 10;

      // Grade calculation
      if (pct >= 90) card.grade = 'A1';
      else if (pct >= 80) card.grade = 'A2';
      else if (pct >= 70) card.grade = 'B1';
      else if (pct >= 60) card.grade = 'B2';
      else if (pct >= 50) card.grade = 'C1';
      else if (pct >= 40) card.grade = 'C2';
      else if (pct >= 33) card.grade = 'D';
      else card.grade = 'E';

      if (card.allAbsent && !card.anyMarkPresent) {
        card.result = 'ABSENT';
      } else if (card.hasFailedSubject || card.percentage < 33) {
        card.result = 'FAIL';
      } else {
        card.result = 'PASS';
      }

      return card;
    });

    // Sort by Total Marks descending to calculate ranks
    cards.sort((a, b) => b.totalObtained - a.totalObtained);

    let currentRank = 1;
    cards.forEach((card, idx) => {
      if (card.result === 'ABSENT') {
        card.rank = '-';
      } else {
        if (idx > 0 && cards[idx - 1].totalObtained === card.totalObtained) {
          card.rank = cards[idx - 1].rank;
        } else {
          card.rank = currentRank;
        }
        currentRank++;
      }
    });

    return cards;
  }, [rawResults, students, exam, divisionFilter]);

  // Class Statistics
  const stats = useMemo(() => {
    if (studentScorecards.length === 0) {
      return { avg: 0, passRate: 0, topper: null, total: 0 };
    }

    const presentStudents = studentScorecards.filter(c => c.result !== 'ABSENT');
    const totalPresents = presentStudents.length;

    const avg = totalPresents > 0
      ? Math.round(presentStudents.reduce((acc, c) => acc + c.percentage, 0) / totalPresents)
      : 0;

    const passedCount = studentScorecards.filter(c => c.result === 'PASS').length;
    const passRate = totalPresents > 0 ? Math.round((passedCount / totalPresents) * 100) : 0;

    const topper = presentStudents.length > 0 ? presentStudents[0] : null;

    return { avg, passRate, topper, total: studentScorecards.length };
  }, [studentScorecards]);

  const handlePrintScorecard = () => {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 4px;">${exam.examName}</h2>
        <p style="text-align: center; margin-top: 0; color: #555; font-size: 13px;">
          Standard ${exam.standard} (${exam.medium}) ${divisionFilter ? `· Division ${divisionFilter}` : ''}
        </p>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; border: 1px solid #ddd; padding: 10px; border-radius: 6px;">
          <div>Total Students: <b>${stats.total}</b></div>
          <div>Class Average: <b>${stats.avg}%</b></div>
          <div>Passing Rate: <b>${stats.passRate}%</b></div>
          <div>Topper: <b>${stats.topper?.studentName || 'N/A'} (${stats.topper?.percentage || 0}%)</b></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f4f4f4;">
              <th style="border: 1px solid #ddd; padding: 6px;">Rank</th>
              <th style="border: 1px solid #ddd; padding: 6px;">Roll</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Student Name</th>
              <th style="border: 1px solid #ddd; padding: 6px;">Div</th>
              ${(exam.subjects || []).map((s: any) => `<th style="border: 1px solid #ddd; padding: 6px;">${s.subjectId?.subjectName || 'Sub'}</th>`).join('')}
              <th style="border: 1px solid #ddd; padding: 6px;">Total</th>
              <th style="border: 1px solid #ddd; padding: 6px;">%</th>
              <th style="border: 1px solid #ddd; padding: 6px;">Grade</th>
              <th style="border: 1px solid #ddd; padding: 6px;">Result</th>
            </tr>
          </thead>
          <tbody>
            ${studentScorecards.map(c => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${c.rank}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${c.rollNo || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 5px;">${c.studentName}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${c.division}</td>
                ${(exam.subjects || []).map((s: any) => {
                  const subId = (s.subjectId?._id || s.subjectId)?.toString();
                  const markInfo = c.subjectMarks[subId];
                  const display = markInfo?.attendance === 'ABSENT' ? 'ABS' : markInfo?.marks ?? '-';
                  return `<td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${display}</td>`;
                }).join('')}
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center; font-weight: bold;">${c.totalObtained} / ${c.maxTotal}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center; font-weight: bold;">${c.percentage}%</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center;">${c.grade}</td>
                <td style="border: 1px solid #ddd; padding: 5px; text-align: center; font-weight: bold; color: ${c.result === 'PASS' ? '#047857' : c.result === 'FAIL' ? '#b91c1c' : '#6b7280'};">${c.result}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    printHTML(html);
  };

  return (
    <div className="space-y-6">
      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students Evaluated</div>
            <div className="text-xl font-black text-slate-800">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Passing Rate</div>
            <div className="text-xl font-black text-emerald-600">{stats.passRate}%</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Class Average</div>
            <div className="text-xl font-black text-blue-600">{stats.avg}%</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Class Topper</div>
            <div className="text-sm font-black text-slate-800 truncate max-w-[120px]" title={stats.topper?.studentName}>
              {stats.topper ? `${stats.topper.studentName} (${stats.topper.percentage}%)` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={divisionFilter}
            onChange={e => setDivisionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Divisions</option>
            {(exam.divisions?.length ? exam.divisions : ['A', 'B', 'C', 'D']).map((d: string) => (
              <option key={d} value={d}>Division {d}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePrintScorecard}
          disabled={studentScorecards.length === 0}
          className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
        >
          <Printer className="w-4 h-4" /> Print Results Sheet
        </button>
      </div>

      {/* Scorecard Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-bold text-slate-500">Calculating student merit rankings...</p>
          </div>
        ) : studentScorecards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
            <p className="font-bold text-sm text-slate-600">No results recorded yet</p>
            <p className="text-xs text-slate-400">Enter student marks in the Marks Entry tab to view rankings and class statistics.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4 w-12 text-center">Roll</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Div</th>
                  {(exam.subjects || []).map((sub: any) => {
                    const subId = (sub.subjectId?._id || sub.subjectId)?.toString();
                    return (
                      <th key={subId} className="py-3 px-4 text-center">
                        <div>{sub.subjectId?.subjectName || 'Sub'}</div>
                        <div className="text-[10px] text-slate-400 font-normal">/{sub.maxMarks}</div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-4 text-center font-black">Total Marks</th>
                  <th className="py-3 px-4 text-center font-black">Percentage</th>
                  <th className="py-3 px-4 text-center font-black">Grade</th>
                  <th className="py-3 px-4 text-center font-black">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentScorecards.map(card => (
                  <tr key={card.studentId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      {card.rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black inline-flex items-center justify-center text-[11px] shadow-xs">
                          1
                        </span>
                      ) : card.rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-black inline-flex items-center justify-center text-[11px]">
                          2
                        </span>
                      ) : card.rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 font-black inline-flex items-center justify-center text-[11px]">
                          3
                        </span>
                      ) : (
                        <span className="font-bold text-slate-400">{card.rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {card.rollNo ?? '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {card.studentName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                      {card.division}
                    </td>

                    {/* Subject Marks */}
                    {(exam.subjects || []).map((sub: any) => {
                      const subId = (sub.subjectId?._id || sub.subjectId)?.toString();
                      const markInfo = card.subjectMarks[subId];
                      const isAbsent = markInfo?.attendance === 'ABSENT';
                      const markVal = markInfo?.marks;

                      return (
                        <td key={subId} className="py-3.5 px-4 text-center font-semibold">
                          {isAbsent ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600">
                              ABS
                            </span>
                          ) : markVal != null ? (
                            <span className={markInfo.passingMarks && markVal < markInfo.passingMarks ? 'text-rose-600 font-bold' : 'text-slate-700 font-bold'}>
                              {markVal}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-center font-black text-slate-800">
                      {card.totalObtained} <span className="text-[10px] text-slate-400 font-normal">/ {card.maxTotal}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-slate-900">
                      {card.percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-indigo-700">
                      {card.grade}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        card.result === 'PASS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : card.result === 'FAIL'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {card.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
