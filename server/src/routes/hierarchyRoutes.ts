import { Router, Request, Response } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { HierarchyService } from '../services/hierarchyService';

const router = Router();

router.use(authenticateJwt);

/**
 * GET /api/hierarchy
 * Returns Organization -> Department -> Case -> Document Type -> Subcategory -> Document -> Version tree
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const tree = await HierarchyService.getFullHierarchy(user.id, user.role, user.departmentId);
    return res.json(tree);
  } catch (err: any) {
    console.error('Hierarchy fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve institutional document hierarchy.' });
  }
});

export default router;
