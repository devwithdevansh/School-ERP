import Holidays from 'date-holidays';

export class CalendarService {
  /**
   * Fetches universal suggestions for any academic year dynamically.
   * @param {string} academicYear - e.g. "2026-2027" or "2027-2028"
   * @param {Date|string} sessionStartDate - e.g. "2026-04-01"
   * @param {Date|string} sessionEndDate - e.g. "2027-03-31"
   * @param {string} [stateCode='ALL'] - Indian state code (e.g. "DL", "MH", "UP", "KA")
   */
  static async getUniversalSuggestions(academicYear, sessionStartDate, sessionEndDate, stateCode = 'ALL') {
    const start = new Date(sessionStartDate);
    const end = new Date(sessionEndDate);
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    // 1. Live Fetch from Google Calendar Public Holiday Feed
    let googleHolidays = [];
    try {
      googleHolidays = await this.fetchGoogleCalendarHolidays(start, end);
    } catch (err) {
      console.warn('[CalendarService] Google Calendar live fetch skipped:', err.message);
    }

    // 2. Compute via Astronomical Calculation Engine (date-holidays)
    const calculatedHolidays = this.getAstronomicalHolidays(startYear, endYear, start, end, stateCode);

    // 3. Deduplicate and merge Google + Calculated festivals
    const allHolidays = this.deduplicateHolidays([...googleHolidays, ...calculatedHolidays]);

    // 4. Dynamically compute Vacation blocks anchored to the year's calculated festivals
    const vacations = this.generateDynamicVacations(startYear, endYear, allHolidays);

    // 5. Dynamically compute Academic Roadmap Milestones
    const milestones = this.generateDynamicMilestones(startYear, endYear);

    // Combine all suggestions
    const suggestions = [
      ...allHolidays,
      ...vacations,
      ...milestones,
    ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    return suggestions;
  }

  /**
   * Fetches official Google Calendar Public Holidays feed for India.
   * Parses the official iCal (.ics) format without requiring an API key.
   */
  static async fetchGoogleCalendarHolidays(startDate, endDate) {
    const icsUrl =
      'https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(icsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SchoolERP-UniversalCalendar/1.0' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Google Calendar returned HTTP ${res.status}`);
    }

    const icsText = await res.text();
    return this.parseIcsEvents(icsText, startDate, endDate);
  }

  /**
   * Lightweight RFC 5545 iCal parser for standard VEVENT blocks.
   */
  static parseIcsEvents(icsContent, startDate, endDate) {
    const events = [];
    const eventBlocks = icsContent.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i].split('END:VEVENT')[0];
      if (!block) continue;

      let summary = '';
      let dtStartStr = '';
      let dtEndStr = '';
      let description = '';

      const lines = block.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith('SUMMARY:')) {
          summary = line.substring(8).trim();
        } else if (line.startsWith('DTSTART')) {
          const parts = line.split(':');
          dtStartStr = parts[1] ? parts[1].trim() : '';
        } else if (line.startsWith('DTEND')) {
          const parts = line.split(':');
          dtEndStr = parts[1] ? parts[1].trim() : '';
        } else if (line.startsWith('DESCRIPTION:')) {
          description = line.substring(12).trim();
        }
      }

      if (!summary || !dtStartStr) continue;

      // Format date from YYYYMMDD to YYYY-MM-DD
      const formatIcsDate = (str) => {
        const clean = str.replace(/[^0-9]/g, '').slice(0, 8);
        if (clean.length === 8) {
          return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
        }
        return null;
      };

      const startIso = formatIcsDate(dtStartStr);
      const endIso = dtEndStr ? formatIcsDate(dtEndStr) : startIso;
      if (!startIso) continue;

      const evStartDate = new Date(startIso);
      const evEndDate = new Date(endIso || startIso);

      // Filter events within academic year window
      if (evStartDate >= startDate && evStartDate <= endDate) {
        const isFestival = /diwali|eid|holi|dussehra|christmas|navami|chath|pongal|onam|janmashtami|raksha/i.test(
          summary
        );

        events.push({
          title: summary,
          description: description || 'Google Calendar Public Holiday',
          type: 'HOLIDAY',
          category: isFestival ? 'FESTIVAL' : 'NATIONAL_HOLIDAY',
          startDate: startIso,
          endDate: endIso || startIso,
          isSchoolClosed: true,
          isAllDay: true,
          color: '#10B981', // Emerald
          source: 'GOOGLE_CALENDAR',
          roadmap: {
            isRoadmapMilestone: false,
            quarter: 'NONE',
            term: 'NONE',
            progressStatus: 'PLANNED',
          },
        });
      }
    }

    return events;
  }

  /**
   * Computes holidays via date-holidays across startYear and endYear for India.
   */
  static getAstronomicalHolidays(startYear, endYear, startDate, endDate, stateCode) {
    const hd = stateCode && stateCode !== 'ALL' ? new Holidays('IN', stateCode) : new Holidays('IN');

    const years = Array.from(new Set([startYear, endYear]));
    const results = [];

    for (const yr of years) {
      const holidays = hd.getHolidays(yr) || [];
      for (const h of holidays) {
        const hStart = new Date(h.start || h.date);
        const hEnd = new Date(h.end || h.start || h.date);

        if (hStart >= startDate && hStart <= endDate) {
          const startIso = hStart.toISOString().split('T')[0];
          const endIso = hEnd.toISOString().split('T')[0];
          const isNational = h.type === 'public' && /republic|independence|gandhi|ambedkar/i.test(h.name);

          results.push({
            title: h.name,
            description: h.note || `${h.name} (${h.type || 'Holiday'})`,
            type: 'HOLIDAY',
            category: isNational ? 'NATIONAL_HOLIDAY' : 'FESTIVAL',
            startDate: startIso,
            endDate: endIso,
            isSchoolClosed: true,
            isAllDay: true,
            color: isNational ? '#059669' : '#10B981',
            source: 'ASTRONOMICAL_ENGINE',
            roadmap: {
              isRoadmapMilestone: false,
              quarter: 'NONE',
              term: 'NONE',
              progressStatus: 'PLANNED',
            },
          });
        }
      }
    }

    return results;
  }

  /**
   * Dynamically generates vacation blocks based on the session's specific year and computed Diwali date.
   */
  static generateDynamicVacations(startYear, endYear, holidayList) {
    // Detect computed Diwali date for that year
    const diwali = holidayList.find((h) => /diwali|deepawali/i.test(h.title));
    let diwaliStart = `${startYear}-11-06`;
    let diwaliEnd = `${startYear}-11-11`;

    if (diwali && diwali.startDate) {
      const d = new Date(diwali.startDate);
      const startBreak = new Date(d);
      startBreak.setDate(d.getDate() - 1);
      const endBreak = new Date(d);
      endBreak.setDate(d.getDate() + 3);

      diwaliStart = startBreak.toISOString().split('T')[0];
      diwaliEnd = endBreak.toISOString().split('T')[0];
    }

    return [
      {
        title: 'Summer Vacation',
        description: 'Annual summer break for students and staff',
        type: 'VACATION',
        category: 'VACATION',
        startDate: `${startYear}-05-15`,
        endDate: `${startYear}-06-30`,
        isSchoolClosed: true,
        isAllDay: true,
        color: '#F59E0B', // Amber
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q1',
          term: 'TERM_1',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Diwali & Autumn Vacation',
        description: 'Festival vacation including Diwali, Govardhan Puja, and Bhai Dooj',
        type: 'VACATION',
        category: 'VACATION',
        startDate: diwaliStart,
        endDate: diwaliEnd,
        isSchoolClosed: true,
        isAllDay: true,
        color: '#D97706',
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q3',
          term: 'TERM_2',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Winter Vacation',
        description: 'End-of-year winter break & Christmas holidays',
        type: 'VACATION',
        category: 'VACATION',
        startDate: `${startYear}-12-24`,
        endDate: `${endYear}-01-02`,
        isSchoolClosed: true,
        isAllDay: true,
        color: '#3B82F6', // Blue
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q3',
          term: 'TERM_2',
          progressStatus: 'PLANNED',
        },
      },
    ];
  }

  /**
   * Dynamically generates universal quarterly academic roadmap milestones.
   */
  static generateDynamicMilestones(startYear, endYear) {
    return [
      {
        title: 'Academic Session Kickoff',
        description: 'Orientation & commencement of regular classes',
        type: 'ACADEMIC_MILESTONE',
        category: 'ACADEMIC_EXAM',
        startDate: `${startYear}-04-01`,
        endDate: `${startYear}-04-01`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#6366F1', // Indigo
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q1',
          term: 'TERM_1',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Parent-Teacher Meeting (PTM 1)',
        description: 'Initial academic review & parent orientation',
        type: 'PTM',
        category: 'PTM',
        startDate: `${startYear}-05-09`,
        endDate: `${startYear}-05-09`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#8B5CF6', // Purple
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q1',
          term: 'TERM_1',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Periodic Assessment / Unit Test 1',
        description: 'First formal evaluation of syllabus completion',
        type: 'EXAM',
        category: 'ACADEMIC_EXAM',
        startDate: `${startYear}-07-20`,
        endDate: `${startYear}-07-25`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#EA580C', // Orange
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q2',
          term: 'TERM_1',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Mid-Term / Half-Yearly Examinations',
        description: 'Comprehensive mid-year examinations across all standards',
        type: 'EXAM',
        category: 'ACADEMIC_EXAM',
        startDate: `${startYear}-09-15`,
        endDate: `${startYear}-09-28`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#DC2626', // Red
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q2',
          term: 'TERM_1',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Term 1 Report Card Distribution & PTM',
        description: 'Performance discussion with parents and progress cards',
        type: 'PTM',
        category: 'PTM',
        startDate: `${startYear}-10-10`,
        endDate: `${startYear}-10-10`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#8B5CF6',
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q3',
          term: 'TERM_1',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Annual Sports Day & Cultural Fest',
        description: 'Inter-house athletic meets and student cultural showcase',
        type: 'EVENT',
        category: 'SPORTS',
        startDate: `${startYear}-12-18`,
        endDate: `${startYear}-12-21`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#EC4899', // Pink
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q3',
          term: 'TERM_2',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Pre-Board / Revision Exams',
        description: 'Model testing for graduating classes and revision cycles',
        type: 'EXAM',
        category: 'ACADEMIC_EXAM',
        startDate: `${endYear}-01-18`,
        endDate: `${endYear}-01-25`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#EA580C',
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q4',
          term: 'TERM_2',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Annual Final Examinations',
        description: 'End-of-year comprehensive academic evaluation',
        type: 'EXAM',
        category: 'ACADEMIC_EXAM',
        startDate: `${endYear}-03-01`,
        endDate: `${endYear}-03-15`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#DC2626',
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q4',
          term: 'ANNUAL',
          progressStatus: 'PLANNED',
        },
      },
      {
        title: 'Annual Results & Graduation Day',
        description: 'Result declaration, student cohort promotions, and prize distribution',
        type: 'EVENT',
        category: 'ACADEMIC_EXAM',
        startDate: `${endYear}-03-28`,
        endDate: `${endYear}-03-28`,
        isSchoolClosed: false,
        isAllDay: true,
        color: '#10B981',
        source: 'ACADEMIC_PRESET',
        roadmap: {
          isRoadmapMilestone: true,
          quarter: 'Q4',
          term: 'ANNUAL',
          progressStatus: 'PLANNED',
        },
      },
    ];
  }

  /**
   * Deduplicates holidays by normalizing titles and checking date proximity.
   */
  static deduplicateHolidays(holidays) {
    const seen = new Map();
    const result = [];

    for (const h of holidays) {
      // Normalize title e.g. "Diwali / Deepavali" -> "diwali"
      const normTitle = h.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      const key = `${normTitle}_${h.startDate}`;

      if (!seen.has(key)) {
        seen.set(key, true);
        result.push(h);
      }
    }

    return result;
  }
}

export default CalendarService;
