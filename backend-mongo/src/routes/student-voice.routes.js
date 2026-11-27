import express from 'express';
import StudentVoiceController from '../controllers/StudentVoiceController.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = express.Router();
router.use(authenticate);

router.post('/', authorize('ADMIN', 'STAFF', 'TEACHER', 'parent'), StudentVoiceController.submit);
router.get('/my', authorize('ADMIN', 'STAFF', 'TEACHER', 'parent'), StudentVoiceController.getMySubmissions);
router.get('/queue', authorize('ADMIN', 'STAFF', 'TEACHER'), StudentVoiceController.getQueue);
router.get('/:id', authorize('ADMIN', 'STAFF', 'TEACHER', 'parent'), StudentVoiceController.getOne);
router.patch('/:id/assign', authorize('ADMIN', 'STAFF'), StudentVoiceController.assign);
router.post('/:id/thread', authorize('ADMIN', 'STAFF', 'TEACHER', 'parent'), StudentVoiceController.addThreadMessage);
router.patch('/:id/status', authorize('ADMIN', 'STAFF', 'TEACHER'), StudentVoiceController.updateStatus);

export default router;
