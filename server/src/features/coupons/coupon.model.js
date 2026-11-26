import mongoose from 'mongoose';

// Coupons (requirements doc 13.1). Codes normalize to uppercase so
// "FREDDO10" and "freddo10" are the same coupon.
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9_-]{3,24}$/,
    },
    description: { type: String, trim: true, maxlength: 200 },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    // Caps percentage discounts (doc 13.1); ignored for fixed ones.
    maxDiscountAmount: { type: Number, min: 0 },
    usageLimitGlobal: { type: Number, min: 1 },
    usageLimitPerUser: { type: Number, min: 1 },
    // Atomic counter, incremented conditionally at order time - the guard
    // against exceeding the global limit under concurrent checkouts.
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
