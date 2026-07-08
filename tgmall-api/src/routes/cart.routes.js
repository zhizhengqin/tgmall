import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { addCartItemSchema, updateCartItemSchema, checkoutPreviewSchema } from '../validators/cart.schema.js';
import * as ctrl from '../controllers/cart.controller.js';

const router = Router();
router.use(auth);

router.get('/', ctrl.get);
router.post('/items', validate(addCartItemSchema), ctrl.addItem);
router.put('/items/:id', validate(updateCartItemSchema), ctrl.updateItem);
router.delete('/items/:id', ctrl.removeItem);
router.post('/checkout-preview', validate(checkoutPreviewSchema), ctrl.checkoutPreview);
router.delete('/', ctrl.clear);

export default router;
