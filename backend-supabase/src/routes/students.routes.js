import { Router } from 'express';
import { z } from 'zod';
import * as students from '../services/students.js';
import { authenticate, authorize, validate, notImplemented } from '../middlewares/index.js';
import { AppError, catchAsync, sendResponse } from '../utils/http.js';

const MONTH = z.enum(['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May']);
const nullableStr = z.string().nullable().optional();
const profile = z.object({
  birthPlace: nullableStr, religion: nullableStr, category: nullableStr, caste: nullableStr,
  bloodGroup: nullableStr, height: nullableStr, weight: nullableStr, medicalRemark: nullableStr,
}).optional();

const shared = {
  medium: z.enum(['English', 'Gujarati']), standard: z.string().min(1), division: z.string().min(1),
  transportType: z.string().optional(), isRTE: z.boolean().optional(), isNewAdmission: z.boolean().optional(),
  buyBagKit: z.boolean().optional(), admissionMonth: MONTH.optional(), transportStartMonth: MONTH.optional(),
  surname: nullableStr, fatherName: nullableStr, motherName: nullableStr, grNo: nullableStr,
  gender: z.enum(['Male', 'Female']).nullable().optional(), dob: z.coerce.date().nullable().optional(),
  aadharNo: nullableStr, penNo: nullableStr, photoUrl: nullableStr, profile,
};
const createSchema = z.object({
  parentId: z.string().min(1).optional(), studentCode: z.string().min(1).optional(),
  studentName: z.string().min(1).max(100), parentName: z.string().optional(),
  parentMobile: z.string().optional(), parentSecondaryMobile: z.string().optional(), ...shared,
});
const updateSchema = z.object({
  studentName: z.string().min(1).max(100).optional(), isActive: z.boolean().optional(), isMigrated: z.boolean().optional(),
  transportMonths: z.coerce.number().int().min(0).max(12).optional(),
  parentName: z.string().optional(), parentMobile: z.string().optional(),
  parentSecondaryMobile: z.string().nullable().optional(), parentAllowOtpReset: z.boolean().optional(),
  ...Object.fromEntries(Object.entries(shared).map(([k, v]) => [k, v.optional ? v.optional() : v])),
});
const listSchema = z.object({
  parentId: z.string().optional(), medium: z.enum(['English', 'Gujarati']).optional(), standard: z.string().optional(),
  division: z.string().optional(), isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  includeInactive: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(), skip: z.coerce.number().int().min(0).optional(),
});

export const studentRoutes = Router();
studentRoutes.use(authenticate);

// bulk operations depend on the full mongo migration/promotion engine - not ported yet
studentRoutes.post('/promote', authorize('ADMIN'), notImplemented('Student promotion'));
studentRoutes.post('/import', authorize('ADMIN'), notImplemented('Excel student import'));
studentRoutes.patch('/fix-transport', authorize('ADMIN'), notImplemented('Transport ledger fix'));
studentRoutes.post('/auto-promote-batch', authorize('ADMIN'), notImplemented('Auto promotion'));

studentRoutes.post('/', authorize('ADMIN', 'STAFF'), validate({ body: createSchema }),
  catchAsync(async (req, res) => sendResponse(res, 201, await students.createStudent(req.body, req.user.id))));
studentRoutes.get('/', authorize('ADMIN', 'STAFF', 'TEACHER'), validate({ query: listSchema }),
  catchAsync(async (req, res) => sendResponse(res, 200, await students.listStudents(req.query))));
studentRoutes.get('/:id', authorize('ADMIN', 'STAFF'), catchAsync(async (req, res) => sendResponse(res, 200, await students.getStudent(req.params.id))));
studentRoutes.patch('/:id', authorize('ADMIN', 'STAFF'), validate({ body: updateSchema }),
  catchAsync(async (req, res) => sendResponse(res, 200, await students.updateStudent(req.params.id, req.body, req.user.id))));
studentRoutes.delete('/:id', authorize('ADMIN', 'STAFF'), catchAsync(async (req, res) => {
  const r = await students.deleteStudent(req.params.id, req.user.id);
  sendResponse(res, 200, null, r.softDeleted ? 'Student has payment history and was marked as inactive (soft deleted)' : 'Student and all records successfully deleted');
}));
studentRoutes.post('/:id/restore', authorize('ADMIN'), catchAsync(async (req, res) => sendResponse(res, 200, await students.restoreStudent(req.params.id, req.user.id))));
studentRoutes.post('/:id/regenerate-ledgers', authorize('ADMIN'), catchAsync(async (req, res) => sendResponse(res, 200, await students.regenerateLedgers(req.params.id))));
studentRoutes.post('/:id/custom-fee', authorize('ADMIN', 'STAFF'), catchAsync(async (req, res) => {
  const { feeName, amount } = req.body;
  if (!feeName || !amount) throw new AppError('Fee name and amount required', 400);
  sendResponse(res, 201, await students.addCustomFee(req.params.id, feeName, Number(amount), req.user.id), 'Custom fee successfully added');
}));

export const parentRoutes = Router();
parentRoutes.use(authenticate);
parentRoutes.get('/check-mobile', authorize('ADMIN', 'STAFF'), catchAsync(async (req, res) => {
  if (!req.query.primaryMobile && !req.query.secondaryMobile) throw new AppError('At least one mobile number must be provided', 400);
  sendResponse(res, 200, await students.checkMobile(req.query));
}));
