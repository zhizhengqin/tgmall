import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/shopConfig.controller.js';
import {
  categorySchema,
  bannerSchema,
  citySchema,
  deliveryRuleSchema,
  customerServiceSchema,
} from '../validators/shopConfig.schema.js';

const adminRouter = Router();
adminRouter.use(auth);
adminRouter.use(adminAuth);

// Categories
adminRouter.get('/categories', ctrl.listCategories);
adminRouter.post('/categories', validate(categorySchema), ctrl.createCategory);
adminRouter.put('/categories/:code', validate(categorySchema), ctrl.updateCategory);
adminRouter.post('/categories/:code/toggle', ctrl.toggleCategory);

// Banners
adminRouter.get('/banners', ctrl.listBanners);
adminRouter.post('/banners', validate(bannerSchema), ctrl.createBanner);
adminRouter.put('/banners/:id', validate(bannerSchema), ctrl.updateBanner);
adminRouter.post('/banners/:id/toggle', ctrl.toggleBanner);

// Cities
adminRouter.get('/cities', ctrl.listCities);
adminRouter.post('/cities', validate(citySchema), ctrl.createCity);
adminRouter.put('/cities/:code', validate(citySchema), ctrl.updateCity);
adminRouter.post('/cities/:code/toggle', ctrl.toggleCity);

// Delivery Rules
adminRouter.get('/delivery-rules', ctrl.listDeliveryRules);
adminRouter.put('/delivery-rules/:cityCode', validate(deliveryRuleSchema), ctrl.upsertDeliveryRule);
adminRouter.post('/delivery-rules/:id/toggle', ctrl.toggleDeliveryRule);

// Customer Services
adminRouter.get('/customer-services', ctrl.listCustomerServices);
adminRouter.post('/customer-services', validate(customerServiceSchema), ctrl.createCustomerService);
adminRouter.put('/customer-services/:id', validate(customerServiceSchema), ctrl.updateCustomerService);
adminRouter.post('/customer-services/:id/toggle', ctrl.toggleCustomerService);
adminRouter.post('/customer-services/:id/set-default', ctrl.setDefaultCustomerService);

const publicRouter = Router();
publicRouter.get('/banners', ctrl.publicBanners);
publicRouter.get('/categories', ctrl.publicCategories);
publicRouter.get('/cities', ctrl.publicCities);
publicRouter.get('/delivery-rules/:cityCode', ctrl.publicDeliveryRule);
publicRouter.get('/customer-services/default', ctrl.publicDefaultCustomerService);
publicRouter.get('/login-banner', ctrl.publicLoginBanner);

export { adminRouter, publicRouter };
