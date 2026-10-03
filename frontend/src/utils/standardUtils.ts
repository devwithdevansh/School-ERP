import type { FeeStructureData } from '../store';

const STANDARD_ORDER = [
  'Playhouse', 'Nursery', 'LKG', 'UKG', 
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
];

export const getActiveStandards = (
  feeStructures: FeeStructureData[],
  academicYear: string,
  medium?: string
): string[] => {
  if (!academicYear) return [];
  
  const filtered = feeStructures.filter(fs => {
    const yearMatch = fs.academicYear === academicYear || !fs.academicYear;
    const mediumMatch = !medium || medium === 'All' || fs.medium === medium;
    return yearMatch && mediumMatch;
  });

  const uniqueStds = Array.from(new Set(filtered.map(fs => fs.standard)));
  
  return uniqueStds.sort((a, b) => {
    const idxA = STANDARD_ORDER.indexOf(a);
    const idxB = STANDARD_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
};
