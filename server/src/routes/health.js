import { Router } from 'express';

const router = Router();

// GET /api/health - liveness check for monitoring and smoke tests
router.get('/', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export default router;
