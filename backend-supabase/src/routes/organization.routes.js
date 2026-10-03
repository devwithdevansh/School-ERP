// Platform-owner (ORG_ADMIN) console: clients (schools) and their licensed modules.
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize, validate } from '../middlewares/index.js';
import { catchAsync, sendResponse } from '../utils/http.js';
import * as clients from '../services/clients.js';
import { MODULE_CATALOG, MODULE_IDS, CLIENT_STATUSES } from '../constants/modules.js';

const modules = z.array(z.enum(MODULE_IDS)).transform((m) => [...new Set(m)]);
const text = z.string().trim().max(300).nullable().optional();
const email = z.string().trim().email().nullable().optional();
const code = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, 'Code must be 3-40 chars: lowercase letters, digits, hyphens');
const password = z.string().min(8, 'Password must be at least 8 characters');

const createSchema = { body: z.object({
  name: z.string().trim().min(2).max(120), code: code.optional(), enabledModules: modules.default([]),
  contactName: text, contactEmail: email, contactPhone: text, address: text, notes: text,
  admin: z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), password }),
}) };
const updateSchema = { body: z.object({
  name: z.string().trim().min(2).max(120).optional(), status: z.enum(CLIENT_STATUSES).optional(), enabledModules: modules.optional(),
  contactName: text, contactEmail: email, contactPhone: text, address: text, notes: text,
}) };
const resetSchema = { body: z.object({ adminId: z.string().optional(), password }) };

const router = Router();
router.use(authenticate, authorize('ORG_ADMIN'));

router.get('/modules', (_req, res) => sendResponse(res, 200, MODULE_CATALOG));
router.get('/clients', catchAsync(async (_req, res) => sendResponse(res, 200, await clients.listClients())));
router.get('/clients/:id', catchAsync(async (req, res) => sendResponse(res, 200, await clients.getClient(req.params.id))));
router.post('/clients', validate(createSchema), catchAsync(async (req, res) => sendResponse(res, 201, await clients.createClient(req.body), 'Client created')));
router.patch('/clients/:id', validate(updateSchema), catchAsync(async (req, res) => sendResponse(res, 200, await clients.updateClient(req.params.id, req.body), 'Client updated')));
router.post('/clients/:id/reset-admin-password', validate(resetSchema), catchAsync(async (req, res) => sendResponse(res, 200, await clients.resetAdminPassword(req.params.id, req.body), 'Password reset')));

export default router;
