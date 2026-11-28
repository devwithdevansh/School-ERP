import express from 'express';
import ctrl from '../controllers/AcademicIntelligenceController.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ─── Concept Tags ─────────────────────────────────────────────────────────────

// Any authenticated user can read concept tags
router.get('/concept-tags', ctrl.getConceptTags);

// Only ADMIN / TEACHER can create tags
router.post('/concept-tags', authorize('ADMIN', 'TEACHER'), ctrl.createConceptTag);
router.post('/concept-tags/bulk', authorize('ADMIN', 'TEACHER'), ctrl.bulkCreateConceptTags);

// ─── Mastery ──────────────────────────────────────────────────────────────────

// Students, parents, teachers, admins can read mastery data
router.get(
  '/mastery/student/:studentId',
  authorize('ADMIN', 'TEACHER', 'STAFF', 'parent'),
  ctrl.getMasteryForStudent
);

router.get(
  '/gaps/student/:studentId',
  authorize('ADMIN', 'TEACHER', 'STAFF', 'parent'),
  ctrl.getMasteryGaps
);

// Only ADMIN / TEACHER can write mastery records
router.post('/mastery', authorize('ADMIN', 'TEACHER', 'STAFF'), ctrl.saveMasteryRecords);

// ─── Improvement Plans ────────────────────────────────────────────────────────

// Students, parents, teachers, admins can view plans
router.get(
  '/plans/student/:studentId',
  authorize('ADMIN', 'TEACHER', 'STAFF', 'parent'),
  ctrl.getImprovementPlans
);

// Only ADMIN / TEACHER can create or update plans
router.post('/plans', authorize('ADMIN', 'TEACHER', 'STAFF'), ctrl.createImprovementPlan);
router.patch('/plans/:id', authorize('ADMIN', 'TEACHER', 'STAFF'), ctrl.updateImprovementPlan);

export default router;
