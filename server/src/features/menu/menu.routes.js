import { Router } from 'express';
import * as controller from './menu.controller.js';

// Routes only map URLs to controllers. One line per endpoint, so the
// feature's whole public surface is readable at a glance.
const router = Router();

router.get('/', controller.getMenu);
router.get('/:slug', controller.getMenuItem);

export default router;
