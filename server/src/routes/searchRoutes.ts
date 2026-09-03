import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', SearchController.search);

export default router;
