import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { telegramLoginSchema } from '../validators/auth.schema.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/telegram', validate(telegramLoginSchema), authController.telegramLogin);

export default router;
