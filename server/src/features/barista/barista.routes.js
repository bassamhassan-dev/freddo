import { Router } from 'express';
import * as controller from './barista.controller.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ROLES } from '../../utils/roles.js';

// Staff-only: baristas read recipes here; admin stays authorized per doc 7.5.
const router = Router();
router.use(requireAuth, requireRole(ROLES.BARISTA, ROLES.ADMIN));

router.get('/items', controller.listItems);
router.get('/items/:slug/recipe', controller.getRecipe);

export default router;
