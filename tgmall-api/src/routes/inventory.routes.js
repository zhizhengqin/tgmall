// 库存管理路由 — 挂载于 adminRouter，继承 auth + adminAuth 中间件
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  adjustStockSchema,
  inventoryCheckSchema,
  alertThresholdSchema,
} from '../validators/inventory.schema.js';
import * as ctrl from '../controllers/inventory.controller.js';

const router = Router();

router.get('/inventory', ctrl.listInventory);
router.put('/products/:id/stock', validate(adjustStockSchema), ctrl.adjustStock);
router.get('/products/:id/stock-logs', ctrl.stockLogs);
router.post('/inventory/check', validate(inventoryCheckSchema), ctrl.checkInventory);
router.put('/products/:id/alert-threshold', validate(alertThresholdSchema), ctrl.setAlertThreshold);

export default router;
