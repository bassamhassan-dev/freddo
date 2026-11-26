import { Router } from 'express';
import * as controller from './admin.controller.js';
import * as reviewController from '../reviews/review.controller.js';
import * as couponController from '../coupons/coupon.controller.js';
import * as reservationController from '../reservations/reservation.controller.js';
import * as contactController from '../contact/contact.controller.js';
import * as bannerController from '../banners/banner.controller.js';
import * as analyticsController from '../analytics/analytics.controller.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ROLES } from '../../utils/roles.js';

// The whole /api/admin namespace is admin-only (doc 3.8: authorization is
// enforced server-side, here, never in the UI).
const router = Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

router.get('/orders', controller.listOrders);
router.post('/orders/:id/status', controller.setOrderStatus);
router.get('/contact', contactController.adminList);
router.patch('/contact/:id', contactController.adminUpdate);
router.get('/banners', bannerController.adminList);
router.post('/banners', bannerController.adminCreate);
router.patch('/banners/:id', bannerController.adminUpdate);
router.delete('/banners/:id', bannerController.adminDelete);
router.get('/analytics', analyticsController.dashboard);
router.get('/reservations', reservationController.adminList);
router.post('/reservations/:id/status', reservationController.adminSetStatus);
router.get('/tables', controller.listTables);
router.get('/coupons', couponController.adminList);
router.post('/coupons', couponController.adminCreate);
router.patch('/coupons/:id', couponController.adminUpdate);
router.get('/reviews', reviewController.adminListReviews);
router.patch('/reviews/:id/visibility', reviewController.adminSetVisibility);
router.get('/accounts', controller.listAccounts);
router.post('/accounts', controller.createAccount);
router.patch('/accounts/:id/status', controller.setAccountStatus);
router.patch('/accounts/:id/role', controller.setAccountRole);
router.get('/menu', controller.listMenu);
router.patch('/menu/:id/availability', controller.setAvailability);

export default router;
