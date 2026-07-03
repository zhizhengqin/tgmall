import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as ctrl from '../controllers/tag.controller.js';

const router = Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/tags', ctrl.list);
router.post('/tags', ctrl.create);
router.put('/tags/:id', ctrl.update);
router.delete('/tags/:id', ctrl.remove);

export default router;
