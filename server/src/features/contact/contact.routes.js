import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './contact.controller.js';

const router = Router();

// The contact form is public and unauthenticated, so it is a spam target:
// same in-memory rate limiter pattern as auth (doc 11: anti-spam).
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: { ar: 'محاولات كتير، استنى شوية وجرب تاني', en: 'Too many attempts, wait a bit and try again' },
      },
    });
  },
});

router.post('/', contactLimiter, controller.create);

export default router;
