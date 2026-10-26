import CalendarEvent from '../models/CalendarEvent.js';
import AcademicYear from '../models/AcademicYear.js';
import CalendarService from '../services/CalendarService.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { generateRoadmapSeedData } from '../scripts/seed-dummy-calendar-roadmap.js';

/**
 * Get all calendar events with flexible filtering.
 */
export const getEvents = catchAsync(async (req, res, next) => {
  const { academicYearId, academicYear, month, year, type, isSchoolClosed } = req.query;

  const filter = {};

  if (academicYearId) filter.academicYearId = academicYearId;
  if (academicYear) filter.academicYear = academicYear;
  if (type) filter.type = type;
  if (isSchoolClosed !== undefined) filter.isSchoolClosed = isSchoolClosed === 'true';

  // If specific month & year requested (month is 1-indexed: 1 = Jan, 12 = Dec)
  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    // Overlapping condition: event starts before month ends AND ends after month starts
    filter.startDate = { $lte: endOfMonth };
    filter.endDate = { $gte: startOfMonth };
  }

  const events = await CalendarEvent.find(filter).sort({ startDate: 1 });

  res.status(200).json({
    status: 'success',
    results: events.length,
    data: events,
  });
});

/**
 * Get dynamic festival, holiday & milestone suggestions for ANY year.
 */
export const getSuggestions = catchAsync(async (req, res, next) => {
  const { academicYearId, academicYear, stateCode = 'ALL' } = req.query;

  let sessionName = academicYear;
  let startDate;
  let endDate;

  if (academicYearId) {
    const ay = await AcademicYear.findById(academicYearId);
    if (ay) {
      sessionName = ay.name;
      startDate = ay.startDate;
      endDate = ay.endDate;
    }
  }

  // Fallback if no specific ID or dates found
  if (!startDate || !endDate) {
    const parts = (sessionName || '').split('-');
    const startYr = parseInt(parts[0], 10) || new Date().getFullYear();
    const endYr = parseInt(parts[1], 10) || startYr + 1;
    startDate = new Date(Date.UTC(startYr, 3, 1)); // April 1
    endDate = new Date(Date.UTC(endYr, 2, 31, 23, 59, 59)); // March 31
    sessionName = `${startYr}-${endYr}`;
  }

  const suggestions = await CalendarService.getUniversalSuggestions(
    sessionName,
    startDate,
    endDate,
    stateCode
  );

  res.status(200).json({
    status: 'success',
    academicYear: sessionName,
    startDate,
    endDate,
    results: suggestions.length,
    data: suggestions,
  });
});

/**
 * Create a single custom calendar event or holiday.
 */
export const createEvent = catchAsync(async (req, res, next) => {
  const { academicYearId, academicYear, title, startDate, endDate } = req.body;

  if (!title || !startDate || !endDate) {
    return next(new AppError('Title, start date, and end date are required', 400));
  }

  // If academicYear string is missing, resolve from ID
  if (!academicYear && academicYearId) {
    const ay = await AcademicYear.findById(academicYearId);
    if (ay) req.body.academicYear = ay.name;
  }

  req.body.createdBy = req.user?._id || null;

  const event = await CalendarEvent.create(req.body);

  res.status(201).json({
    status: 'success',
    data: event,
  });
});

/**
 * Bulk apply suggestions or preset events to an academic year.
 */
export const bulkApplyEvents = catchAsync(async (req, res, next) => {
  const { academicYearId, academicYear, events, clearExistingPresets = false } = req.body;

  if (!academicYearId || !events || !Array.isArray(events) || events.length === 0) {
    return next(new AppError('Academic year ID and a non-empty events array are required', 400));
  }

  const ay = await AcademicYear.findById(academicYearId);
  if (!ay) {
    return next(new AppError('No academic year found with that ID', 404));
  }

  const yearName = academicYear || ay.name;

  // Optional: clear previously saved preset events to avoid duplicates when re-running wizard
  if (clearExistingPresets) {
    await CalendarEvent.deleteMany({
      academicYearId,
      source: { $in: ['GOOGLE_CALENDAR', 'ASTRONOMICAL_ENGINE', 'ACADEMIC_PRESET'] },
    });
  }

  const payload = events.map((ev) => ({
    ...ev,
    academicYearId,
    academicYear: yearName,
    createdBy: req.user?._id || null,
  }));

  const inserted = await CalendarEvent.insertMany(payload);

  res.status(201).json({
    status: 'success',
    results: inserted.length,
    data: inserted,
  });
});

/**
 * Update an existing calendar event.
 */
