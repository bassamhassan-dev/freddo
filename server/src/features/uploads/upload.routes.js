import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ROLES } from '../../utils/roles.js';
import * as controller from './upload.controller.js';

// Admin-only media uploads (doc 16: admin uploads banner/product images).
const router = Router();
router.use(requireAuth, requireRole(ROLES.ADMIN));
router.get('/status', controller.status);
router.post('/', controller.upload.single('image'), controller.create);

export default router;
