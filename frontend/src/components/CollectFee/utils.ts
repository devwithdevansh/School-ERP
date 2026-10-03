export const buildEduTermConfig = (academicYearName: string) => {
  const parts = academicYearName?.split('-') || [];
  const firstYr = parts[0]?.slice(-2) || '25';
  const secondYr = parts[1]?.slice(-2) || String(Number(firstYr) + 1).padStart(2, '0');
  return [
    { type: 'TERM',      label: 'Term 1', sublabel: 'Due before June',     year: '',        value: 'Term 1' },
    { type: 'EDUCATION', label: 'Jun',    sublabel: '',                     year: firstYr,   value: 'June' },
    { type: 'EDUCATION', label: 'Jul',    sublabel: '',                     year: firstYr,   value: 'July' },
    { type: 'EDUCATION', label: 'Aug',    sublabel: '',                     year: firstYr,   value: 'August' },
    { type: 'EDUCATION', label: 'Sep',    sublabel: '',                     year: firstYr,   value: 'September' },
    { type: 'EDUCATION', label: 'Oct',    sublabel: '',                     year: firstYr,   value: 'October' },
    { type: 'EDUCATION', label: 'Nov',    sublabel: '',                     year: firstYr,   value: 'November' },
    { type: 'TERM',      label: 'Term 2', sublabel: 'Due before December',  year: '',        value: 'Term 2' },
    { type: 'EDUCATION', label: 'Dec',    sublabel: '',                     year: firstYr,   value: 'December' },
    { type: 'EDUCATION', label: 'Jan',    sublabel: '',                     year: secondYr,  value: 'January' },
    { type: 'EDUCATION', label: 'Feb',    sublabel: '',                     year: secondYr,  value: 'February' },
    { type: 'EDUCATION', label: 'Mar',    sublabel: '',                     year: secondYr,  value: 'March' },
    { type: 'EDUCATION', label: 'Apr',    sublabel: '',                     year: secondYr,  value: 'April' },
    { type: 'EDUCATION', label: 'May',    sublabel: '',                     year: secondYr,  value: 'May' },
  ];
};

export const ALL_MONTH_VALUES = ['June','July','August','September','October','November','December','January','February','March','April','May'];
export const STANDARD_MONTH_PERIODS = new Set(ALL_MONTH_VALUES);
export const STANDARD_TERM_PERIODS = new Set(['Term 1', 'Term 2']);
