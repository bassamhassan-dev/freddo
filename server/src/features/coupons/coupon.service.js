import Coupon from './coupon.model.js';
import CouponUsage from './couponUsage.model.js';
import { AppError } from '../../utils/AppError.js';

// Coupon rules (doc 13.3). One validation path serves both the live cart
// check and the real checkout, so what the customer sees is what the order
// pays. Discount math always happens here - never trusted from the client.

function couponError(code, ar, en) {
  return new AppError(400, code, ar, en);
}

export function computeDiscount(coupon, subtotal) {
  if (coupon.discountType === 'fixed') {
    return Math.min(coupon.value, subtotal);
  }
  const raw = (subtotal * coupon.value) / 100;
  const capped = coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw;
  return Math.min(Math.round(capped * 100) / 100, subtotal);
}

// Every eligibility rule in one place. Throws a bilingual, understandable
// error per rule (doc 13.3: "understandable errors").
export async function validateCouponForUser(code, user, subtotal) {
  const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase().trim() });
  if (!coupon || !coupon.isActive) {
    throw couponError('COUPON_INVALID', 'الكوبون ده مش موجود', 'This coupon is not valid');
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    throw couponError('COUPON_NOT_STARTED', 'الكوبون ده لسه ما بدأش', 'This coupon has not started yet');
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    throw couponError('COUPON_EXPIRED', 'الكوبون ده خلص', 'This coupon has expired');
  }
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw couponError(
      'COUPON_MIN_ORDER',
      `الكوبون ده محتاج طلب بـ ${coupon.minOrderAmount} ج.م على الأقل`,
      `This coupon needs an order of at least ${coupon.minOrderAmount} EGP`
    );
  }
  if (coupon.usageLimitGlobal && coupon.usedCount >= coupon.usageLimitGlobal) {
    throw couponError('COUPON_EXHAUSTED', 'الكوبون ده استُخدم لأقصى حد', 'This coupon is fully used');
  }
  if (coupon.usageLimitPerUser) {
    const mine = await CouponUsage.countDocuments({ coupon: coupon._id, user: user._id });
    if (mine >= coupon.usageLimitPerUser) {
      throw couponError('COUPON_USER_LIMIT', 'استخدمت الكوبون ده قبل كده', 'You have already used this coupon');
    }
  }
  return { coupon, discount: computeDiscount(coupon, subtotal) };
}

// Record the use atomically with the order (doc 13.3): a conditional
// increment claims one slot only while the coupon is still under its global
// limit, so concurrent checkouts cannot push usedCount past the limit. The
// ledger row's unique (coupon, order) index blocks a duplicate record for
// the same order. Per-user limits at café scale are guarded by the
// count-then-claim check above plus this index - documented in
// CONVENTIONS.md as the deliberate non-transactional choice.
export async function recordUsage(coupon, userId, orderId, discountAmount) {
  if (coupon.usageLimitGlobal) {
    const claimed = await Coupon.findOneAndUpdate(
      { _id: coupon._id, usedCount: { $lt: coupon.usageLimitGlobal } },
      { $inc: { usedCount: 1 } },
      { new: true }
    );
    if (!claimed) {
      throw couponError('COUPON_EXHAUSTED', 'الكوبون ده استُخدم لأقصى حد', 'This coupon is fully used');
    }
  } else {
    await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
  }
  await CouponUsage.create({ coupon: coupon._id, user: userId, order: orderId, discountAmount });
}

// --- Admin management ---

export async function listCoupons({ search, active } = {}) {
  const filter = {};
  if (active === 'true') filter.isActive = true;
  if (active === 'false') filter.isActive = false;
  if (search) filter.code = new RegExp(String(search).trim().toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return Coupon.find(filter).sort({ createdAt: -1 }).limit(100).lean();
}

export async function createCoupon(body) {
  const { code, discountType, value } = body || {};
  if (!code || !discountType || value === undefined) {
    throw couponError('VALIDATION', 'الكود ونوع الخصم والقيمة مطلوبين', 'Code, discount type and value are required');
  }
  if (discountType === 'percentage' && (Number(value) <= 0 || Number(value) > 100)) {
    throw couponError('VALIDATION', 'النسبة لازم تكون بين 1 و 100', 'Percentage must be between 1 and 100');
  }
  try {
    return await Coupon.create({
      code,
      description: body.description?.trim(),
      discountType,
      value: Number(value),
      minOrderAmount: Number(body.minOrderAmount) || 0,
      maxDiscountAmount: body.maxDiscountAmount ? Number(body.maxDiscountAmount) : undefined,
      usageLimitGlobal: body.usageLimitGlobal ? Number(body.usageLimitGlobal) : undefined,
      usageLimitPerUser: body.usageLimitPerUser ? Number(body.usageLimitPerUser) : undefined,
      startsAt: body.startsAt || undefined,
      expiresAt: body.expiresAt || undefined,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, 'COUPON_EXISTS', 'الكود ده موجود قبل كده', 'This code already exists');
    }
    throw err;
  }
}

// Edit/deactivate. Delete is deliberately absent: a coupon with usage
// history must stay for the ledger to make sense - deactivate instead
// (documented lean call).
export async function updateCoupon(id, body) {
  const coupon = await Coupon.findById(id);
  if (!coupon) throw new AppError(404, 'COUPON_NOT_FOUND', 'الكوبون ده مش موجود', 'Coupon not found');
  const fields = ['description', 'value', 'minOrderAmount', 'maxDiscountAmount', 'usageLimitGlobal', 'usageLimitPerUser', 'startsAt', 'expiresAt', 'isActive'];
  for (const field of fields) {
    if (body[field] !== undefined) coupon[field] = body[field];
  }
  await coupon.save();
  return coupon;
}
