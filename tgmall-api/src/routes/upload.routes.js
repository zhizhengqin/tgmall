// 管理后台文件上传路由（图片压缩后存储）
import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import * as ctrl from '../controllers/upload.controller.js';

const router = Router();
router.use(auth);
router.use(adminAuth);

router.post('/image', ctrl.uploadImage);

export default router;
