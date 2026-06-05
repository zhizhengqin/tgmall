import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/coupon.controller.js';

const router = Router();
router.use(auth);

router.get('/', ctrl.list);
router.post('/:id/claim', ctrl.claim);
router.get('/mine', ctrl.myCoupons);  // 注意：/mine 必须在 /:id 之前，避免路由冲突

export default router;
