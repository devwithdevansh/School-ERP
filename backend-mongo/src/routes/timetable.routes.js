import express from 'express';
import TimetableController from '../controllers/TimetableController.js';
import protect from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/', authorize('ADMIN', 'TEACHER'), TimetableController.createPeriod);
router.get('/', authorize('ADMIN', 'TEACHER', 'parent'), TimetableController.getTimetable);
router.put('/:id', authorize('ADMIN'), TimetableController.updatePeriod);
router.patch('/:id/proxy', authorize('ADMIN'), TimetableController.setProxy);
router.delete('/:id', authorize('ADMIN', 'TEACHER'), TimetableController.deletePeriod);

export default router;
