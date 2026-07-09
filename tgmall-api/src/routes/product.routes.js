import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { productListQuerySchema } from '../validators/product.schema.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

router.get('/', optionalAuth, validate({ query: productListQuerySchema }), productController.list);
router.get('/:id', optionalAuth, productController.detail);

export default router;
