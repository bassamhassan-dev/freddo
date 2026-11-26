import Order from '../orders/order.model.js';
import MenuItem from '../menu/menuItem.model.js';
import { applyTransition } from '../orders/order.service.js';
import { ORDER_STATUSES } from '../orders/order.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';

// The admin workspace API. Everything here sits behind requireRole('admin')
// at the router level - these handlers assume the role was already checked.

// GET /api/admin/orders?status=<status>&page=<n> - the orders board.
// Newest first, 20 per page: enough for a single-branch café board without
// turning the handler into a search engine.
export const listOrders = catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (typeof status === 'string' && status !== '') {
    if (!ORDER_STATUSES.includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'حالة الطلب دي مش موجودة', 'Unknown order status');
    }
    filter.status = status;
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = 20;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).lean(),
    Order.countDocuments(filter),
  ]);
  sendSuccess(res, 200, { orders, total, page, pages: Math.ceil(total / perPage) || 1 });
});

// POST /api/admin/orders/:id/status { to } - moves an order through the
// same validated transition function the customer flow uses. One machine,
// two drivers.
export const setOrderStatus = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'الطلب ده مش موجود', 'This order does not exist');
  }
  const updated = await applyTransition(order, req.body?.to, req.user._id);
  sendSuccess(res, 200, { order: updated });
});

// GET /api/admin/menu - every item including unavailable ones, so the
// admin can toggle them back on.
export const listMenu = catchAsync(async (req, res) => {
  const items = await MenuItem.find({}).sort({ sortOrder: 1, 'name.en': 1 }).lean();
  sendSuccess(res, 200, { items });
});

// PATCH /api/admin/menu/:id/availability { isAvailable } - the one v1
// catalog mutation: taking an item off the board (and back).
export const setAvailability = catchAsync(async (req, res) => {
  const { isAvailable } = req.body || {};
  if (typeof isAvailable !== 'boolean') {
    throw new AppError(400, 'VALIDATION_ERROR', 'ابعت isAvailable true أو false', 'Send isAvailable as true or false');
  }
  const item = await MenuItem.findByIdAndUpdate(
    req.params.id,
    { isAvailable },
    { new: true }
  );
  if (!item) {
    throw new AppError(404, 'ITEM_NOT_FOUND', 'الصنف ده مش موجود', 'This item does not exist');
  }
  sendSuccess(res, 200, { item: item.toPublicJSON(), isAvailable: item.isAvailable });
});
