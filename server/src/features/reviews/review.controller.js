import * as service from './review.service.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const createReview = catchAsync(async (req, res) => {
  const review = await service.upsertReview(req.user, req.body || {});
  res.status(201).json({ success: true, data: { review } });
});

export const listReviews = catchAsync(async (req, res) => {
  const data = await service.listVisibleReviews({
    targetType: req.query.target || 'product',
    productSlug: req.query.product,
  });
  res.json({ success: true, data });
});

export const adminListReviews = catchAsync(async (req, res) => {
  const reviews = await service.listAllReviews({ visible: req.query.visible });
  res.json({ success: true, data: { reviews } });
});

export const adminSetVisibility = catchAsync(async (req, res) => {
  const review = await service.setReviewVisibility(req.params.id, req.body?.isVisible);
  res.json({ success: true, data: { review } });
});
