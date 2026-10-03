// Ledgers, payments, reports, expenses, dashboard.
import { Router } from 'express';
import { z } from 'zod';
import * as f from '../services/finance.js';
import { authenticate, authorize, validate } from '../middlewares/index.js';
import { catchAsync, sendResponse } from '../utils/http.js';

const staff = authorize('ADMIN', 'STAFF');
const METHOD = z.enum(['CASH', 'CHEQUE', 'ONLINE', 'UPI', 'REVERSAL']);
const paging = { limit: z.coerce.number().int().min(1).max(2000).optional(), skip: z.coerce.number().int().min(0).optional() };

export const ledgerRoutes = Router();
ledgerRoutes.use(authenticate);
ledgerRoutes.get('/', staff, validate({ query: z.object({
  studentId: z.string().optional(), academicYear: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'WAIVED', 'CANCELLED']).optional(), ...paging }) }),
  catchAsync(async (req, res) => sendResponse(res, 200, await f.listLedgers(req.query))));
ledgerRoutes.get('/:id', staff, catchAsync(async (req, res) => sendResponse(res, 200, await f.getLedger(req.params.id))));
ledgerRoutes.post('/:id/concession', authorize('ADMIN'),
  validate({ body: z.object({ amount: z.number().positive(), reason: z.string().min(1) }) }),
  catchAsync(async (req, res) => sendResponse(res, 200, await f.applyConcession(req.params.id, req.body.amount, req.body.reason, req.user.id))));

export const paymentRoutes = Router();
paymentRoutes.use(authenticate);
paymentRoutes.post('/batch', staff, validate({ body: z.object({ payments: z.array(z.object({
  ledgerId: z.string().min(1), amount: z.number().nonnegative(), concessionAmount: z.number().nonnegative().optional().default(0),
  method: METHOD, remark: z.string().optional().nullable() })).min(1) }) }),
  catchAsync(async (req, res) => sendResponse(res, 201, await f.createBatchPayments(req.body.payments, req.user.id))));
paymentRoutes.post('/', staff, validate({ body: z.object({
  ledgerId: z.string().min(1), amount: z.number().nonnegative(), concessionAmount: z.number().nonnegative().optional().default(0),
  method: METHOD, details: z.record(z.string(), z.unknown()).optional() }) }),
  catchAsync(async (req, res) => {
    const [payment] = await f.createBatchPayments([req.body], req.user.id);
    sendResponse(res, 201, payment);
  }));
paymentRoutes.get('/', staff, validate({ query: z.object({
  studentId: z.string().optional(), ledgerId: z.string().optional(), ledgerIds: z.string().optional(), date: z.string().optional(),
  isReversal: z.enum(['true', 'false']).transform((v) => v === 'true').optional(), ...paging }) }),
  catchAsync(async (req, res) => sendResponse(res, 200, await f.listPayments(req.query))));
paymentRoutes.get('/:id', staff, catchAsync(async (req, res) => sendResponse(res, 200, await f.getPayment(req.params.id))));
paymentRoutes.post('/:id/reverse', staff, validate({ body: z.object({ reason: z.string().min(1) }) }),
  catchAsync(async (req, res) => sendResponse(res, 201, await f.reversePayment(req.params.id, req.body.reason, req.user.id))));

export const reportRoutes = Router();
reportRoutes.use(authenticate, staff);
reportRoutes.get('/unpaid', catchAsync(async (req, res) => sendResponse(res, 200, await f.unpaidReport(req.query))));
reportRoutes.get('/collection', catchAsync(async (req, res) => sendResponse(res, 200, await f.collectionReport(req.query))));

export const expenseRoutes = Router();
expenseRoutes.use(authenticate, staff);
expenseRoutes.get('/', catchAsync(async (req, res) => { const expenses = await f.listExpenses(req.query); res.json({ status: 'success', results: expenses.length, data: { expenses } }); }));
expenseRoutes.post('/', catchAsync(async (req, res) => res.status(201).json({ status: 'success', data: { expense: await f.createExpense(req.body, req.user.id) } })));
expenseRoutes.post('/:id/reverse', catchAsync(async (req, res) => res.json({ status: 'success', data: { expense: await f.reverseExpense(req.params.id, req.body?.reason) } })));
expenseRoutes.delete('/:id', authorize('ADMIN'), catchAsync(async (req, res) => { await f.deleteExpense(req.params.id); res.json({ status: 'success', message: 'Expense deleted successfully' }); }));

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate, staff);
dashboardRoutes.get('/init', catchAsync(async (_req, res) => sendResponse(res, 200, await f.dashboardInit())));
dashboardRoutes.get('/sync-state', catchAsync(async (_req, res) => sendResponse(res, 200, await f.syncState())));
dashboardRoutes.get('/metrics', catchAsync(async (req, res) => sendResponse(res, 200, await f.dailyMetrics(req.query.date))));
