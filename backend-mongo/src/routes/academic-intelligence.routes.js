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
router.post('/concept-tags', authorize('admin', 'teacher'), ctrl.createConceptTag);
router.post('/concept-tags/bulk', authorize('admin', 'teacher'), ctrl.bulkCreateConceptTags);

// ─── Mastery ──────────────────────────────────────────────────────────────────

// Students, parents, teachers, admins can read mastery data
router.get(
  '/mastery/student/:studentId',
  authorize('admin', 'teacher', 'staff', 'parent', 'student'),
  ctrl.getMasteryForStudent
);

router.get(
  '/gaps/student/:studentId',
  authorize('admin', 'teacher', 'staff', 'parent', 'student'),
  ctrl.getMasteryGaps
);

// Only ADMIN / TEACHER can write mastery records
router.post('/mastery', authorize('admin', 'teacher', 'staff'), ctrl.saveMasteryRecords);

// ─── Improvement Plans ────────────────────────────────────────────────────────

// Students, parents, teachers, admins can view plans
router.get(
  '/plans/student/:studentId',
  authorize('admin', 'teacher', 'staff', 'parent', 'student'),
  ctrl.getImprovementPlans
);

// Only ADMIN / TEACHER can create or update plans
router.post('/plans', authorize('admin', 'teacher', 'staff'), ctrl.createImprovementPlan);
router.patch('/plans/:id', authorize('admin', 'teacher', 'staff'), ctrl.updateImprovementPlan);

export default router;
