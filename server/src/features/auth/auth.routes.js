import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './auth.controller.js';
import * as oauthController from './oauth.controller.js';
import { upload } from '../uploads/upload.controller.js';
import { requireAuth } from './auth.middleware.js';

// Login/register are the classic brute-force targets, so they get a rate
// limit (doc 22). In-memory is enough for one instance; the limit is
// disabled under NODE_ENV=test so the test suite can hammer freely.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  // Answered in the unified error shape like everything else.
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

const router = Router();

router.post('/register', authLimiter, controller.register);
router.post('/verify-email', authLimiter, controller.verifyEmail);
router.post('/resend-verification', authLimiter, requireAuth, controller.resendVerification);
router.post('/login', authLimiter, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);
router.patch('/me', requireAuth, controller.updateMe);
router.post('/me/avatar', requireAuth, upload.single('image'), controller.uploadAvatar);

router.get('/oauth/providers', oauthController.providers);
router.get('/oauth/:provider', oauthController.start);
router.get('/oauth/:provider/callback', oauthController.callback);

export default router;