export const updateEvent = catchAsync(async (req, res, next) => {
  const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!event) {
    return next(new AppError('No calendar event found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: event,
  });
});

/**
 * Delete a calendar event.
 */
export const deleteEvent = catchAsync(async (req, res, next) => {
  const event = await CalendarEvent.findByIdAndDelete(req.params.id);

  if (!event) {
    return next(new AppError('No calendar event found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * Get structured academic roadmap milestones for a given academic year.
 */
export const getRoadmap = catchAsync(async (req, res, next) => {
  const { academicYearId, academicYear } = req.query;

  const filter = {};
  if (academicYearId) filter.academicYearId = academicYearId;
  if (academicYear) filter.academicYear = academicYear;

  // Fetch all calendar events for the academic session (exams, vacations, milestones, events, holidays)
  let events = await CalendarEvent.find(filter).sort({ startDate: 1 });

  const now = new Date();

  // If no saved events exist yet, automatically generate dynamic multi-year suggestions
  if (events.length === 0) {
    let yearStr = academicYear;
    if (!yearStr) {
      const curYear = now.getFullYear();
      const nextYear = curYear + 1;
      yearStr = `${curYear}-${nextYear.toString().slice(2)}`;
    }
    const suggestions = await CalendarService.generateUniversalSuggestions(yearStr);
    events = suggestions.map((s, idx) => ({
      _id: `auto_${idx}`,
      ...s,
    }));
  }

  // Group events by quarter
  const quarters = {
    Q1: { name: 'Q1 (Apr - Jun)', items: [] },
    Q2: { name: 'Q2 (Jul - Sep)', items: [] },
    Q3: { name: 'Q3 (Oct - Dec)', items: [] },
    Q4: { name: 'Q4 (Jan - Mar)', items: [] },
  };

  const allItems = [];

  events.forEach((ev) => {
    let q = ev.roadmap?.quarter;
    if (!q || q === 'NONE') {
      const m = new Date(ev.startDate).getMonth(); // 0 = Jan, 11 = Dec
      if (m >= 3 && m <= 5) q = 'Q1';
      else if (m >= 6 && m <= 8) q = 'Q2';
      else if (m >= 9 && m <= 11) q = 'Q3';
      else q = 'Q4';
    }

    const evEnd = new Date(ev.endDate);
    const evStart = new Date(ev.startDate);
    let calculatedStatus = ev.roadmap?.progressStatus || 'PLANNED';

    if (now > evEnd) {
      calculatedStatus = 'COMPLETED';
    } else if (now >= evStart && now <= evEnd) {
      calculatedStatus = 'IN_PROGRESS';
    }

    const item = {
      _id: ev._id,
      title: ev.title,
      description: ev.description || '',
      type: ev.type || 'EVENT',
      category: ev.category || 'OTHER',
      startDate: ev.startDate,
      endDate: ev.endDate,
      color: ev.color,
      status: calculatedStatus,
      isSchoolClosed: !!ev.isSchoolClosed,
      quarter: q,
      term: ev.roadmap?.term || 'TERM_1',
    };

    if (quarters[q]) {
      quarters[q].items.push(item);
    }
    allItems.push(item);
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalMilestones: allItems.length,
      quarters,
      items: allItems,
    },
  });
});

/**
 * Seed comprehensive dummy academic roadmap data (exams, vacations, events, holidays, PTMs).
 */
export const seedDummyRoadmap = catchAsync(async (req, res, next) => {
  let { academicYearId, academicYear } = req.body || {};

  let ay;
  if (academicYearId) {
    ay = await AcademicYear.findById(academicYearId);
  } else {
    ay = (await AcademicYear.findOne({ isActive: true })) || (await AcademicYear.findOne());
  }

  if (!ay) {
    return next(new AppError('No academic year found to seed roadmap for', 404));
  }

  const yearName = academicYear || ay.name;

  // Clear existing preset/seed events
  await CalendarEvent.deleteMany({
    academicYearId: ay._id,
    source: { $in: ['ACADEMIC_PRESET', 'ASTRONOMICAL_ENGINE', 'GOOGLE_CALENDAR'] },
  });

  const seedItems = await generateRoadmapSeedData(ay._id, yearName);

  const payload = seedItems.map((item) => ({
    ...item,
    academicYearId: ay._id,
    academicYear: yearName,
    createdBy: req.user?._id || null,
  }));

  const inserted = await CalendarEvent.insertMany(payload);

  res.status(201).json({
    status: 'success',
    results: inserted.length,
    message: `Successfully seeded ${inserted.length} roadmap items (exams, vacations, events, holidays, PTMs) for ${yearName}`,
    data: inserted,
  });
});
