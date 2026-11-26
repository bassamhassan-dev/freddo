import { Router } from 'express';
import * as controller from './marquee.controller.js';

// Public read; the admin write goes through the admin router.
const router = Router();
router.get('/', controller.getPublic);
export default router;
