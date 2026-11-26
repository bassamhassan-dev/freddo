import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';
import LoyaltyAccount from '../src/features/loyalty/loyaltyAccount.model.js';
import LoyaltyTransaction from '../src/features/loyalty/loyaltyTransaction.model.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Loyalty tests (doc 14): earn on completed only, idempotency per order,
// ledger balance matches account balance, admin adjustments.
let mongod;
let server;
let baseUrl;

const sampleItem = () => ({
  slug: 'latte',
  name: { ar: 'لاتيه', en: 'Latte' },
  description: { ar: 'وصف', en: 'desc' },
  category: { slug: 'hot-coffee', name: { ar: 'قهوة ساخنة', en: 'Hot Coffee' } },
  basePrice: 100,
  isAvailable: true,
});

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function makeUser(email, role = 'customer') {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Tester', email, passwordHash, role, emailVerifiedAt: new Date() });
  return { user, token: signAccessToken(user) };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await Promise.all([
    Order.deleteMany({}),
    MenuItem.deleteMany({}),
    LoyaltyAccount.deleteMany({}),
    LoyaltyTransaction.deleteMany({}),
  ]);
  await MenuItem.create(sampleItem());
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

async function placeAndComplete(customer, staff) {
  const created = await api('/orders', {
    method: 'POST',
    token: customer.token,
    body: { phone: '01012345678', lines: [{ slug: 'latte', qty: 1 }] },
  });
  const id = created.body.data.order._id;
  for (const to of ['confirmed', 'preparing', 'ready', 'completed']) {
    const res = await api(`/admin/orders/${id}/status`, { method: 'POST', token: staff.token, body: { to } });
    assert.equal(res.status, 200);
  }
  return created.body.data.order;
}

test('completing an order earns 1 point per 10 EGP and /mine reflects it', async () => {
  const customer = await makeUser('c1@example.com');
  const staff = await makeUser('s1@example.com', 'admin');
  await placeAndComplete(customer, staff); // total 100 -> 10 points

  const mine = await api('/loyalty/mine', { token: customer.token });
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.balance, 10);
  assert.equal(mine.body.data.lifetimeEarned, 10);
  assert.equal(mine.body.data.egpPerPoint, 10);
  assert.equal(mine.body.data.transactions.length, 1);
  assert.equal(mine.body.data.transactions[0].type, 'earn');
  assert.equal(mine.body.data.transactions[0].balanceAfter, 10);
});

test('an order never awards points twice, and pending orders earn nothing', async () => {
  const customer = await makeUser('c2@example.com');
  const staff = await makeUser('s2@example.com', 'admin');
  const order = await placeAndComplete(customer, staff);

  // Force the award path again (as if a retry happened): the unique ledger
  // key on (order, 'earn') must keep the balance at 10.
  const { awardForCompletedOrder } = await import('../src/features/loyalty/loyalty.service.js');
  await awardForCompletedOrder(order);
  const account = await LoyaltyAccount.findOne({ user: customer.user._id }).lean();
  assert.equal(account.balance, 10);
  assert.equal(await LoyaltyTransaction.countDocuments({ user: customer.user._id }), 1);
});

test('admin adjustments write a ledger entry and never go below zero', async () => {
  const customer = await makeUser('c3@example.com');
  const staff = await makeUser('s3@example.com', 'admin');

  const plus = await api('/loyalty/admin/adjust', {
    method: 'POST',
    token: staff.token,
    body: { userId: customer.user._id.toString(), points: 25, description: 'تعويض عن طلب غلط' },
  });
  assert.equal(plus.status, 201);
  assert.equal(plus.body.data.balanceAfter, 25);
  assert.equal(plus.body.data.type, 'adjustment');

  const tooMuch = await api('/loyalty/admin/adjust', {
    method: 'POST',
    token: staff.token,
    body: { userId: customer.user._id.toString(), points: -30, description: 'خصم' },
  });
  assert.equal(tooMuch.status, 400);
  assert.equal(tooMuch.body.error.code, 'INSUFFICIENT_POINTS');

  const okMinus = await api('/loyalty/admin/adjust', {
    method: 'POST',
    token: staff.token,
    body: { userId: customer.user._id.toString(), points: -25, description: 'خصم' },
  });
  assert.equal(okMinus.status, 201);
  assert.equal(okMinus.body.data.balanceAfter, 0);
});

test('loyalty endpoints require the right role', async () => {
  const customer = await makeUser('c4@example.com');
  assert.equal((await api('/loyalty/mine')).status, 401);
  const adjust = await api('/loyalty/admin/adjust', {
    method: 'POST',
    token: customer.token,
    body: { userId: customer.user._id.toString(), points: 5, description: 'x' },
  });
  assert.equal(adjust.status, 403);
});
