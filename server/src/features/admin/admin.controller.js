import Order from '../orders/order.model.js';
import MenuItem from '../menu/menuItem.model.js';
import { deleteImage } from '../uploads/cloudinary.service.js';
import Table from '../reservations/table.model.js';
import { applyTransition } from '../orders/order.service.js';
import { ORDER_STATUSES } from '../orders/order.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import * as accountService from './account.service.js';

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

// PUT /api/admin/menu/:id/recipe - write the internal recipe the barista
// sees (doc 7.2/7.4): bilingual ingredients, steps and optional notes, plus
// the visibility toggle. Replaces the whole recipe in one shot.
export const setMenuRecipe = catchAsync(async (req, res) => {
  const body = req.body || {};
  const fail = () => {
    throw new AppError(400, 'VALIDATION_ERROR', 'بيانات الوصفة مش مكتملة', 'Invalid recipe payload');
  };
  if (!Array.isArray(body.ingredients) || !body.ingredients.length || body.ingredients.length > 30) fail();
  if (!Array.isArray(body.steps) || !body.steps.length || body.steps.length > 30) fail();
  for (const ing of body.ingredients) {
    if (!ing?.name?.ar?.trim() || !ing?.name?.en?.trim()) fail();
    if (typeof ing.quantity !== 'number' || !(ing.quantity > 0)) fail();
    if (typeof ing.unit !== 'string' || !ing.unit.trim() || ing.unit.length > 20) fail();
  }
  for (const step of body.steps) {
    if (!step?.ar?.trim() || !step?.en?.trim()) fail();
  }
  const recipe = {
    ingredients: body.ingredients.map((ing) => ({
      name: { ar: ing.name.ar.trim(), en: ing.name.en.trim() },
      quantity: ing.quantity,
      unit: ing.unit.trim(),
    })),
    steps: body.steps.map((step) => ({ ar: step.ar.trim(), en: step.en.trim() })),
    isVisible: body.isVisible !== false, // default: visible to baristas
  };
  if (body.notes?.ar?.trim() && body.notes?.en?.trim()) {
    recipe.notes = { ar: body.notes.ar.trim(), en: body.notes.en.trim() };
  }
  const item = await MenuItem.findByIdAndUpdate(req.params.id, { recipe }, { new: true });
  if (!item) {
    throw new AppError(404, 'ITEM_NOT_FOUND', 'الصنف ده مش موجود', 'This item does not exist');
  }
  sendSuccess(res, 200, { item });
});

// --- Account management (doc 3.7) ---

export const listAccounts = catchAsync(async (req, res) => {
  const data = await accountService.listAccounts(req.query);
  res.json({ success: true, data });
});

export const createAccount = catchAsync(async (req, res) => {
  const { name, email, phone, role } = req.body || {};
  if (!name?.trim() || !email?.trim() || !role) {
    throw new AppError(400, 'VALIDATION', 'الاسم والإيميل والدور مطلوبين', 'Name, email and role are required');
  }
  const data = await accountService.createStaffAccount({ name, email, phone, role });
  res.status(201).json({ success: true, data });
});

export const setAccountStatus = catchAsync(async (req, res) => {
  const data = await accountService.setAccountActive(req.user, req.params.id, req.body?.isActive);
  res.json({ success: true, data: { account: data } });
});

export const setAccountRole = catchAsync(async (req, res) => {
  const data = await accountService.changeAccountRole(req.user, req.params.id, req.body?.role);
  res.json({ success: true, data: { account: data } });
});

// GET /api/admin/tables - active tables for the reservation assignment
// dropdown. Tables are seed-managed (documented lean call).
export const listTables = catchAsync(async (req, res) => {
  const tables = await Table.find({ isActive: true }).sort({ capacity: 1, number: 1 }).lean();
  res.json({ success: true, data: { tables } });
});

// PATCH /api/admin/menu/:id/image { url } - point an item at a new image.
// Accepts an https URL (a Cloudinary upload) or a site-relative path served
// by the client (/menu/x.svg). When the old image was a Cloudinary asset it
// is deleted so the account does not fill with orphans.
export const setMenuImage = catchAsync(async (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== 'string' || url.length > 2000 ||
      !(/^https:\/\/.+/.test(url) || /^\/[A-Za-z0-9][\w./-]*$/.test(url))) {
    return res.status(400).json({
      success: false,
      error: { code: 'IMAGE_URL_INVALID', message: { ar: 'رابط الصورة غير صالح', en: 'Invalid image URL' } },
    });
  }
  const item = await MenuItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({
      success: false,
      error: { code: 'ITEM_NOT_FOUND', message: { ar: 'الصنف غير موجود', en: 'Item not found' } },
    });
  }
  const previous = item.images?.[0];
  item.images = [{ url, alt: item.name }];
  await item.save();
  // Cleanup is best-effort: the image is already swapped, a failed
  // Cloudinary delete should not roll it back.
  if (previous?.storageId) await deleteImage(previous.storageId).catch(() => {});
  res.json({ success: true, data: { item } });
});
