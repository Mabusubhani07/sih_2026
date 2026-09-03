import { Router } from 'express';
import { CaseController } from '../controllers/caseController';
import { DocumentController } from '../controllers/documentController';
import { authenticateJwt } from '../middleware/auth';
import { requireCaseAccess, requireRoles } from '../middleware/rbac';
import { upload } from '../middleware/upload';
import { ROLES } from '../config/constants';

const router = Router();

router.use(authenticateJwt);

router.get('/', CaseController.getCases);
router.post(
  '/',
  requireRoles(ROLES.POLICE_OFFICER, ROLES.ADMIN, ROLES.INVESTIGATOR),
  CaseController.createCase
);

router.get('/:id', requireCaseAccess('READ'), CaseController.getCaseById);
router.patch('/:id', requireCaseAccess('WRITE'), CaseController.updateCase);
router.post('/:id/members', requireCaseAccess('WRITE'), CaseController.addMember);

// Case Documents nested endpoints
router.post(
  '/:caseId/documents',
  requireCaseAccess('WRITE'),
  upload.single('file'),
  DocumentController.uploadDocument
);

export default router;
