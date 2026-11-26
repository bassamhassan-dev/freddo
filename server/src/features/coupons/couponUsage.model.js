import mongoose from 'mongoose';

// The usage ledger (doc 13.2): one row per coupon use, written in the same
// request that creates the order. The unique (coupon, order) pair makes a
// double-write on the same order impossible.
const couponUsageSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    discountAmount: { type: Number, required: true, min: 0 },
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

couponUsageSchema.index({ coupon: 1, order: 1 }, { unique: true });
couponUsageSchema.index({ coupon: 1, user: 1 });

const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);
export default CouponUsage;
