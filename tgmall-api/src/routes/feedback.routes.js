import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/feedback.controller.js';

const router = Router();

// 用户提交反馈
router.post('/', auth, ctrl.submit);

export default router;
