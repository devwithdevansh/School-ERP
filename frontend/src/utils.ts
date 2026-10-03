import type { LedgerEntry } from './mockData';

/**
 * Maps an academic-year fee period to the calendar date when it becomes due.
 *
 * Rules:
 *  - Term 1  → June 1  of the academic year's first year  (same as June education)
 *  - June–Nov (education) → 1st of that month in the first year
 *  - Term 2  → December 1 of the first year  (same as December education)
 *  - Dec     → December 1 of the first year
 *  - Jan–May → 1st of that month in the second year
 *  - One-time (Admission / Bag & Kit) → June 1 of the first year
 *
 * @param feePeriod     e.g. "June", "Term 1", "Term 2", "January", "One-time"
 * @param academicYear  e.g. "2025-26"
 * @returns             The Date when this fee period becomes due (midnight)
 */
export function getPeriodDueDate(feePeriod: string, academicYear: string): Date {
  // Parse academic year: "2025-26" → firstYear = 2025
  const firstYear = parseInt(academicYear?.split('-')[0] ?? String(new Date().getFullYear()), 10);
  const secondYear = firstYear + 1;

  const monthMap: Record<string, [number, number]> = { // [month 0-indexed, year]
    'Term 1':   [5,  firstYear],   // June 1 — same trigger as June education
    'June':     [5,  firstYear],
    'July':     [6,  firstYear],
    'August':   [7,  firstYear],
    'September':[8,  firstYear],
    'October':  [9,  firstYear],
    'November': [10, firstYear],
    'Term 2':   [11, firstYear],   // December 1 — same trigger as December education
    'December': [11, firstYear],
    'January':  [0,  secondYear],
    'February': [1,  secondYear],
    'March':    [2,  secondYear],
    'April':    [3,  secondYear],
    'May':      [4,  secondYear],
    'One-time': [5,  firstYear],   // Admission / Bag & Kit → due from start of year
  };

  const entry = monthMap[feePeriod];
  if (!entry) {
    // Unknown period → treat as always due (safe fallback)
    return new Date(0);
  }
  const [month, year] = entry;
  return new Date(year, month, 1); // midnight of the 1st
}

/**
 * Returns true if the given fee period is genuinely overdue right now.
 *
 * @param feePeriod     e.g. "June", "Term 1"
 * @param academicYear  e.g. "2025-26"
 * @param activeAcademicYear  the currently active year name
 */
export function isPeriodOverdue(
  feePeriod: string,
  academicYear: string | undefined,
  activeAcademicYear: string
): boolean {
  if (academicYear) {
    const startYear = parseInt(academicYear.split('-')[0], 10);
    const activeStartYear = parseInt(activeAcademicYear.split('-')[0], 10);
    // Only trust the year comparison if BOTH values are sensible 4-digit calendar years.
    // If academicYear is a MongoDB ObjectId (e.g. "6a55d050..."), parseInt gives a tiny
    // number like 6, which would incorrectly mark every ledger as "past year → always overdue".
    const isValidYear = (y: number) => !isNaN(y) && y >= 2000 && y <= 2100;
    if (isValidYear(startYear) && isValidYear(activeStartYear)) {
      if (startYear < activeStartYear) {
        // Past academic year → always overdue
        return true;
      }
      if (startYear > activeStartYear) {
        // Future academic year → not overdue yet
        return false;
      }
    }
  }

  const yearToUse = academicYear || activeAcademicYear;
  const dueDate = getPeriodDueDate(feePeriod, yearToUse);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate <= today;
}

/**
 * Returns true if the ledger entry has an outstanding balance
 * (i.e. it is not yet fully paid or cancelled).
 */
export function isLedgerPending(entry: LedgerEntry): boolean {
  return entry.status === 'PENDING' || entry.status === 'PARTIAL';
}
