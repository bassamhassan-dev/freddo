import { Router } from 'express';
import * as controller from './reservation.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

// Every reservation route needs an account (doc: reservation management is
// an authenticated-customer capability).
const router = Router();
router.use(requireAuth);

router.post('/', controller.create);
router.get('/mine', controller.listMine);
router.post('/:id/cancel', controller.cancelMine);

export default router;
