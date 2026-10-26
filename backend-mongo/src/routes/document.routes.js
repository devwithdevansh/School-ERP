import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/authorize.middleware.js';

const router = Router();

router.use(authenticate);

// Query students with complete details for I-Card generation (filters: standard, division, whole school, single)
router.get('/id-cards', DocumentController.getIdCardStudents);

// List issued documents and certificates
router.get('/', DocumentController.getIssuedDocuments);

// Get single document by ID
router.get('/:id', DocumentController.getDocumentById);

// Issue certificate(s) / document(s) - Admin / Staff with permissions
router.post('/issue', authorize('ADMIN', 'STAFF'), DocumentController.issueDocument);

// Revoke an issued document
router.patch('/:id/revoke', authorize('ADMIN'), DocumentController.revokeDocument);

export default router;
