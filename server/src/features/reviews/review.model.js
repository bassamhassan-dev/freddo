import mongoose from 'mongoose';

// One Review collection covers both targets (requirements doc 12): product
// reviews carry `product`, cafe reviews leave it null. The unique index on
// (user, targetType, product) enforces the chosen duplicate policy - one
// review per customer per product, and one cafe review per customer - while
// Mongo treats the null product of a cafe review as its own key.
const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['product', 'cafe'], required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 1000 },
    // Computed from order records at write time, never trusted from the
    // client (doc 12).
    isVerifiedPurchase: { type: Boolean, default: false },
    // Moderation: hidden reviews stay in the database, visible to admin
    // only, and stop counting toward the product rating.
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, targetType: 1, product: 1 }, { unique: true });
reviewSchema.index({ targetType: 1, product: 1, isVisible: 1, createdAt: -1 });

reviewSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    authorName: this.user?.name,
    rating: this.rating,
    comment: this.comment,
    isVerifiedPurchase: this.isVerifiedPurchase,
    createdAt: this.createdAt,
  };
};

const Review = mongoose.model('Review', reviewSchema);
export default Review;
