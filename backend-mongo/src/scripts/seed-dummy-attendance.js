// backend-mongo/src/scripts/seed-dummy-attendance.js
//
// Standalone utility to assign random attendance (present/absent/late) for all active
// students from last month up to today (excluding Sundays).
//
// Usage:
//   node src/scripts/seed-dummy-attendance.js
//   or: MONGODB_URI="mongodb+srv://..." node src/scripts/seed-dummy-attendance.js

import '../config/tenancy.js';
import 'dotenv/config';
import mongoose from 'mongoose';
import AcademicYear from '../models/AcademicYear.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import ClassTeacherAllocation from '../models/ClassTeacherAllocation.js';
import User from '../models/User.js';

const toDay = (d) => {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
};

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp';
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB successfully.');

  const now = new Date();
  // Start: 1st of last month (e.g., Sept 1)
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  start.setHours(0, 0, 0, 0);

  // End: today (e.g., Oct 24)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setHours(0, 0, 0, 0);

  console.log(`Date Range: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`);

  const activeYear = (await AcademicYear.findOne({ isActive: true })) || (await AcademicYear.findOne());
  const adminUser = await User.findOne({ role: 'ADMIN' });
  const adminId = adminUser?._id || new mongoose.Types.ObjectId();

  const students = await Student.find({ isActive: { $ne: false } })
    .select('_id studentName standard division medium rollNo')
    .sort({ rollNo: 1, studentName: 1 })
    .lean();

  if (students.length === 0) {
    console.log('No active students found in the database.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${students.length} active students.`);

  // Group students by class
  const classMap = new Map();
  for (const st of students) {
    const std = st.standard?.trim();
    const div = st.division?.trim()?.toUpperCase();
    const med = st.medium?.trim();
    if (!std || !div || !med) continue;

    const key = `${std}|${div}|${med}`;
    if (!classMap.has(key)) {
      classMap.set(key, { standard: std, division: div, medium: med, students: [] });
    }
    classMap.get(key).students.push(st);
  }

  console.log(`Found ${classMap.size} distinct classes.`);

  const allocations = activeYear
    ? await ClassTeacherAllocation.find({ academicYearId: activeYear._id }).lean()
    : [];
  const teacherMap = new Map(
    allocations.map((a) => [`${a.standard}|${String(a.division).toUpperCase()}|${a.medium}`, a.teacherId])
  );

  // Exclude Sundays
  const workingDates = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() !== 0) {
      workingDates.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }

  console.log(`Generating attendance for ${workingDates.length} working days...`);

  const absentRemarks = [
    'Sick',
    'Fever',
    'Family function',
    'Out of town',
    'Medical appointment',
    'Urgent work',
    null,
    null,
  ];

  let totalSheets = 0;
  let totalRecords = 0;

  for (const d of workingDates) {
    const sheetDate = toDay(d);

    for (const [key, classInfo] of classMap.entries()) {
      const teacherId = teacherMap.get(key) || adminId;

      const records = classInfo.students.map((st) => {
        const rand = Math.random();
        let status = 'PRESENT';
        let remarks = null;

        // ~90% present, ~8% absent, ~2% late
        if (rand > 0.90) {
          if (Math.random() < 0.8) {
            status = 'ABSENT';
            remarks = absentRemarks[Math.floor(Math.random() * absentRemarks.length)];
          } else {
            status = 'LATE';
            remarks = 'Traffic delay';
          }
        }

        return {
          studentId: st._id,
          status,
          remarks,
          verifiedByAdmin: true,
          verifiedAt: sheetDate,
          verifiedBy: adminId,
          notifiedAt: status === 'ABSENT' || status === 'LATE' ? sheetDate : null,
        };
      });

      await Attendance.findOneAndUpdate(
        {
          date: sheetDate,
          standard: classInfo.standard,
          division: classInfo.division,
          medium: classInfo.medium,
        },
        {
          $set: {
            academicYearId: activeYear?._id || null,
            teacherId,
            records,
            status: 'CONFIRMED',
            submittedAt: sheetDate,
            confirmedAt: sheetDate,
            confirmedBy: adminId,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      totalSheets += 1;
      totalRecords += records.length;
    }
  }

  console.log(`Done! Created/updated ${totalSheets} attendance sheets with ${totalRecords} individual student records.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
