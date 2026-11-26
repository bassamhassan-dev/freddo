import { Router } from 'express';
import * as controller from './content.controller.js';

// Public read-only; the admin writes go through the admin router.
const router = Router();
router.get('/', controller.listPublic);
export default router;
