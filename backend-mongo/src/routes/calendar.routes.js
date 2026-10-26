import { Router } from 'express';
import * as calendarController from '../controllers/CalendarController.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = Router();

router.use(authenticate);

// Public to all school users (Staff, Teachers, Admin)
router.get('/', calendarController.getEvents);
router.get('/roadmap', calendarController.getRoadmap);

// Admin-only endpoints for configuration & planning
router.get('/suggestions', authorize('ADMIN'), calendarController.getSuggestions);
router.post('/bulk-apply', authorize('ADMIN'), calendarController.bulkApplyEvents);
router.post('/seed-dummy', authorize('ADMIN'), calendarController.seedDummyRoadmap);
router.post('/', authorize('ADMIN'), calendarController.createEvent);
router.put('/:id', authorize('ADMIN'), calendarController.updateEvent);
router.delete('/:id', authorize('ADMIN'), calendarController.deleteEvent);

export default router;
