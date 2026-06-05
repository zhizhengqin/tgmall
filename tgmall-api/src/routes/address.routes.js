import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createAddressSchema, updateAddressSchema } from '../validators/address.schema.js';
import * as ctrl from '../controllers/address.controller.js';

const router = Router();
router.use(auth);

router.get('/', ctrl.list);
router.post('/', validate(createAddressSchema), ctrl.create);
router.put('/:id', validate(updateAddressSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
