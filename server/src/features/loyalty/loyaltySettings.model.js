import mongoose from 'mongoose';

// Admin-editable loyalty rules (Sprint 36): one singleton document.
// earnPercent: points earned = this percent of the paid order total
// (10 means 1 point per 10 EGP). redeemPoints: points that buy one free
// drink. Absent document = the defaults below, so nothing needs seeding.
export const DEFAULT_EARN_PERCENT = 10;
export const DEFAULT_REDEEM_POINTS = 100;

const schema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true },
    earnPercent: { type: Number, default: DEFAULT_EARN_PERCENT, min: 1, max: 100 },
    redeemPoints: { type: Number, default: DEFAULT_REDEEM_POINTS, min: 10, max: 10000 },
  },
  { timestamps: true }
);

export default mongoose.model('LoyaltySettings', schema);
