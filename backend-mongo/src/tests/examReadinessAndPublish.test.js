import '../config/tenancy.js';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import AcademicYear from '../models/AcademicYear.js';
import Exam from '../models/Exam.js';
import ExamResult from '../models/ExamResult.js';
import Client from '../models/Client.js';
import ExamController from '../controllers/ExamController.js';

let mongoServer;
let clientId;
let adminUser;
let teacherUser;
let activeYear;
let subjectEng;
let subjectMath;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());
  clientId = (await Client.create({ name: 'Exam Test School', code: 'exam-school', enabledModules: ['ERP'] }))._id;

  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@school.com',
    passwordHash: 'dummy',
    role: 'ADMIN',
    clientId
  });

  teacherUser = await User.create({
    name: 'Teacher User',
    email: 'teacher@school.com',
    passwordHash: 'dummy',
    role: 'TEACHER',
    clientId
  });

  activeYear = await AcademicYear.create({
    name: '2026-2027',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2027-04-30'),
    isActive: true,
    clientId
  });

  subjectEng = await Subject.create({
    subjectName: 'English',
    subjectCode: 'ENG',
    clientId
  });

  subjectMath = await Subject.create({
    subjectName: 'Mathematics',
    subjectCode: 'MATH',
    clientId
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Exam.deleteMany({});
  await ExamResult.deleteMany({});
  await Student.deleteMany({});
});

describe('Exam Readiness & Publishing Logic', () => {
  test('Readiness blocks publishing if any student has missing marks', async () => {
    // 2 active migrated students
    const s1 = await Student.create({
      studentName: 'Aarav Shah',
      standard: '10',
      division: 'A',
      medium: 'English',
      rollNo: 1,
      isActive: true,
      isMigrated: true,
      clientId
    });

    const s2 = await Student.create({
      studentName: 'Diya Patel',
      standard: '10',
      division: 'A',
      medium: 'English',
      rollNo: 2,
      isActive: true,
      isMigrated: true,
      clientId
    });

    // Create an Exam with English & Math
    const exam = await Exam.create({
      academicYearId: activeYear._id,
      standard: '10',
      divisions: ['A'],
      medium: 'English',
      examName: 'Mid Term 2026',
      type: 'FINAL',
      status: 'SCHEDULED',
      allowTeacherPublish: false,
      subjects: [
        { subjectId: subjectEng._id, maxMarks: 100, passingMarks: 35, gradingSystem: 'Marks' },
        { subjectId: subjectMath._id, maxMarks: 100, passingMarks: 35, gradingSystem: 'Marks' }
      ],
      createdBy: adminUser._id,
      clientId
    });

    // Check readiness initially (0 marks entered)
    let readiness = await ExamController.computeReadiness(exam);
    expect(readiness.totalStudents).toBe(2);
    expect(readiness.canPublish).toBe(false);
    expect(readiness.blockers.length).toBe(2); // English has missing, Math has missing

    // Enter marks for s1 in English, and mark s2 ABSENT in English
    await ExamResult.create({
      examId: exam._id,
      subjectId: subjectEng._id,
      studentId: s1._id,
      attendance: 'PRESENT',
      marksObtained: 85,
      maxMarks: 100,
      passingMarks: 35,
      gradingSystem: 'Marks',
      enteredBy: adminUser._id,
      clientId
    });

    await ExamResult.create({
      examId: exam._id,
      subjectId: subjectEng._id,
      studentId: s2._id,
      attendance: 'ABSENT',
      marksObtained: null,
      maxMarks: 100,
      passingMarks: 35,
      gradingSystem: 'Marks',
      enteredBy: adminUser._id,
      clientId
    });

    // English is now 100% complete! But Math is still 0%
    readiness = await ExamController.computeReadiness(exam);
    expect(readiness.subjects.find(s => s.subjectId === subjectEng._id.toString()).isComplete).toBe(true);
    expect(readiness.subjects.find(s => s.subjectId === subjectMath._id.toString()).isComplete).toBe(false);
    expect(readiness.canPublish).toBe(false);

    // Now fill Math for both
    await ExamResult.create({
      examId: exam._id,
      subjectId: subjectMath._id,
      studentId: s1._id,
      attendance: 'PRESENT',
      marksObtained: 92,
      maxMarks: 100,
      passingMarks: 35,
      gradingSystem: 'Marks',
      enteredBy: adminUser._id,
      clientId
    });

    await ExamResult.create({
      examId: exam._id,
      subjectId: subjectMath._id,
      studentId: s2._id,
      attendance: 'PRESENT',
      marksObtained: 74,
      maxMarks: 100,
      passingMarks: 35,
      gradingSystem: 'Marks',
      enteredBy: adminUser._id,
      clientId
    });

    // All marks are now complete
    readiness = await ExamController.computeReadiness(exam);
    expect(readiness.canPublish).toBe(true);
    expect(readiness.blockers.length).toBe(0);
    expect(readiness.overallPercentage).toBe(100);
  });

  test('Publishing fails if exam is not ready', async () => {
    const exam = await Exam.create({
      academicYearId: activeYear._id,
      standard: '10',
      divisions: ['A'],
      medium: 'English',
      examName: 'Incomplete Exam',
      type: 'FINAL',
      status: 'SCHEDULED',
      subjects: [
        { subjectId: subjectEng._id, maxMarks: 100, passingMarks: 35, gradingSystem: 'Marks' }
      ],
      createdBy: adminUser._id,
      clientId
    });

    // Student exists but no marks
    await Student.create({
      studentName: 'Test Student',
      standard: '10',
      division: 'A',
      medium: 'English',
      rollNo: 1,
      isActive: true,
      isMigrated: true,
      clientId
    });

    const mockReq = { params: { examId: exam._id.toString() }, user: adminUser };
    const mockRes = {};

    await expect(
      ExamController.publishExam(mockReq, mockRes, (err) => { throw err; })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('Teacher cannot publish if allowTeacherPublish is false', async () => {
    const s1 = await Student.create({
      studentName: 'Solo Student',
      standard: '10',
      division: 'A',
      medium: 'English',
      rollNo: 1,
      isActive: true,
      isMigrated: true,
      clientId
    });

    const exam = await Exam.create({
      academicYearId: activeYear._id,
      standard: '10',
      divisions: ['A'],
      medium: 'English',
      examName: 'Complete Exam',
      type: 'FINAL',
      status: 'READY',
      allowTeacherPublish: false,
      subjects: [
        { subjectId: subjectEng._id, maxMarks: 100, passingMarks: 35, gradingSystem: 'Marks' }
      ],
      createdBy: adminUser._id,
      clientId
    });

    await ExamResult.create({
      examId: exam._id,
      subjectId: subjectEng._id,
      studentId: s1._id,
      attendance: 'PRESENT',
      marksObtained: 90,
      maxMarks: 100,
      passingMarks: 35,
      gradingSystem: 'Marks',
      enteredBy: adminUser._id,
      clientId
    });

    const mockReq = { params: { examId: exam._id.toString() }, user: teacherUser };
    const mockRes = {};

    await expect(
      ExamController.publishExam(mockReq, mockRes, (err) => { throw err; })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

