import React, { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../../store';
import type { Student } from '../../mockData';
import { isPeriodOverdue, isLedgerPending } from '../../utils';

export interface StudentDueBadge {
  text: string;
  color: string;
  type: 'ACADEMIC' | 'TRANSPORT' | 'BALANCE';
}

interface StudentSidebarProps {
  filteredStudents: Student[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  activeYearName: string;
  renderMobilePaymentDetails?: () => React.ReactNode;
}

export const StudentSidebar: React.FC<StudentSidebarProps> = ({
  filteredStudents,
  searchQuery,
  setSearchQuery,
  selectedStudent,
  onSelectStudent,
  activeYearName,
  renderMobilePaymentDetails,
}) => {
  const { unpaidData } = useApp();
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, currentPage]);

  const getStudentDueBadges = (student: Student): StudentDueBadge[] => {
    const sId = student._id || student.id;
    const reportItem = unpaidData.find((item: any) => item._id === sId);

    const balanceBadge: StudentDueBadge = { text: 'BALANCE', color: 'text-emerald-600 bg-emerald-50', type: 'BALANCE' };

    if (!reportItem || !reportItem.pendingLedgers) return [balanceBadge];

    const overdueLedgers = reportItem.pendingLedgers.filter((l: any) => 
      isLedgerPending(l) && isPeriodOverdue(l.feePeriod, l.academicYear, activeYearName)
    );
    
    if (overdueLedgers.length === 0) return [balanceBadge];

    const academicLedgers = overdueLedgers.filter((l: any) => l.feeType !== 'TRANSPORT');
    const transportLedgers = overdueLedgers.filter((l: any) => l.feeType === 'TRANSPORT');

    const formatBadge = (ledgers: any[], isTransport: boolean): StudentDueBadge | null => {
      if (ledgers.length === 0) return null;
      const uniquePeriods = new Set(
        ledgers
          .filter((l: any) => l.feePeriod !== 'One-time')
          .map((l: any) => `${l.academicYear || activeYearName}_${l.feePeriod}`)
      );
      const dueCount = uniquePeriods.size;
      const amount = ledgers.reduce((sum: number, l: any) => sum + (l.remainingAmount ?? ((l.totalAmount || 0) - (l.paidAmount || 0) - (l.concessionAmount || 0))), 0);

      if (amount <= 0) return null;

      let suffix = '';
      if (dueCount === 2) suffix = ' (2 MONTHS)';
      else if (dueCount >= 3) suffix = ' (3+ MONTHS)';

      const prefix = isTransport ? '🚌 ' : '';
      const text = `${prefix}₹${amount.toLocaleString('en-IN')} DUE${suffix}`;
      
      let color = 'text-blue-600 bg-blue-50 font-bold';
      if (isTransport) {
        color = 'text-purple-600 bg-purple-50 font-bold';
      } else {
        if (dueCount === 2) color = 'text-amber-600 bg-amber-50';
        else if (dueCount >= 3) color = 'text-red-600 bg-red-50';
      }

      return { text, color, type: isTransport ? 'TRANSPORT' : 'ACADEMIC' };
    };

    const badges: StudentDueBadge[] = [];
    const academicBadge = formatBadge(academicLedgers, false);
    if (academicBadge) badges.push(academicBadge);
    
    const transportBadge = formatBadge(transportLedgers, true);
    if (transportBadge) badges.push(transportBadge);

    return badges.length > 0 ? badges : [balanceBadge];
  };

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);

  return (
    <section className="w-full md:w-96 p-6 flex flex-col bg-[#FAFBFD] shrink md:shrink-0 flex-1 md:flex-none min-h-0">
      <h3 className="text-base font-bold text-slate-800 mb-4">1. Find Student</h3>

      <div className="relative mb-5 group">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          type="text"
          placeholder="Type student name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-10 text-sm focus:outline-none focus:border-blue-500 shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-2 py-1 rounded border border-red-100 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95"
            title="Clear search"
          >
            Clear <X className="h-3 w-3" strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto space-y-3 pr-1">
        {filteredStudents.length === 0 ? (
          <div className="text-center text-xs text-slate-400 py-10">No students found</div>
        ) : (
          paginatedStudents.map((student) => {
            const isSelected = selectedStudent?._id === student._id;
            const dueBadges = getStudentDueBadges(student);
            return (
              <div
                key={student._id}
                onClick={() => onSelectStudent(student)}
                className={`p-4 border rounded-2xl cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 min-w-[120px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-sm">{student.studentName}</h4>
                      {student.isRTE && (
                        <span className="bg-blue-50 text-blue-600 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wider scale-95 origin-left shrink-0">
                          RTE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Std {student.standard} · {student.division} · {student.medium}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      {student.studentCode}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end shrink-0">
                    {dueBadges.map((badge, idx) => (
                      <span key={idx} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${badge.color}`}>
                        {badge.text}
                      </span>
                    ))}
                  </div>
                </div>
                {isSelected && renderMobilePaymentDetails && (
                  <div className="mt-4 pt-4 border-t border-slate-100 md:hidden cursor-default" onClick={(e) => e.stopPropagation()}>
                    {renderMobilePaymentDetails()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors font-medium"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors font-medium"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
};
