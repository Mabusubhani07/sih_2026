import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateJwt } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { ROLES } from '../config/constants';

const router = Router();

router.use(authenticateJwt);

router.get('/', UserController.getUsers);
router.get('/departments', UserController.getDepartments);
router.get('/dashboard-stats', UserController.getDashboardStats);
router.patch('/:id/status', requireRoles(ROLES.ADMIN), UserController.updateUserStatus);

export default router;
