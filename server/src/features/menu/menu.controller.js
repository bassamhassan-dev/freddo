import * as menuService from './menu.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';

// Controllers are the HTTP edge of the feature: read and clean the request,
// call the service, shape the response. No business rules here.
// catchAsync means no try/catch ever appears in a controller again.

// GET /api/menu?category=<slug>
export const getMenu = catchAsync(async (req, res) => {
  const raw = req.query.category;
  const category = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
  const items = await menuService.listAvailableItems({ category });
  sendSuccess(res, 200, { items });
});

// GET /api/menu/:slug
export const getMenuItem = catchAsync(async (req, res) => {
  const item = await menuService.getAvailableItemBySlug(req.params.slug);
  sendSuccess(res, 200, { item });
});
