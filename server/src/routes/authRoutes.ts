import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticateJwt, AuthController.getMe);
router.post('/logout', authenticateJwt, AuthController.logout);
router.get('/demo-accounts', AuthController.getDemoAccounts);

export default router;
