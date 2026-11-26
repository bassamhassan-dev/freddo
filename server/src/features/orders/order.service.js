import crypto from 'node:crypto';
import Order, { ORDER_TRANSITIONS } from './order.model.js';
import MenuItem from '../menu/menuItem.model.js';
import * as couponService from '../coupons/coupon.service.js';
import { AppError } from '../../utils/AppError.js';
import { awardForCompletedOrder, loyaltyDiscountFor, redeemForOrder, refundForCancelledOrder } from '../loyalty/loyalty.service.js';
import { sendOrderConfirmationEmail } from '../../services/mail.service.js';

// The order business rules. The single most important one (doc 8.5/9.4):
// the client sends only slugs, ids and quantities - NEVER prices. Every
// price below is read from the catalog at order time, so nothing the
// browser says can change what an order costs.

const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 30;

// Short, unique, counter-friendly order numbers: FR- plus 6 chars from a
// cryptographic random. The unique index catches the (astronomically
// unlikely) collision and we retry once.
function makeOrderNumber() {
  return `FR-${crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;
}

function badRequest(code, ar, en) {
  return new AppError(400, code, ar, en);
}

// Re-prices one requested line against the live catalog. Anything missing
// or unavailable is an error with the item named, not a silently dropped
// line.
async function priceLine(requested) {
  if (!requested || typeof requested !== 'object') throw badRequest('VALIDATION_ERROR', 'في صنف مش مظبوط في الطلب', 'An item in the order is malformed');
  const { slug, variantId, addOnIds = [], qty, notes } = requested;
  if (typeof slug !== 'string') throw badRequest('VALIDATION_ERROR', 'في صنف مش مظبوط في الطلب', 'An item in the order is malformed');
  const quantity = Number(qty);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
    throw badRequest('INVALID_QTY', `الكمية لازم تكون من 1 لـ ${MAX_QTY_PER_LINE}`, `Quantity must be between 1 and ${MAX_QTY_PER_LINE}`);
  }

  const product = await MenuItem.findOne({ slug: slug.toLowerCase() });
  if (!product || !product.isAvailable) {
    throw new AppError(409, 'ITEM_UNAVAILABLE', `«${slug}» مش متاح دلوقتي`, `"${slug}" is not available right now`);
  }

  // Variant: by embedded _id. An item with variants requires the choice.
  let unitPrice = product.basePrice;
  let variantLabel = null;
  if (product.variants.length > 0) {
    const variant = product.variants.id(variantId);
    if (!variant || !variant.isAvailable) {
      throw badRequest('INVALID_VARIANT', `اختار حجم لـ «${product.name.ar}»`, `Choose a size for "${product.name.en}"`);
    }
    unitPrice = variant.price;
    variantLabel = variant.label;
  }

  const addOns = [];
  for (const addOnId of addOnIds) {
    const addOn = product.addOns.id(addOnId);
    if (!addOn || !addOn.isAvailable) {
      throw badRequest('INVALID_ADDON', `إضافة مش متاحة لـ «${product.name.ar}»`, `An add-on is not available for "${product.name.en}"`);
    }
    addOns.push({ name: addOn.name, price: addOn.price });
    unitPrice += addOn.price;
  }

  return {
    product: product._id,
    name: product.name,
    image: product.images?.[0]?.url,
    isDrink: product.isDrink === true,
    variantLabel,
    addOns,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 300) : '',
    unitPrice,
    qty: quantity,
    lineTotal: unitPrice * quantity,
  };
}

export async function createOrder(user, { phone, notes, lines, idempotencyKey, couponCode, redeemPoints, fulfillmentType, deliveryAddress }) {
  // Sprint 33: ordering requires a verified email. Browsing and cart are
  // open to everyone; the gate sits here so it cannot be skipped from the
  // client. OAuth users are verified by the provider, seeded/demo users
  // are verified at seed time.
  if (user.role === 'customer' && !user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'أكد إيميلك الأول من اللينك اللي اتبعتلك عشان تقدر تطلب', 'Confirm your email from the link we sent you before ordering');
  }
  const fulfillment = fulfillmentType === 'delivery' ? 'delivery' : 'pickup';
  const address = typeof deliveryAddress === 'string' ? deliveryAddress.trim().slice(0, 300) : '';
  if (fulfillment === 'delivery' && address.length < 5) {
    throw badRequest('ADDRESS_REQUIRED', 'اكتب عنوان التوصيل', 'Enter the delivery address');
  }
  if (typeof phone !== 'string' || !/^\+?[0-9\s-]{7,16}$/.test(phone.trim())) {
    throw badRequest('INVALID_PHONE', 'اكتب رقم موبايل صحيح', 'Enter a valid phone number');
  }
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES) {
    throw badRequest('EMPTY_ORDER', 'السلة فاضية', 'The cart is empty');
  }

  // Idempotency: a retried submit with the same key returns the first
  // order instead of placing it twice.
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey: String(idempotencyKey) });
    if (existing) return { order: existing, replayed: true };
  }

  const items = await Promise.all(lines.map(priceLine));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  // Coupon (doc 13.3): validated and priced here, server-side, against the
  // freshly computed subtotal. The client's discount amount is never read.
  let coupon = null;
  let discount = 0;
  if (couponCode) {
    const result = await couponService.validateCouponForUser(couponCode, user, subtotal);
    coupon = result.coupon;
    discount = result.discount;
  }

  // Loyalty redemption: the client asks with redeemPoints, the server
  // decides what it is worth - one free drink (cheapest drink unit), and
  // only if the cart actually has a drink.
  let loyaltyDiscount = 0;
  if (redeemPoints) {
    loyaltyDiscount = loyaltyDiscountFor(items);
    if (loyaltyDiscount === 0) {
      throw badRequest('NO_ELIGIBLE_DRINK', 'المشروب المجاني بيتحط على مشروب بس - مفيش مشروبات في السلة', 'The free drink applies to drinks only - there are no drinks in the cart');
    }
  }

  const build = () => ({
    orderNumber: makeOrderNumber(),
    user: user._id,
    items,
    subtotal,
    discount,
    loyaltyDiscount,
    total: subtotal - discount - loyaltyDiscount,
    couponCode: coupon ? coupon.code : undefined,
    customer: { name: user.name, phone: phone.trim() },
    fulfillmentType: fulfillment,
    deliveryAddress: fulfillment === 'delivery' ? address : undefined,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
    idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
    statusHistory: [{ from: 'none', to: 'pending', by: user._id }],
  });

  try {
    const order = await Order.create(build());
    if (loyaltyDiscount > 0) {
      try {
        await redeemForOrder(user._id, order);
      } catch (err) {
        // Points could not be spent (balance race): the order must not
        // stand with a discount nobody paid for.
        await Order.deleteOne({ _id: order._id });
        throw err;
      }
    }
    if (coupon) {
      // The use is claimed after the order exists. A claim can only fail
      // in a razor-thin race (limit hit between validation and here); the
      // order then stands with its discount honored and the claim error is
      // swallowed - a failed coupon write must never orphan a valid order.
      // Documented lean choice in CONVENTIONS.md.
      try {
        await couponService.recordUsage(coupon, user._id, order._id, discount);
      } catch {
        // see comment above
      }
    }
    // Order-confirmation email (Sprint 33). Awaiting keeps tests
    // deterministic; sendMailSafe swallows transport errors, so a mail
    // outage can never fail a placed order.
    await sendOrderConfirmationEmail(user, order);
    return { order, replayed: false };
  } catch (err) {
    if (err.code === 11000 && err.message.includes('orderNumber')) {
      const order = await Order.create(build()); // one retry on number collision
      await sendOrderConfirmationEmail(user, order);
      return { order, replayed: false };
    }
    if (err.code === 11000 && err.message.includes('idempotencyKey')) {
      // Concurrent duplicate submit: the other request won.
      const existing = await Order.findOne({ idempotencyKey: String(idempotencyKey) });
      return { order: existing, replayed: true };
    }
    throw err;
  }
}

export async function listMyOrders(userId) {
  return Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
}

export async function getOrderForUser(orderId, user) {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'الطلب ده مش موجود', 'This order does not exist');
  }
  const isOwner = order.user.toString() === user._id.toString();
  if (!isOwner && user.role !== 'admin') {
    // Same 404 as a missing order: the API does not reveal other people's
    // order ids exist.
    throw new AppError(404, 'ORDER_NOT_FOUND', 'الطلب ده مش موجود', 'This order does not exist');
  }
  return order;
}

// Customer cancellation (open decision #7 answered for v1, documented):
// the customer can cancel only while the order is still pending - before
// the kitchen committed to it.
export async function cancelMyOrder(orderId, user) {
  const order = await Order.findById(orderId);
  if (!order || order.user.toString() !== user._id.toString()) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'الطلب ده مش موجود', 'This order does not exist');
  }
  if (order.status !== 'pending') {
    throw new AppError(409, 'CANNOT_CANCEL', 'الطلب اتأكد بالفعل ومش ممكن يتلغي', 'The order is already confirmed and can no longer be cancelled');
  }
  return applyTransition(order, 'cancelled', user._id);
}

// The one place status moves: validates the transition, records history.
export async function applyTransition(order, nextStatus, actorId) {
  if (typeof nextStatus !== 'string' || !Object.hasOwn(ORDER_TRANSITIONS, nextStatus)) {
    throw badRequest('VALIDATION_ERROR', 'الحالة الجديدة مش صحيحة', 'The new status is not valid');
  }
  const allowed = ORDER_TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(409, 'INVALID_TRANSITION', `مينفعش الطلب يروح من ${order.status} لـ ${nextStatus}`, `The order cannot go from ${order.status} to ${nextStatus}`);
  }
  order.statusHistory.push({ from: order.status, to: nextStatus, by: actorId });
  order.status = nextStatus;
  if (nextStatus === 'completed') order.completedAt = new Date();
  if (nextStatus === 'cancelled') order.cancelledAt = new Date();
  await order.save();
  if (nextStatus === 'completed') await awardForCompletedOrder(order);
  if (nextStatus === 'cancelled') await refundForCancelledOrder(order);
  return order;
}
