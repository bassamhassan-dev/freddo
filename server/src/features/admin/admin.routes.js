import { Router } from 'express';
import * as controller from './admin.controller.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ROLES } from '../../utils/roles.js';

// The whole /api/admin namespace is admin-only (doc 3.8: authorization is
// enforced server-side, here, never in the UI).
const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/orders', controller.listOrders);
router.post('/orders/:id/status', controller.setOrderStatus);
router.get('/accounts', controller.listAccounts);
router.post('/accounts', controller.createAccount);
router.patch('/accounts/:id/status', controller.setAccountStatus);
router.patch('/accounts/:id/role', controller.setAccountRole);
router.get('/menu', controller.listMenu);
router.patch('/menu/:id/availability', controller.setAvailability);

export default router;
