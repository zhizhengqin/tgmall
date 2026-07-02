import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/city.controller.js';

const router = Router();

router.get('/', ctrl.listCities);
router.get('/nearest', ctrl.nearestCity);
router.put('/users/me/city', auth, ctrl.updateUserCity);

export default router;
