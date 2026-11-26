import Review from './review.model.js';
import MenuItem from '../menu/menuItem.model.js';
import Order from '../orders/order.model.js';
import { AppError } from '../../utils/AppError.js';

// Reviews (doc 12): customers review products or the cafe. One review per
// customer per target, editable - writing your review again updates it.

// Create or update the caller's review. Verified purchase is computed here
// from completed orders, never accepted from the request body.
export async function upsertReview(user, { targetType, productSlug, rating, comment }) {
  if (!['product', 'cafe'].includes(targetType)) {
    throw new AppError(400, 'VALIDATION', 'نوع التقييم ده مش موجود', 'Unknown review target');
  }
  const ratingNumber = Number(rating);
  if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
    throw new AppError(400, 'VALIDATION', 'التقييم لازم يكون من 1 لـ 5', 'Rating must be between 1 and 5');
  }
  if (!comment || comment.trim().length < 3 || comment.trim().length > 1000) {
    throw new AppError(400, 'VALIDATION', 'الكومنت لازم يكون بين 3 و 1000 حرف', 'Comment must be 3-1000 characters');
  }

  let product = null;
  if (targetType === 'product') {
    product = await MenuItem.findOne({ slug: String(productSlug || '').toLowerCase() });
    if (!product) {
      throw new AppError(404, 'ITEM_NOT_FOUND', 'الصنف ده مش موجود', 'This item does not exist');
    }
  }

  const isVerifiedPurchase = product
    ? Boolean(
        // Only completed orders verify a purchase (doc 12) - a cancelled or
        // in-flight one proves nothing.
        await Order.exists({
          user: user._id,
          status: 'completed',
          'items.product': product._id,
        })
      )
    : false;

  const review = await Review.findOneAndUpdate(
    { user: user._id, targetType, product: product?._id ?? null },
    {
      $set: {
        rating: ratingNumber,
        comment: comment.trim(),
        isVerifiedPurchase,
        // An edited review becomes visible again only if it was never
        // moderated; a hidden one stays hidden (admin restores it).
      },
      $setOnInsert: { isVisible: true },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (product) await recomputeProductRating(product._id);
  return review.toPublicJSON();
}

// Public list: visible reviews only, newest first, plus the live summary.
export async function listVisibleReviews({ targetType, productSlug }) {
  const filter = { targetType, isVisible: true };
  let product = null;
  if (targetType === 'product') {
    product = await MenuItem.findOne({ slug: String(productSlug || '').toLowerCase() });
    if (!product) throw new AppError(404, 'ITEM_NOT_FOUND', 'الصنف ده مش موجود', 'This item does not exist');
    filter.product = product._id;
  } else {
    filter.product = null;
  }

  const reviews = await Review.find(filter).populate('user', 'name').sort({ createdAt: -1 }).limit(50);
  const summary = product
    ? { average: product.rating.average, count: product.rating.count }
    : await computeCafeSummary();
  return { reviews: reviews.map((r) => r.toPublicJSON()), summary };
}

// Admin moderation list: everything, filterable by visibility.
export async function listAllReviews({ visible } = {}) {
  const filter = {};
  if (visible === 'true') filter.isVisible = true;
  if (visible === 'false') filter.isVisible = false;
  const reviews = await Review.find(filter)
    .populate('user', 'name email')
    .populate('product', 'name slug')
    .sort({ createdAt: -1 })
    .limit(100);
  return reviews.map((r) => ({
    ...r.toPublicJSON(),
    authorEmail: r.user?.email,
    targetType: r.targetType,
    productSlug: r.product?.slug,
    productName: r.product?.name,
    isVisible: r.isVisible,
  }));
}

// Hide or restore. The product rating always recomputes from what is
// visible afterwards, so moderation and the public summary never disagree.
export async function setReviewVisibility(id, isVisible) {
  const review = await Review.findById(id);
  if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'التقييم ده مش موجود', 'Review not found');
  review.isVisible = Boolean(isVisible);
  await review.save();
  if (review.product) await recomputeProductRating(review.product);
  return { id: review._id, isVisible: review.isVisible };
}

// The product's stored rating is a cache of its visible reviews, rewritten
// on every change that could affect it (create, edit, hide, restore).
async function recomputeProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: productId, isVisible: true } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await MenuItem.updateOne(
    { _id: productId },
    {
      $set: {
        'rating.average': stats ? Math.round(stats.average * 10) / 10 : 0,
        'rating.count': stats ? stats.count : 0,
      },
    }
  );
}

async function computeCafeSummary() {
  const [stats] = await Review.aggregate([
    { $match: { targetType: 'cafe', isVisible: true } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return {
    average: stats ? Math.round(stats.average * 10) / 10 : 0,
    count: stats ? stats.count : 0,
  };
}
