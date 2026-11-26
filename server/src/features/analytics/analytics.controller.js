import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { getDashboard } from './analytics.service.js';

// GET /api/admin/analytics?from&to - the operational dashboard (doc 15).
export const dashboard = catchAsync(async (req, res) => {
  const { from, to } = req.query;
  if ((from && Number.isNaN(Date.parse(from))) || (to && Number.isNaN(Date.parse(to)))) {
    throw new AppError(400, 'VALIDATION', 'صيغة التاريخ مش صحيحة', 'Invalid date format');
  }
  if (from && to && new Date(to) < new Date(from)) {
    throw new AppError(400, 'VALIDATION', 'الفترة مش صحيحة', 'The date range is invalid');
  }
  sendSuccess(res, 200, await getDashboard({ from, to }));
});
