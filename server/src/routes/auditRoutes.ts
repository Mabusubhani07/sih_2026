import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', AuditController.getLogs);

export default router;
