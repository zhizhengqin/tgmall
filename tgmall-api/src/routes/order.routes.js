import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema } from '../validators/order.schema.js';
import * as ctrl from '../controllers/order.controller.js';

const router = Router();
router.use(auth);

router.post('/', validate(createOrderSchema), ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);
router.post('/:id/cancel', ctrl.cancel);
router.post('/:id/confirm', ctrl.confirm);

export default router;
