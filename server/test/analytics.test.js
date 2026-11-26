import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import Order from '../src/features/orders/order.model.js';
import CouponUsage from '../src/features/coupons/couponUsage.model.js';
import LoyaltyTransaction from '../src/features/loyalty/loyaltyTransaction.model.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Analytics tests (doc 15): revenue counts completed orders only, AOV,
// status counts, top products, coupon and loyalty rollups, range filter.
let mongod;
let server;
let baseUrl;
let adminToken;
let customer;

async function api(path, { token } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api${path}`, { headers });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function makeOrder(overrides = {}) {
  return Order.create({
    orderNumber: `FR-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    user: customer._id,
    customer: { name: 'C', phone: '01012345678' },
    items: [{ product: new mongoose.Types.ObjectId(), name: { ar: 'لاتيه', en: 'Latte' }, qty: 2, unitPrice: 50, lineTotal: 100 }],
    subtotal: 100,
    discount: 10,
    total: 90,
    paymentMethod: 'cod',
    status: 'completed',
    statusHistory: [{ from: 'pending', to: 'completed' }],
    ...overrides,
  });
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const passwordHash = await User.hashPassword('secret123');
  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash, role: 'admin' });
  adminToken = signAccessToken(admin);
  customer = await User.create({ name: 'Cust', email: 'c@example.com', passwordHash });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), CouponUsage.deleteMany({}), LoyaltyTransaction.deleteMany({})]);
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('dashboard rolls up revenue, AOV, statuses and top products from real data', async () => {
  await makeOrder(); // completed, total 90, 2 lattes
  await makeOrder({ status: 'cancelled', cancelledAt: new Date() });
  await makeOrder({
    items: [{ product: new mongoose.Types.ObjectId(), name: { ar: 'إسبريسو', en: 'Espresso' }, qty: 5, unitPrice: 40, lineTotal: 200 }],
    subtotal: 200, discount: 0, total: 200,
  });
  await CouponUsage.create({
    coupon: new mongoose.Types.ObjectId(), user: customer._id, order: new mongoose.Types.ObjectId(), discountAmount: 10,
  });
  await LoyaltyTransaction.create({ user: customer._id, type: 'earn', points: 9, balanceAfter: 9 });

  const res = await api('/admin/analytics', { token: adminToken });
  assert.equal(res.status, 200);
  const d = res.body.data;
  assert.equal(d.revenue, 290); // completed only
  assert.equal(d.orders, 3);
  assert.equal(d.cancelledOrders, 1);
  assert.equal(d.ordersByStatus.completed, 2);
  assert.equal(d.averageOrderValue, 145); // 290 / 2
  assert.equal(d.topProducts[0]._id, 'Espresso'); // 5 > 2
  assert.equal(d.topProducts[0].qty, 5);
  assert.equal(d.coupons.uses, 1);
  assert.equal(d.coupons.discountTotal, 10);
  assert.equal(d.loyalty.earned, 9);
  assert.equal(d.loyalty.activeCustomers, 1);
  // Daily series: today carries all 3 orders, revenue from completed only.
  const today = d.daily.find((x) => x.orders === 3);
  assert.ok(today, 'daily series includes today');
  assert.equal(today.revenue, 290);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(today.date));
});

test('the date range filters everything', async () => {
  const old = new Date(Date.now() - 60 * 86400000);
  await makeOrder({ createdAt: old });
  await makeOrder();

  const res = await api('/admin/analytics', { token: adminToken });
  assert.equal(res.body.data.revenue, 90); // only the recent one
  assert.equal(res.body.data.orders, 1);
});

test('bad dates and inverted ranges are rejected; non-admins are kept out', async () => {
  assert.equal((await api('/admin/analytics?from=nope', { token: adminToken })).status, 400);
  assert.equal((await api('/admin/analytics?from=2026-12-01&to=2026-11-01', { token: adminToken })).status, 400);
  assert.equal((await api('/admin/analytics')).status, 401);
  assert.equal((await api('/admin/analytics', { token: signAccessToken(customer) })).status, 403);
});
