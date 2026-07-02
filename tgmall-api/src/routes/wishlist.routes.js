import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/wishlist.controller.js';

const router = Router();

router.post('/toggle', auth, ctrl.toggle);
router.get('/', auth, ctrl.list);
router.delete('/:productId', auth, ctrl.remove);

export default router;
