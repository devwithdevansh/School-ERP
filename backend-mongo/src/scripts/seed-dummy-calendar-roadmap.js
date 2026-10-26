// backend-mongo/src/scripts/seed-dummy-calendar-roadmap.js
// Standalone utility to seed realistic dummy data for Academic Roadmap:
// - Exams & Assessments (Unit Tests, Mid-Terms, Pre-Boards, Annual Finals)
// - Vacations & Breaks (Summer Break, Diwali Vacation, Winter Break, Spring Break)
// - School Celebrations & Events (Sports Day, Annual Day, Science Exhibition, National Days)
// - PTMs & Checkpoints (Orientations, Report Card distributions)
// - Holidays & Festivals
//
// Usage:
//   node src/scripts/seed-dummy-calendar-roadmap.js
//   or: npm run seed:roadmap

import '../config/tenancy.js';
import 'dotenv/config';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import AcademicYear from '../models/AcademicYear.js';
import CalendarEvent from '../models/CalendarEvent.js';
import Exam from '../models/Exam.js';
import Subject from '../models/Subject.js';
import { MODULE_IDS } from '../constants/modules.js';
import { runWithTenant } from '../utils/tenantContext.js';

export async function generateRoadmapSeedData(academicYearId, academicYearName) {
  // Extract start and end year (e.g. 2026 and 2027 from "2026-2027")
  const match = (academicYearName || '2026-2027').match(/(\d{4})/g);
  const startYr = match && match[0] ? parseInt(match[0], 10) : 2026;
  const endYr = match && match[1] ? parseInt(match[1], 10) : startYr + 1;

  return [
    // ══════════════════════════════════════════════════════════════
    // 1. EXAMS & ASSESSMENTS
    // ══════════════════════════════════════════════════════════════
    {
      title: 'Periodic Assessment 1 (Unit Test)',
      description: 'First evaluation covering 25% of syllabus across English, Hindi, Mathematics, Science, and Social Studies.',
      type: 'EXAM',
      category: 'ACADEMIC_EXAM',
      startDate: `${startYr}-07-20`,
      endDate: `${startYr}-07-25`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#EA580C', // Orange
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q2',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Mid-Term / Half-Yearly Examinations',
      description: 'Comprehensive mid-year theoretical and practical exams covering 50% cumulative curriculum.',
      type: 'EXAM',
      category: 'ACADEMIC_EXAM',
      startDate: `${startYr}-09-15`,
      endDate: `${startYr}-09-28`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#DC2626', // Red
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q2',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Periodic Assessment 2 (Unit Test 2)',
      description: 'Evaluation of post-midterm units and foundational revision for senior and junior standards.',
      type: 'EXAM',
      category: 'ACADEMIC_EXAM',
      startDate: `${startYr}-11-23`,
      endDate: `${startYr}-11-28`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#EA580C',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q3',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Pre-Board / Model Examinations',
      description: 'Board exam simulation for graduating batches and comprehensive revision test for classes 1-9.',
      type: 'EXAM',
      category: 'ACADEMIC_EXAM',
      startDate: `${endYr}-01-18`,
      endDate: `${endYr}-01-28`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#B91C1C',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q4',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Practical Examinations & Project Vivas',
      description: 'Internal lab practicals, computer science viva, and annual arts submission assessments.',
      type: 'EXAM',
      category: 'ACADEMIC_EXAM',
      startDate: `${endYr}-02-15`,
      endDate: `${endYr}-02-22`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#C2410C',
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
      description: 'Comprehensive end-of-year academic evaluation determining standard promotions and graduation.',
      type: 'EXAM',
      category: 'ACADEMIC_EXAM',
      startDate: `${endYr}-03-01`,
      endDate: `${endYr}-03-16`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#991B1B',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q4',
        term: 'ANNUAL',
        progressStatus: 'PLANNED',
      },
    },

    // ══════════════════════════════════════════════════════════════
    // 2. VACATIONS & BREAKS
    // ══════════════════════════════════════════════════════════════
    {
      title: 'Summer Vacation',
      description: 'Annual summer break for students and teaching faculty. School administrative office remains open on weekdays.',
      type: 'VACATION',
      category: 'VACATION',
      startDate: `${startYr}-05-15`,
      endDate: `${startYr}-06-30`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#F59E0B', // Amber
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q1',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Diwali & Autumn Vacation',
      description: 'Festival vacation covering Dhanteras, Diwali, Govardhan Puja, and Bhai Dooj holidays.',
      type: 'VACATION',
      category: 'VACATION',
      startDate: `${startYr}-10-28`,
      endDate: `${startYr}-11-06`,
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
      title: 'Winter Vacation & Christmas Break',
      description: 'End-of-year winter break and Christmas holidays for student rejuvenation and family time.',
      type: 'VACATION',
      category: 'VACATION',
      startDate: `${startYr}-12-24`,
      endDate: `${endYr}-01-02`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#0284C7', // Sky Blue
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q3',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Post-Exam Session Break',
      description: 'Annual transition break before reopening of the next academic year.',
      type: 'VACATION',
      category: 'VACATION',
      startDate: `${endYr}-03-20`,
      endDate: `${endYr}-03-31`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#0D9488',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q4',
        term: 'ANNUAL',
        progressStatus: 'PLANNED',
      },
    },

    // ══════════════════════════════════════════════════════════════
    // 3. SCHOOL CELEBRATIONS & EVENTS
    // ══════════════════════════════════════════════════════════════
    {
      title: 'Independence Day & Investiture Ceremony',
      description: 'Flag hoisting ceremony, patriotic cultural presentations, and formal badge investiture of student council.',
      type: 'EVENT',
      category: 'NATIONAL_HOLIDAY',
      startDate: `${startYr}-08-15`,
      endDate: `${startYr}-08-15`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#059669', // Emerald
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q2',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Teacher\'s Day Celebration',
      description: 'Student-led celebration honoring faculty with special tributes and teacher appreciation awards.',
      type: 'EVENT',
      category: 'CULTURAL',
      startDate: `${startYr}-09-05`,
      endDate: `${startYr}-09-05`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#9333EA', // Purple
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q2',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Children\'s Day Carnival & Fair',
      description: 'Fun day filled with carnival games, talent stages, and student-curated food stalls.',
      type: 'EVENT',
      category: 'CULTURAL',
      startDate: `${startYr}-11-14`,
      endDate: `${startYr}-11-14`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#DB2777', // Pink
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q3',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Annual Sports Day & Athletic Meet',
      description: 'Three-day inter-house sports competitions: track events, relays, football, basketball, and tug-of-war.',
      type: 'EVENT',
      category: 'SPORTS',
      startDate: `${startYr}-12-18`,
      endDate: `${startYr}-12-21`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#E11D48', // Rose
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q3',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Annual Cultural Day & Drama Fest',
      description: 'Grand annual showcase featuring classical dances, choir orchestra, and English & regional theatre.',
      type: 'EVENT',
      category: 'CULTURAL',
      startDate: `${endYr}-01-08`,
      endDate: `${endYr}-01-10`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#7C3AED', // Violet
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q4',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Republic Day Celebration',
      description: 'Tricolor flag unfurling, national anthem, march-past parade, and distribution of bravery awards.',
      type: 'EVENT',
      category: 'NATIONAL_HOLIDAY',
      startDate: `${endYr}-01-26`,
      endDate: `${endYr}-01-26`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#059669',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q4',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Science, Robotics & Art Expo',
      description: 'Interactive STEM models, robotics demonstrations, and fine arts exhibition open to parents and visitors.',
      type: 'EVENT',
      category: 'OTHER',
      startDate: `${endYr}-02-06`,
      endDate: `${endYr}-02-06`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#2563EB',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q4',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },
    {
      title: 'Annual Results & Graduation Day',
      description: 'Report card declaration, merit certificates, student promotions to next standard, and valedictory address.',
      type: 'EVENT',
      category: 'ACADEMIC_EXAM',
      startDate: `${endYr}-03-28`,
      endDate: `${endYr}-03-28`,
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

    // ══════════════════════════════════════════════════════════════
    // 4. PARENT-TEACHER MEETINGS (PTM) & CHECKPOINTS
    // ══════════════════════════════════════════════════════════════
    {
      title: 'Academic Session Kickoff & Orientation',
      description: 'Commencement of regular classroom schedules, textbook distribution, and orientation for new students.',
      type: 'ACADEMIC_MILESTONE',
      category: 'ACADEMIC_EXAM',
      startDate: `${startYr}-04-01`,
      endDate: `${startYr}-04-01`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#4F46E5', // Indigo
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q1',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Parent-Teacher Meeting (PTM 1)',
      description: 'Initial review of student adjustment, homework routines, and syllabus roadmap with parents.',
      type: 'PTM',
      category: 'PTM',
      startDate: `${startYr}-05-09`,
      endDate: `${startYr}-05-09`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#6366F1',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q1',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Term 1 Progress Report Distribution & PTM',
      description: 'One-on-one parent feedback sessions discussing mid-term exam performance and academic goals.',
      type: 'PTM',
      category: 'PTM',
      startDate: `${startYr}-10-10`,
      endDate: `${startYr}-10-10`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#6366F1',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q3',
        term: 'TERM_1',
        progressStatus: 'COMPLETED',
      },
    },
    {
      title: 'Pre-Board Result Review & Counselling PTM',
      description: 'Board examination strategy consultation, subject weakness analysis, and career guidance.',
      type: 'PTM',
      category: 'PTM',
      startDate: `${endYr}-02-02`,
      endDate: `${endYr}-02-02`,
      isSchoolClosed: false,
      isAllDay: true,
      color: '#6366F1',
      source: 'ACADEMIC_PRESET',
      roadmap: {
        isRoadmapMilestone: true,
        quarter: 'Q4',
        term: 'TERM_2',
        progressStatus: 'PLANNED',
      },
    },

    // ══════════════════════════════════════════════════════════════
    // 5. MAJOR NATIONAL & FESTIVAL HOLIDAYS
    // ══════════════════════════════════════════════════════════════
    {
      title: 'Mahavir Jayanti',
      description: 'Public holiday on the birth anniversary of Lord Mahavira.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-04-14`,
      endDate: `${startYr}-04-14`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q1', term: 'TERM_1', progressStatus: 'COMPLETED' },
    },
    {
      title: 'Good Friday',
      description: 'Christian observance commemorating the crucifixion of Jesus Christ.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-04-18`,
      endDate: `${startYr}-04-18`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q1', term: 'TERM_1', progressStatus: 'COMPLETED' },
    },
    {
      title: 'Eid-ul-Fitr',
      description: 'Celebration marking the conclusion of the holy month of Ramadan.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-05-02`,
      endDate: `${startYr}-05-02`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q1', term: 'TERM_1', progressStatus: 'COMPLETED' },
    },
    {
      title: 'Raksha Bandhan',
      description: 'Traditional festival celebrating sibling bond and family unity.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-08-28`,
      endDate: `${startYr}-08-28`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q2', term: 'TERM_1', progressStatus: 'COMPLETED' },
    },
    {
      title: 'Janmashtami',
      description: 'Celebration of the birth of Lord Krishna.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-09-04`,
      endDate: `${startYr}-09-04`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q2', term: 'TERM_1', progressStatus: 'COMPLETED' },
    },
    {
      title: 'Mahatma Gandhi Jayanti',
      description: 'National holiday honoring the Father of the Nation and champion of non-violence.',
      type: 'HOLIDAY',
      category: 'NATIONAL_HOLIDAY',
      startDate: `${startYr}-10-02`,
      endDate: `${startYr}-10-02`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#059669',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q3', term: 'TERM_1', progressStatus: 'COMPLETED' },
    },
    {
      title: 'Dussehra (Vijayadashami)',
      description: 'Festival commemorating the victory of good over evil.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-10-20`,
      endDate: `${startYr}-10-20`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q3', term: 'TERM_1', progressStatus: 'COMPLETED' },
    },
    {
      title: 'Diwali (Deepavali)',
      description: 'The festival of lights, joy, and prosperity.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-11-01`,
      endDate: `${startYr}-11-01`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q3', term: 'TERM_2', progressStatus: 'PLANNED' },
    },
    {
      title: 'Guru Nanak Jayanti',
      description: 'Birth anniversary of Guru Nanak Dev Ji, founder of Sikhism.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-11-24`,
      endDate: `${startYr}-11-24`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q3', term: 'TERM_2', progressStatus: 'PLANNED' },
    },
    {
      title: 'Christmas Day',
      description: 'Celebration of the nativity of Jesus Christ.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${startYr}-12-25`,
      endDate: `${startYr}-12-25`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q3', term: 'TERM_2', progressStatus: 'PLANNED' },
    },
    {
      title: 'Makar Sankranti / Pongal',
      description: 'Traditional harvest festival celebrating transition of the Sun into Capricorn.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${endYr}-01-14`,
      endDate: `${endYr}-01-14`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q4', term: 'TERM_2', progressStatus: 'PLANNED' },
    },
    {
      title: 'Maha Shivratri',
      description: 'Solemn festival dedicated to Lord Shiva.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${endYr}-03-06`,
      endDate: `${endYr}-03-06`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q4', term: 'ANNUAL', progressStatus: 'PLANNED' },
    },
    {
      title: 'Holi (Dhulandi)',
      description: 'Festival of vibrant colors, harmony, and joy.',
      type: 'HOLIDAY',
      category: 'FESTIVAL',
      startDate: `${endYr}-03-23`,
      endDate: `${endYr}-03-23`,
      isSchoolClosed: true,
      isAllDay: true,
      color: '#10B981',
      source: 'ASTRONOMICAL_ENGINE',
      roadmap: { isRoadmapMilestone: false, quarter: 'Q4', term: 'ANNUAL', progressStatus: 'PLANNED' },
    },
  ];
}

