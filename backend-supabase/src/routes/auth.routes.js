import { Router } from 'express';
import { z } from 'zod';
import * as auth from '../services/auth.js';
import { authenticate, validate } from '../middlewares/index.js';
import { catchAsync, sendResponse } from '../utils/http.js';

const router = Router();

router.post('/portal/login',
  validate({ body: z.object({ email: z.string().min(3), password: z.string().min(6) }) }),
  catchAsync(async (req, res) => sendResponse(res, 200, await auth.portalLogin(req.body))));

router.post('/refresh',
  validate({ body: z.object({ domain: z.enum(['parent', 'user']).optional(), userId: z.string().min(1), refreshToken: z.string().min(1) }) }),
  catchAsync(async (req, res) => sendResponse(res, 200, await auth.refresh(req.body))));

router.get('/context', authenticate, catchAsync(async (req, res) => sendResponse(res, 200, await auth.getContext(req.user))));

router.post('/logout', authenticate,
  catchAsync(async (req, res) => { await auth.logout({ userId: req.user.id, refreshToken: req.body?.refreshToken }); sendResponse(res, 200, null, 'Logged out successfully'); }));

router.post('/logout-all', authenticate,
  catchAsync(async (req, res) => { await auth.logoutAll(req.user.id); sendResponse(res, 200, null, 'All sessions cleared'); }));

export default router;
