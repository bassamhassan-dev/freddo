import { Router } from 'express';
import * as controller from './order.controller.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ROLES } from '../../utils/roles.js';

// Every order route needs an account (doc 9.1: checkout is gated).
const router = Router();

router.use(requireAuth, requireRole(ROLES.CUSTOMER, ROLES.ADMIN));

router.post('/', controller.create);
router.get('/mine', controller.listMine);
router.get('/:id', controller.getOne);
router.post('/:id/cancel', controller.cancel);

export default router;
