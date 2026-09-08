import { Router } from 'express';
import { UploadChunkController } from '../controllers/uploadChunkController';
import { authenticateJwt } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticateJwt);

router.post('/chunk', upload.single('chunk'), UploadChunkController.uploadChunk);

export default router;
