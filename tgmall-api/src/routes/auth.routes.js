import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { telegramLoginSchema } from '../validators/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';
import * as adminAuthController from '../controllers/adminAuth.controller.js';

const router = Router();

router.post('/telegram', validate(telegramLoginSchema), authController.telegramLogin);
router.post('/web-login', authController.webLogin);
router.post('/admin-login', adminAuthController.login);

export default router;
