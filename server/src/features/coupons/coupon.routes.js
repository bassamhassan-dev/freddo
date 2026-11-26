import { Router } from 'express';
import * as controller from './coupon.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

// Validation needs an account because per-user limits are part of the
// answer (doc 13.3).
router.post('/validate', requireAuth, controller.validate);

export default router;
