// Academic years, fee categories, fee structures.
import { Router } from 'express';
import * as m from '../services/master.js';
import { authenticate, authorize } from '../middlewares/index.js';
import { catchAsync, sendResponse } from '../utils/http.js';

const admin = authorize('ADMIN');

export const academicYearRoutes = Router();
academicYearRoutes.use(authenticate);
academicYearRoutes.get('/', catchAsync(async (_req, res) => { const d = await m.listYears(); res.json({ status: 'success', results: d.length, data: d }); }));
academicYearRoutes.post('/', admin, catchAsync(async (req, res) => res.status(201).json({ status: 'success', data: await m.createYear(req.body) })));
academicYearRoutes.put('/:id', admin, catchAsync(async (req, res) => res.json({ status: 'success', data: await m.updateYear(req.params.id, req.body) })));
academicYearRoutes.delete('/:id', admin, catchAsync(async (req, res) => { await m.deleteYear(req.params.id); res.status(204).end(); }));

export const feeCategoryRoutes = Router();
feeCategoryRoutes.use(authenticate);
feeCategoryRoutes.get('/', catchAsync(async (_req, res) => { const d = await m.listCategories(); res.json({ status: 'success', results: d.length, data: d }); }));
feeCategoryRoutes.post('/', admin, catchAsync(async (req, res) => res.status(201).json({ status: 'success', data: await m.createCategory(req.body) })));
feeCategoryRoutes.put('/:id', admin, catchAsync(async (req, res) => res.json({ status: 'success', data: await m.updateCategory(req.params.id, req.body) })));
feeCategoryRoutes.delete('/:id', admin, catchAsync(async (req, res) => { await m.deleteCategory(req.params.id); res.status(204).end(); }));

export const feeStructureRoutes = Router();
feeStructureRoutes.use(authenticate);
feeStructureRoutes.get('/', catchAsync(async (_req, res) => sendResponse(res, 200, await m.listStructures())));
feeStructureRoutes.post('/copy', admin, catchAsync(async (req, res) => {
  const r = await m.copyStructures(req.body.fromYear, req.body.toYear);
  sendResponse(res, 201, r, `Successfully copied ${r.copiedCount} standard rates and ${r.copiedTransportCount} transport rates.`);
}));
feeStructureRoutes.post('/', admin, catchAsync(async (req, res) => { const r = await m.createStructure(req.body); sendResponse(res, r.status, r.row); }));
feeStructureRoutes.post('/transport', admin, catchAsync(async (req, res) => { const r = await m.createTransportStructure(req.body); sendResponse(res, r.status, r.row); }));
feeStructureRoutes.put('/transport/:id', admin, catchAsync(async (req, res) => sendResponse(res, 200, await m.updateTransportStructure(req.params.id, req.body))));
feeStructureRoutes.put('/:id', admin, catchAsync(async (req, res) => sendResponse(res, 200, await m.updateStructure(req.params.id, req.body))));
feeStructureRoutes.delete('/transport/:id', admin, catchAsync(async (req, res) => { await m.deleteTransportStructure(req.params.id); sendResponse(res, 200, null, 'Transport fee structure deleted successfully'); }));
feeStructureRoutes.delete('/:id', admin, catchAsync(async (req, res) => { await m.deleteStructure(req.params.id); sendResponse(res, 200, null, 'Fee structure deleted successfully'); }));
