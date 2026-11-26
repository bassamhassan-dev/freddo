import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import LoyaltyAccount from '../src/features/loyalty/loyaltyAccount.model.js';
import { createOrder, applyTransition } from '../src/features/orders/order.service.js';
import { getSettings, updateSettings, getMyLoyalty } from '../src/features/loyalty/loyalty.service.js';

// Sprint 36: admin-editable loyalty rules. Defaults equal the old
// constants (10% of the order = points, 100 points = free drink).
let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await MenuItem.create({
    slug: 'ls-latte', name: { ar: 'ل', en: 'Latte' }, description: { ar: 'و', en: 'd' },
    category: { slug: 'hot', name: { ar: 'ف', en: 'c' } }, basePrice: 100, isDrink: true,
  });
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const makeUser = async (email, balance = 0) => {
  const user = await User.create({ name: 'Test', email, passwordHash: await User.hashPassword('secret123'), emailVerifiedAt: new Date() });
  if (balance) await LoyaltyAccount.create({ user: user._id, balance, lifetimeEarned: balance });
  return user;
};

test('defaults match the original rules and validation rejects bad values', async () => {
  assert.deepEqual(await getSettings(), { earnPercent: 10, redeemPoints: 100 });
  await assert.rejects(updateSettings({ earnPercent: 0, redeemPoints: 100 }));
  await assert.rejects(updateSettings({ earnPercent: 10, redeemPoints: 5 }));
  await assert.rejects(updateSettings({ earnPercent: 10.5, redeemPoints: 100 }));
});

test('earn percent and redeem threshold apply to new orders; refund returns what was spent', async () => {
  const user = await makeUser('ls1@example.com');
  const run = async (email) => {
    const { order } = await createOrder(user, { phone: '01012345678', lines: [{ slug: 'ls-latte', qty: 1 }] });
    for (const to of ['confirmed', 'preparing', 'ready', 'completed']) await applyTransition(order, to, user._id);
    return order;
  };
  await run();
  assert.equal((await getMyLoyalty(user._id)).balance, 10); // default 10% of 100

  await updateSettings({ earnPercent: 20, redeemPoints: 50 });
  await run();
  const mine = await getMyLoyalty(user._id);
  assert.equal(mine.balance, 30); // +20
  assert.equal(mine.earnPercent, 20);
  assert.equal(mine.redeemPoints, 50);

  // Redeem needs the new threshold: 30 < 50 rejected, after topping up it works.
  await assert.rejects(createOrder(user, { phone: '01012345678', lines: [{ slug: 'ls-latte', qty: 1 }], redeemPoints: true }));
  await LoyaltyAccount.updateOne({ user: user._id }, { $inc: { balance: 70 } });
  const { order } = await createOrder(user, { phone: '01012345678', lines: [{ slug: 'ls-latte', qty: 1 }], redeemPoints: true });
  assert.equal(order.total, 0);
  assert.equal((await LoyaltyAccount.findOne({ user: user._id })).balance, 50);

  // Threshold changes after the order: cancel still refunds the 50 spent.
  await updateSettings({ earnPercent: 20, redeemPoints: 200 });
  await applyTransition(order, 'cancelled', user._id);
  assert.equal((await LoyaltyAccount.findOne({ user: user._id })).balance, 100);
});
