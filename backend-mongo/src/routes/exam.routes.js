import express from 'express';
import ExamController from '../controllers/ExamController.js';
import protect from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = express.Router();

router.use(protect);

// Exam master data
router.post('/', authorize('ADMIN'), ExamController.createExam);
router.get('/', authorize('ADMIN', 'TEACHER', 'STAFF'), ExamController.getExams);
router.get('/:examId', authorize('ADMIN', 'TEACHER', 'STAFF'), ExamController.getExamById);
router.patch('/:examId', authorize('ADMIN'), ExamController.updateExam);
router.delete('/:examId', authorize('ADMIN'), ExamController.deleteExam);

// Exam lifecycle & readiness
router.get('/:examId/readiness', authorize('ADMIN', 'TEACHER', 'STAFF'), ExamController.getExamReadiness);
router.post('/:examId/publish', authorize('ADMIN', 'TEACHER'), ExamController.publishExam);
router.post('/:examId/unpublish', authorize('ADMIN'), ExamController.unpublishExam);

// Subject-level submit
router.post('/:examId/subjects/:subjectId/submit', authorize('ADMIN', 'TEACHER'), ExamController.submitSubjectMarks);

// A parent's view of their own child's results across every exam
router.get('/results/student/:studentId', authorize('ADMIN', 'TEACHER', 'STAFF', 'parent'), ExamController.getResultsForStudent);

// Exam results (class/subject entry & review — staff-side)
router.get('/:examId/results', authorize('ADMIN', 'TEACHER', 'STAFF'), ExamController.getExamResults);
router.post('/:examId/results', authorize('ADMIN', 'TEACHER'), ExamController.saveExamResults);

export default router;

