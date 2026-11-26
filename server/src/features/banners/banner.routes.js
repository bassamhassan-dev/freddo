import { Router } from 'express';
import * as controller from './banner.controller.js';

// Public read-only: active banners per placement, inside their window.
const router = Router();
router.get('/', controller.listPublic);
export default router;
