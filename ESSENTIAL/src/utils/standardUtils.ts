import type { FeeStructureData } from '../store';

export const canonicalStandard = (val: string): string => {
  if (!val) return '';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'nursery') return 'Nursery';
  if (lower === 'playhouse' || lower === 'play house') return 'Playhouse';
  if (lower === 'lkg') return 'LKG';
  if (lower === 'ukg') return 'UKG';
  if (lower === 'jr. kg' || lower === 'jr kg') return 'Jr. KG';
  if (lower === 'sr. kg' || lower === 'sr kg') return 'Sr. KG';
  return trimmed;
};

export const canonicalMedium = (val: string): string => {
  if (!val) return 'English';
  const lower = val.trim().toLowerCase();
  if (lower === 'gujarati') return 'Gujarati';
  if (lower === 'hindi') return 'Hindi';
  return 'English';
};

const STANDARD_ORDER = [
  'Playhouse', 'Nursery', 'LKG', 'UKG', 'Jr. KG', 'Sr. KG',
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
    const mediumMatch = !medium || medium === 'All' || canonicalMedium(fs.medium) === canonicalMedium(medium);
    return yearMatch && mediumMatch;
  });

  const uniqueStds = Array.from(new Set(filtered.map(fs => canonicalStandard(fs.standard)).filter(Boolean)));
  
  return uniqueStds.sort((a, b) => {
    const idxA = STANDARD_ORDER.findIndex(s => s.toLowerCase() === a.toLowerCase());
    const idxB = STANDARD_ORDER.findIndex(s => s.toLowerCase() === b.toLowerCase());
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
};
