import { Router } from 'express';
import * as controller from './review.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

// Public: only visible reviews ever leave this endpoint (doc 12).
router.get('/', controller.listReviews);
// Writing needs an account; verification is computed server-side.
router.post('/', requireAuth, controller.createReview);

export default router;
