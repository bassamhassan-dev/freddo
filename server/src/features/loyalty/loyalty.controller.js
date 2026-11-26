import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import * as loyaltyService from './loyalty.service.js';

export const myLoyalty = catchAsync(async (req, res) => {
  sendSuccess(res, 200, await loyaltyService.getMyLoyalty(req.user._id));
});

// POST /api/loyalty/admin/adjust - the reason is mandatory so the ledger
// always explains every manual movement.
export const adjust = catchAsync(async (req, res) => {
  const { userId, points, description } = req.body || {};
  if (!userId || typeof description !== 'string' || !description.trim()) {
    throw new AppError(400, 'VALIDATION', 'بيانات التعديل ناقصة', 'Adjustment data is incomplete');
  }
  const tx = await loyaltyService.adjust(userId, points, description);
  sendSuccess(res, 201, tx);
});
