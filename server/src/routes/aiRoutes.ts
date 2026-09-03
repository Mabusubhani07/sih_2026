import { Router } from 'express';
import { AiController } from '../controllers/aiController';
import { authenticateJwt } from '../middleware/auth';
import { requireDocumentAccess } from '../middleware/rbac';

const router = Router();

router.use(authenticateJwt);

router.post('/documents/:id/summarize', requireDocumentAccess('READ'), AiController.summarizeDocument);
router.post('/classify-preview', AiController.classifyPreview);

export default router;
