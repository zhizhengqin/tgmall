import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

router.get('/', optionalAuth, productController.list);
router.get('/:id', optionalAuth, productController.detail);

export default router;
