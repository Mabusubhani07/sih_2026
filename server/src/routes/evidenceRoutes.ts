import { Router } from 'express';
import { EvidenceController } from '../controllers/evidenceController';
import { authenticateJwt } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { ROLES } from '../config/constants';

const router = Router();

router.use(authenticateJwt);

router.get('/', EvidenceController.getEvidence);
router.post(
  '/',
  requireRoles(ROLES.POLICE_OFFICER, ROLES.INVESTIGATOR, ROLES.FORENSIC_OFFICER, ROLES.ADMIN),
  EvidenceController.createEvidence
);
router.post('/:id/verify', EvidenceController.verifyEvidence);

export default router;
