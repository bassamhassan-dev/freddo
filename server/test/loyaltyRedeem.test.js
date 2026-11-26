import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';
import LoyaltyAccount from '../src/features/loyalty/loyaltyAccount.model.js';
import LoyaltyTransaction from '../src/features/loyalty/loyaltyTransaction.model.js';
import { createOrder, applyTransition } from '../src/features/orders/order.service.js';
import { REDEEM_POINTS } from '../src/features/loyalty/loyalty.service.js';

// Loyalty redemption (Sprint 27): 100 points = one free DRINK. Acceptance
// cases: mixed drink+dessert cart comps only the drink, a dessert-only
// cart rejects redemption, and cancellation restores points exactly once.
let mongod;

async function makeUser(email) {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Test', email, passwordHash, role: 'customer', emailVerifiedAt: new Date() });
  await LoyaltyAccount.create({ user: user._id, balance: REDEEM_POINTS, lifetimeEarned: REDEEM_POINTS });
  return user;
}

async function makeItem(slug, price, isDrink) {
  return MenuItem.create({
    slug,
    name: { ar: slug, en: slug },
    description: { ar: 'و', en: 'd' },
    category: { slug: isDrink ? 'hot-coffee' : 'desserts', name: { ar: 'ف', en: 'c' } },
    basePrice: price,
    isDrink,
    isAvailable: true,
  });
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

test('mixed cart: only the drink is comped, even when a dessert is cheaper', async () => {
  const user = await makeUser('redeem-mixed@example.com');
  await makeItem('redeem-latte', 80, true);
  await makeItem('redeem-cake', 30, false); // cheaper than the drink
  const { order } = await createOrder(user, {
    phone: '01012345678',
    lines: [
      { slug: 'redeem-latte', qty: 1 },
      { slug: 'redeem-cake', qty: 1 },
    ],
    redeemPoints: true,
  });
  assert.equal(order.loyaltyDiscount, 80); // the drink, not the 30-pound cake
  assert.equal(order.total, 30);
  const account = await LoyaltyAccount.findOne({ user: user._id });
  assert.equal(account.balance, 0);
  const ledger = await LoyaltyTransaction.findOne({ order: order._id, type: 'redeem' });
  assert.equal(ledger.points, -REDEEM_POINTS);
});

test('dessert-only cart: redemption is rejected', async () => {
  const user = await makeUser('redeem-dessert@example.com');
  await makeItem('redeem-tart', 50, false);
  await assert.rejects(
    createOrder(user, { phone: '01012345678', lines: [{ slug: 'redeem-tart', qty: 1 }], redeemPoints: true }),
    (err) => err.code === 'NO_ELIGIBLE_DRINK'
  );
  const account = await LoyaltyAccount.findOne({ user: user._id });
  assert.equal(account.balance, REDEEM_POINTS); // untouched
});

test('insufficient balance: order does not stand with the discount', async () => {
  const user = await makeUser('redeem-poor@example.com');
  await LoyaltyAccount.updateOne({ user: user._id }, { balance: 40 });
  await makeItem('redeem-mocha', 70, true);
  await assert.rejects(
    createOrder(user, { phone: '01012345678', lines: [{ slug: 'redeem-mocha', qty: 1 }], redeemPoints: true }),
    (err) => err.code === 'INSUFFICIENT_POINTS'
  );
  assert.equal(await Order.countDocuments({ user: user._id }), 0);
});

test('cancellation restores the points exactly once', async () => {
  const user = await makeUser('redeem-cancel@example.com');
  await makeItem('redeem-tea', 40, true);
  const { order } = await createOrder(user, {
    phone: '01012345678',
    lines: [{ slug: 'redeem-tea', qty: 1 }],
    redeemPoints: true,
  });
  assert.equal(order.total, 0);
  assert.equal((await LoyaltyAccount.findOne({ user: user._id })).balance, 0);

  await applyTransition(order, 'cancelled', user._id);
  assert.equal((await LoyaltyAccount.findOne({ user: user._id })).balance, REDEEM_POINTS);
  const refunds = await LoyaltyTransaction.countDocuments({ order: order._id, type: 'refund' });
  assert.equal(refunds, 1);
});

test('earn at completion counts only what was actually paid', async () => {
  const user = await makeUser('redeem-earn@example.com');
  await makeItem('redeem-spanish', 100, true);
  const { order } = await createOrder(user, {
    phone: '01012345678',
    lines: [{ slug: 'redeem-spanish', qty: 2 }],
    redeemPoints: true, // comps ONE unit: total 200 - 100 = 100
  });
  assert.equal(order.loyaltyDiscount, 100);
  assert.equal(order.total, 100);
  await applyTransition(order, 'confirmed', user._id);
  await applyTransition(order, 'preparing', user._id);
  await applyTransition(order, 'ready', user._id);
  await applyTransition(order, 'completed', user._id);
  const earn = await LoyaltyTransaction.findOne({ order: order._id, type: 'earn' });
  assert.equal(earn.points, 10); // 100 paid / 10 EGP per point
});
