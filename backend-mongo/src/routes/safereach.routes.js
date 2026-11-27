import express from 'express';
import SafeReachController from '../controllers/SafeReachController.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = express.Router();
router.use(authenticate);

router.put('/consent', authorize('parent', 'ADMIN'), SafeReachController.setConsent);
router.get('/consent/:studentId', authorize('parent', 'ADMIN', 'STAFF', 'TEACHER'), SafeReachController.getConsent);
router.post('/trip/start', authorize('parent', 'ADMIN', 'STAFF', 'TEACHER'), SafeReachController.startTrip);
router.patch('/trip/:id/location', authorize('parent', 'ADMIN', 'STAFF', 'TEACHER'), SafeReachController.updateLocation);
router.patch('/trip/:id/arrive', authorize('parent', 'ADMIN', 'STAFF', 'TEACHER'), SafeReachController.confirmArrival);
router.patch('/trip/:id/cancel', authorize('parent', 'ADMIN', 'STAFF', 'TEACHER'), SafeReachController.cancelTrip);
router.get('/trip/today', authorize('parent', 'ADMIN', 'STAFF', 'TEACHER'), SafeReachController.getTodayStatus);
router.get('/trip/history', authorize('parent', 'ADMIN', 'STAFF', 'TEACHER'), SafeReachController.getTripHistory);

export default router;
