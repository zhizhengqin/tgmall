import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import * as ctrl from '../controllers/tag.controller.js';

const router = Router();
router.use(auth);
router.use(adminAuth);

router.get('/tags', ctrl.list);
router.post('/tags', ctrl.create);
router.put('/tags/:id', ctrl.update);
router.delete('/tags/:id', ctrl.remove);

export default router;
