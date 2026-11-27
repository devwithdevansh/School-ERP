import express from 'express';
import CounselingController from '../controllers/CounselingController.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = express.Router();
router.use(authenticate);

router.post('/', authorize('ADMIN', 'STAFF', 'TEACHER'), CounselingController.createRecord);
router.get('/mine', authorize('ADMIN', 'STAFF', 'TEACHER'), CounselingController.getMyRecords);
router.get('/student/:studentId', authorize('ADMIN', 'STAFF', 'TEACHER', 'parent'), CounselingController.getForStudent);
router.patch('/:id', authorize('ADMIN', 'STAFF', 'TEACHER'), CounselingController.updateRecord);
router.post('/:id/milestone', authorize('ADMIN', 'STAFF', 'TEACHER'), CounselingController.addMilestone);
router.patch('/:id/milestone/:idx', authorize('ADMIN', 'STAFF', 'TEACHER'), CounselingController.updateMilestone);
router.patch('/:id/close', authorize('ADMIN', 'STAFF', 'TEACHER'), CounselingController.closeRecord);
router.patch('/:id/consent', authorize('ADMIN'), CounselingController.grantParentConsent);

export default router;
