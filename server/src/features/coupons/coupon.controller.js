import * as service from './coupon.service.js';
import { catchAsync } from '../../utils/catchAsync.js';

// POST /api/coupons/validate - the live cart check. Same rules as checkout.
export const validate = catchAsync(async (req, res) => {
  const subtotal = Number(req.body?.subtotal) || 0;
  const { coupon, discount } = await service.validateCouponForUser(req.body?.code, req.user, subtotal);
  res.json({
    success: true,
    data: { code: coupon.code, discountType: coupon.discountType, value: coupon.value, discount },
  });
});

// --- Admin ---
export const adminList = catchAsync(async (req, res) => {
  const coupons = await service.listCoupons(req.query);
  res.json({ success: true, data: { coupons } });
});

export const adminCreate = catchAsync(async (req, res) => {
  const coupon = await service.createCoupon(req.body);
  res.status(201).json({ success: true, data: { coupon } });
});

export const adminUpdate = catchAsync(async (req, res) => {
  const coupon = await service.updateCoupon(req.params.id, req.body || {});
  res.json({ success: true, data: { coupon } });
});
