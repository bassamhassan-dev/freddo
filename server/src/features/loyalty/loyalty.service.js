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
