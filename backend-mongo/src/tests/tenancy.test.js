import '../config/tenancy.js'; // must run before any model is compiled
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AcademicYear from '../models/AcademicYear.js';
import Subject from '../models/Subject.js';
import ExamResult from '../models/ExamResult.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import { runWithTenant } from '../utils/tenantContext.js';

let mongo;
let a; // client A id
let b; // client B id

const year = (name = '2025-2026') => ({ name, startDate: new Date('2025-06-01'), endDate: new Date('2026-05-31') });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  a = (await Client.create({ name: 'A School', code: 'a-school', enabledModules: ['FEES'] }))._id.toString();
  b = (await Client.create({ name: 'B School', code: 'b-school', enabledModules: ['ERP'] }))._id.toString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('tenant plugin', () => {
  test('stamps clientId on create and isolates reads', async () => {
    await runWithTenant(a, () => AcademicYear.create(year()));
    await runWithTenant(b, () => AcademicYear.create(year()));

    const aYears = await runWithTenant(a, () => AcademicYear.find().lean());
    const bYears = await runWithTenant(b, () => AcademicYear.find().lean());
    expect(aYears).toHaveLength(1);
    expect(String(aYears[0].clientId)).toBe(a);
    expect(bYears).toHaveLength(1);
    expect(String(bYears[0].clientId)).toBe(b);
    expect(await AcademicYear.countDocuments()).toBe(2); // unscoped sees all
  });

  test('same unique value is allowed across clients but not within one', async () => {
    await expect(runWithTenant(a, () => AcademicYear.create(year()))).rejects.toThrow(/duplicate key/i);
    await expect(runWithTenant(a, () => AcademicYear.create(year('2026-2027')))).resolves.toBeDefined();
  });

  test('sparse-unique fields may be missing multiple times per client, and repeat across clients', async () => {
    await runWithTenant(a, () => Subject.create({ subjectName: 'Maths' }));
    await runWithTenant(a, () => Subject.create({ subjectName: 'Science' }));
    await runWithTenant(a, () => Subject.create({ subjectName: 'Art', subjectCode: 'ART' }));
    await runWithTenant(b, () => Subject.create({ subjectName: 'Art', subjectCode: 'ART' }));
    await expect(runWithTenant(a, () => Subject.create({ subjectName: 'Art2', subjectCode: 'ART' }))).rejects.toThrow(/duplicate key/i);
  });

  test('cannot read, update or delete another client’s documents', async () => {
    const bYear = await runWithTenant(b, () => AcademicYear.findOne().lean());
    expect(await runWithTenant(a, () => AcademicYear.findById(bYear._id))).toBeNull();

    const upd = await runWithTenant(a, () => AcademicYear.updateOne({ _id: bYear._id }, { $set: { isActive: true } }));
    expect(upd.matchedCount).toBe(0);
    const del = await runWithTenant(a, () => AcademicYear.deleteOne({ _id: bYear._id }));
    expect(del.deletedCount).toBe(0);
    expect(await AcademicYear.findById(bYear._id)).not.toBeNull();
  });

  test('aggregate is scoped', async () => {
    const rows = await runWithTenant(b, () => AcademicYear.aggregate([{ $group: { _id: null, n: { $sum: 1 } } }]));
    expect(rows[0].n).toBe(1);
  });

  test('insertMany and bulkWrite upserts are stamped / scoped', async () => {
    const docs = await runWithTenant(b, () => Subject.insertMany([{ subjectName: 'Bulk1' }, { subjectName: 'Bulk2' }]));
    expect(docs.every((d) => String(d.clientId) === b)).toBe(true);

    const examId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const subjectId = new mongoose.Types.ObjectId();
    const op = () => [{ updateOne: { filter: { examId, subjectId, studentId }, update: { $set: { marksObtained: 5, gradingSystem: 'Marks' } }, upsert: true } }];
    await runWithTenant(a, () => ExamResult.bulkWrite(op()));
    await runWithTenant(b, () => ExamResult.bulkWrite(op()));
    const all = await ExamResult.find({ examId }).lean();
    expect(all).toHaveLength(2);
    expect(new Set(all.map((r) => String(r.clientId)))).toEqual(new Set([a, b]));
  });

  test('User login ids stay globally unique and users are tenant-scoped', async () => {
    await runWithTenant(a, () => User.create({ name: 'A Admin', email: 'x@a.com', passwordHash: 'h', role: 'ADMIN' }));
    await expect(runWithTenant(b, () => User.create({ name: 'B Admin', email: 'x@a.com', passwordHash: 'h', role: 'ADMIN' }))).rejects.toThrow(/duplicate key/i);
    expect(await runWithTenant(b, () => User.findOne({ email: 'x@a.com' }))).toBeNull();
    expect(await User.findOne({ email: 'x@a.com' })).not.toBeNull(); // unscoped (login) lookup works
  });

  test('Client registry itself is not tenant-scoped', async () => {
    expect(await runWithTenant(a, () => Client.countDocuments())).toBe(2);
  });
});