export async function seedCalendarRoadmapForTenant(clientId) {
  return runWithTenant(clientId, async () => {
    let ay = await AcademicYear.findOne({ isActive: true });
    if (!ay) {
      ay = await AcademicYear.findOne();
    }
    if (!ay) {
      console.log('No academic year found for tenant. Skipping roadmap seed.');
      return;
    }

    console.log(`Seeding Academic Roadmap for Academic Year: ${ay.name} (${ay._id})...`);

    // Remove older seed items to ensure fresh, clean data
    await CalendarEvent.deleteMany({
      academicYearId: ay._id,
      source: { $in: ['ACADEMIC_PRESET', 'ASTRONOMICAL_ENGINE', 'GOOGLE_CALENDAR'] },
    });

    const seedItems = await generateRoadmapSeedData(ay._id, ay.name);

    const payload = seedItems.map((item) => ({
      ...item,
      academicYearId: ay._id,
      academicYear: ay.name,
    }));

    const inserted = await CalendarEvent.insertMany(payload);
    console.log(`Successfully seeded ${inserted.length} combined roadmap items (Exams, Vacations, Events, Holidays, PTMs).`);

    return inserted;
  });
}

async function main() {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp';
  let memoryServer = null;

  try {
    console.log(`Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log('Connected to MongoDB.');
  } catch (connErr) {
    console.log('Local MongoDB not running. Starting in-memory MongoDB for verification...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = memoryServer.getUri();
    await mongoose.connect(uri);
    console.log(`Connected to in-memory MongoDB at ${uri}`);
  }

  let clients = await Client.find();
  if (clients.length === 0) {
    console.log('Creating demo school client and academic year...');
    const client = await Client.create({
      name: 'Demo School',
      code: 'demo-school',
      enabledModules: MODULE_IDS,
    });
    await AcademicYear.create({
      name: '2026-2027',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
      clientId: client._id,
    });
    clients = [client];
  }

  for (const client of clients) {
    console.log(`\n--- Seeding for Client: ${client.name} (${client.code}) ---`);
    await seedCalendarRoadmapForTenant(client._id);
  }

  console.log('\nAll clients successfully seeded with dummy Academic Roadmap data.');
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}

// Run directly if invoked from command line
if (process.argv[1]?.endsWith('seed-dummy-calendar-roadmap.js')) {
  main().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
