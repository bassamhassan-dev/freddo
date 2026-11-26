import { Router } from 'express';
import { sendSuccess } from '../../utils/apiResponse.js';

// Liveness check for monitoring and smoke tests. Synchronous, so it needs
// no catchAsync; even this small handler answers in the unified shape.
const router = Router();

router.get('/', (req, res) => {
  sendSuccess(res, 200, { status: 'ok', uptime: process.uptime() });
});

export default router;
