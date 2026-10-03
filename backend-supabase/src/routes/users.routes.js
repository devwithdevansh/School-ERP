import { Router } from 'express';
import * as users from '../services/users.js';
import { authenticate, authorize } from '../middlewares/index.js';
import { AppError, catchAsync, sendResponse } from '../utils/http.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.post('/', catchAsync(async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || (!email && !phone) || !password) throw new AppError('Name, email/phone, and password are required', 400);
  if (password.length < 6) throw new AppError('Password must be at least 6 characters', 400);
  sendResponse(res, 201, await users.createStaff({ name, email, phone, password, role }, req.user.id), 'Staff account created successfully');
}));
router.get('/', catchAsync(async (_req, res) => sendResponse(res, 200, await users.listStaff())));
router.patch('/:id/toggle-status', catchAsync(async (req, res) => {
  const r = await users.toggleStatus(req.params.id, req.user.id);
  sendResponse(res, 200, r, `Staff account ${r.isActive ? 'activated' : 'deactivated'}`);
}));
// the frontend uses PUT, the mongo backend documents PATCH - accept both
router.put('/:id/teacher-profile', catchAsync(async (req, res) => sendResponse(res, 200, await users.updateTeacherProfile(req.params.id, req.body, req.user.id), 'Profile updated successfully')));
router.patch('/:id/teacher-profile', catchAsync(async (req, res) => sendResponse(res, 200, await users.updateTeacherProfile(req.params.id, req.body, req.user.id), 'Profile updated successfully')));
router.patch('/:id/reset-password', catchAsync(async (req, res) => {
  if (!req.body.newPassword || req.body.newPassword.length < 6) throw new AppError('New password must be at least 6 characters', 400);
  sendResponse(res, 200, await users.resetPassword(req.params.id, req.body.newPassword, req.user.id));
}));
router.delete('/:id', catchAsync(async (req, res) => sendResponse(res, 200, await users.deleteStaff(req.params.id, req.user.id), 'Staff account deleted successfully')));

export default router;
