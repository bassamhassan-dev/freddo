import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ROLES } from '../../utils/roles.js';
import * as controller from './loyalty.controller.js';

const router = Router();

// Customer: balance, lifetime earned, and the last 20 ledger entries.
router.get('/mine', requireAuth, controller.myLoyalty);
// Admin: manual correction with a mandatory reason (append-only ledger).
router.get('/admin/settings', requireAuth, requireRole(ROLES.ADMIN), controller.getSettings);
router.put('/admin/settings', requireAuth, requireRole(ROLES.ADMIN), controller.updateSettings);
router.post('/admin/adjust', requireAuth, requireRole(ROLES.ADMIN), controller.adjust);

export default router;
