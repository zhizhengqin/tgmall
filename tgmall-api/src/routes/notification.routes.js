// 用户通知路由
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/notification.controller.js';

const router = Router();

router.use(auth);
router.get('/', ctrl.list);

export default router;
