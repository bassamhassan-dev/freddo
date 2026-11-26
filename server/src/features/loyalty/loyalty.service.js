import LoyaltyAccount from './loyaltyAccount.model.js';
import { AppError } from '../../utils/AppError.js';
import LoyaltyTransaction from './loyaltyTransaction.model.js';

// Loyalty rules (doc 14). Points are earned only when an order reaches
// completed - never at placement. The rate is an open decision in the doc,
// so it lives here as one named constant: 1 point per 10 EGP of the paid
// total, rounded down. Redemption is not built (rewards undecided).
export const EGP_PER_POINT = 10;

// Called from the order transition path. Idempotent: the unique ledger
// index on (order, 'earn') makes a second award for the same order a
// no-op, and the account update only happens after the ledger row lands.
export async function awardForCompletedOrder(order) {
  if (!order.user) return null; // guest orders earn nothing - no account to hold points
  const points = Math.floor(order.total / EGP_PER_POINT);
  if (points <= 0) return null;

  const account = await LoyaltyAccount.findOneAndUpdate(
    { user: order.user },
    { $inc: { balance: points, lifetimeEarned: points }, $setOnInsert: { user: order.user } },
    { new: true, upsert: true }
  );

  try {
    return await LoyaltyTransaction.create({
      user: order.user,
      type: 'earn',
      points,
      balanceAfter: account.balance,
      order: order._id,
      description: `Order ${order.orderNumber}`,
    });
  } catch (err) {
    if (err.code === 11000) {
      // The ledger already has this order's award: roll the balance bump
      // back so account and ledger never disagree.
      await LoyaltyAccount.updateOne(
        { user: order.user },
        { $inc: { balance: -points, lifetimeEarned: -points } }
      );
      return null;
    }
    throw err;
  }
}

export async function getMyLoyalty(userId) {
  const account = await LoyaltyAccount.findOne({ user: userId }).lean();
  const transactions = await LoyaltyTransaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return {
    balance: account?.balance || 0,
    lifetimeEarned: account?.lifetimeEarned || 0,
    egpPerPoint: EGP_PER_POINT,
    transactions,
  };
}

// Admin adjustment (doc 14.1 'adjustment' type): corrects mistakes with a
// mandatory reason, never below zero balance.
export async function adjust(userId, points, description) {
  const amount = Number(points);
  if (!Number.isInteger(amount) || amount === 0) {
    throw new AppError(400, 'VALIDATION', 'النقاط لازم تكون رقم صحيح مش صفر', 'Points must be a non-zero integer');
  }
  const account = await LoyaltyAccount.findOneAndUpdate(
    { user: userId, ...(amount < 0 ? { balance: { $gte: -amount } } : {}) },
    { $inc: { balance: amount }, $setOnInsert: { user: userId } },
    { new: true, upsert: amount > 0 }
  );
  if (!account) {
    throw new AppError(400, 'INSUFFICIENT_POINTS', 'الرصيد مش كفاية', 'Insufficient balance');
  }
  return LoyaltyTransaction.create({
    user: userId,
    type: 'adjustment',
    points: amount,
    balanceAfter: account.balance,
    description: String(description || '').trim().slice(0, 200),
  });
}

// Redemption (doc 14, Bassam's decision): 100 points = one free drink at
// checkout. DRINK ONLY, enforced server-side from the item's isDrink flag -
// a cheaper dessert in the cart is never the comped line. Documented
// defaults, flagged for confirmation: one redemption per order, and the
// comped unit is the cheapest drink unit as ordered (size and add-ons
// included in its price).
export const REDEEM_POINTS = 100;

export function loyaltyDiscountFor(items) {
  const drinkPrices = items.filter((i) => i.isDrink).map((i) => i.unitPrice);
  if (drinkPrices.length === 0) return 0;
  return Math.min(...drinkPrices);
}

// Spends the points after the order exists. The (order, 'redeem') unique
// index makes a double-spend for the same order impossible; the balance
// guard makes spending below zero impossible.
export async function redeemForOrder(userId, order) {
  const account = await LoyaltyAccount.findOneAndUpdate(
    { user: userId, balance: { $gte: REDEEM_POINTS } },
    { $inc: { balance: -REDEEM_POINTS } },
    { new: true }
  );
  if (!account) {
    throw new AppError(400, 'INSUFFICIENT_POINTS', 'رصيد النقاط مش كفاية (محتاج 100 نقطة)', 'Not enough points (100 required)');
  }
  try {
    return await LoyaltyTransaction.create({
      user: userId,
      type: 'redeem',
      points: -REDEEM_POINTS,
      balanceAfter: account.balance,
      order: order._id,
      description: `Free drink - order ${order.orderNumber}`,
    });
  } catch (err) {
    if (err.code === 11000) {
      await LoyaltyAccount.updateOne({ user: userId }, { $inc: { balance: REDEEM_POINTS } });
      return null;
    }
    throw err;
  }
}

// A cancelled order that spent points gives them back, exactly once (the
// (order, 'refund') unique index is the guard).
export async function refundForCancelledOrder(order) {
  if (!order.user || !(order.loyaltyDiscount > 0)) return null;
  const account = await LoyaltyAccount.findOneAndUpdate(
    { user: order.user },
    { $inc: { balance: REDEEM_POINTS }, $setOnInsert: { user: order.user } },
    { new: true, upsert: true }
  );
  try {
    return await LoyaltyTransaction.create({
      user: order.user,
      type: 'refund',
      points: REDEEM_POINTS,
      balanceAfter: account.balance,
      order: order._id,
      description: `Refund - cancelled order ${order.orderNumber}`,
    });
  } catch (err) {
    if (err.code === 11000) {
      await LoyaltyAccount.updateOne({ user: order.user }, { $inc: { balance: -REDEEM_POINTS } });
      return null;
    }
    throw err;
  }
}
