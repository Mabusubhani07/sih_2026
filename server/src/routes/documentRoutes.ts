import { Router } from 'express';
import { DocumentController } from '../controllers/documentController';
import { authenticateJwt } from '../middleware/auth';
import { requireDocumentAccess } from '../middleware/rbac';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticateJwt);

router.get('/:id', requireDocumentAccess('READ'), DocumentController.getDocumentById);
router.get('/:id/download', requireDocumentAccess('READ'), DocumentController.downloadDocument);
router.get('/:id/ocr-text', requireDocumentAccess('READ'), DocumentController.getOcrText);
router.post(
  '/:id/versions',
  requireDocumentAccess('WRITE'),
  upload.single('file'),
  DocumentController.uploadNewVersion
);
router.put('/:id/classification', requireDocumentAccess('WRITE'), DocumentController.updateClassification);
router.put('/:id/metadata', requireDocumentAccess('WRITE'), DocumentController.updateMetadata);
router.post('/:id/retry-processing', requireDocumentAccess('WRITE'), DocumentController.retryProcessing);
router.post('/:id/verify', requireDocumentAccess('READ'), DocumentController.verifyIntegrity);
router.post('/:id/archive', requireDocumentAccess('WRITE'), DocumentController.archiveDocument);
router.post('/:id/share', requireDocumentAccess('WRITE'), DocumentController.shareDocument);
router.delete('/:id/share/:shareId', requireDocumentAccess('WRITE'), DocumentController.revokeShare);

export default router;
