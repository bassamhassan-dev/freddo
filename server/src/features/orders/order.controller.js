import * as orderService from './order.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';

// POST /api/orders - place an order from cart lines. The client sends
// slugs/ids/qty only; pricing is computed server-side from the catalog.
// The Idempotency-Key header (or body field) makes retries safe (doc 9.4).
export const create = catchAsync(async (req, res) => {
  const { phone, notes, lines, idempotencyKey, couponCode, redeemPoints, fulfillmentType, deliveryAddress } = req.body || {};
  const key = req.headers['idempotency-key'] || idempotencyKey;
  const { order, replayed } = await orderService.createOrder(req.user, {
    phone,
    notes,
    lines,
    idempotencyKey: key,
    couponCode,
    redeemPoints,
    fulfillmentType,
    deliveryAddress,
  });
  sendSuccess(res, replayed ? 200 : 201, { order });
});

// GET /api/orders/mine - the customer's own history, newest first.
export const listMine = catchAsync(async (req, res) => {
  const orders = await orderService.listMyOrders(req.user._id);
  sendSuccess(res, 200, { orders });
});

// GET /api/orders/:id - the owner (or admin) sees one order.
export const getOne = catchAsync(async (req, res) => {
  const order = await orderService.getOrderForUser(req.params.id, req.user);
  sendSuccess(res, 200, { order });
});

// POST /api/orders/:id/cancel - while the order is still pending.
export const cancel = catchAsync(async (req, res) => {
  const order = await orderService.cancelMyOrder(req.params.id, req.user);
  sendSuccess(res, 200, { order });
});
