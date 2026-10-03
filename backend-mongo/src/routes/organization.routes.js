// src/routes/organization.routes.js — platform-owner (ORG_ADMIN) console: clients and their modules.
import { Router } from 'express';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import catchAsync from '../utils/catchAsync.js';
import sendResponse from '../utils/response.js';
import ClientService from '../services/ClientService.js';
import { MODULE_CATALOG } from '../constants/modules.js';
import { createClientSchema, updateClientSchema, resetAdminPasswordSchema } from '../validations/organization.schema.js';

const router = Router();
router.use(authenticate, authorize('ORG_ADMIN'));

router.get('/modules', (_req, res) => sendResponse(res, 200, MODULE_CATALOG));

router.get('/clients', catchAsync(async (_req, res) => sendResponse(res, 200, await ClientService.list())));
router.get('/clients/:id', catchAsync(async (req, res) => sendResponse(res, 200, await ClientService.get(req.params.id))));
router.post('/clients', validate(createClientSchema), catchAsync(async (req, res) =>
  sendResponse(res, 201, await ClientService.create(req.body), 'Client created')));
router.patch('/clients/:id', validate(updateClientSchema), catchAsync(async (req, res) =>
  sendResponse(res, 200, await ClientService.update(req.params.id, req.body), 'Client updated')));
router.post('/clients/:id/reset-admin-password', validate(resetAdminPasswordSchema), catchAsync(async (req, res) =>
  sendResponse(res, 200, await ClientService.resetAdminPassword(req.params.id, req.body), 'Password reset')));

export default router;
