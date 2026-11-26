import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';
import Coupon from '../src/features/coupons/coupon.model.js';
import CouponUsage from '../src/features/coupons/couponUsage.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Coupons (doc 13): validation rules, server-side math, atomic usage.
let mongod;
let server;
let baseUrl;

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function makeUser(email, role = ROLES.CUSTOMER) {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Test', email, passwordHash, role });
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
  await MenuItem.create({
    slug: 'latte',
    name: { ar: 'لاتيه', en: 'Latte' },
    description: { ar: 'و', en: 'd' },
    category: { slug: 'hot-coffee', name: { ar: 'قهوة', en: 'Coffee' } },
    basePrice: 100,
  });
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  server.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Order.deleteMany({});
  await Coupon.deleteMany({});
  await CouponUsage.deleteMany({});
});

const orderBody = {
  phone: '01012345678',
  lines: [{ slug: 'latte', qty: 2 }],
};

test('a percentage coupon discounts the order server-side and records usage', async () => {
  await Coupon.create({ code: 'freddo10', discountType: 'percentage', value: 10 });
  const { user, token } = await makeUser('c@freddo.com');

  const validate = await api('/api/coupons/validate', { method: 'POST', body: { code: 'FREDDO10', subtotal: 200 }, token });
  assert.equal(validate.status, 200);
  assert.equal(validate.body.data.discount, 20);

  const res = await api('/api/orders', { method: 'POST', body: { ...orderBody, couponCode: 'freddo10' }, token });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.order.subtotal, 200);
  assert.equal(res.body.data.order.discount, 20);
  assert.equal(res.body.data.order.total, 180);
  assert.equal(res.body.data.order.couponCode, 'FREDDO10');

  assert.equal(await CouponUsage.countDocuments({ user: user._id }), 1);
  const coupon = await Coupon.findOne({ code: 'FREDDO10' });
  assert.equal(coupon.usedCount, 1);
});

test('fixed coupons cap at the subtotal; percentage caps at maxDiscountAmount', async () => {
  await Coupon.create({ code: 'BIG', discountType: 'fixed', value: 500 });
  await Coupon.create({ code: 'HALF', discountType: 'percentage', value: 50, maxDiscountAmount: 30 });
  const { token } = await makeUser('c@freddo.com');

  const big = await api('/api/orders', { method: 'POST', body: { ...orderBody, couponCode: 'BIG' }, token });
  assert.equal(big.body.data.order.discount, 200); // never below zero

  const half = await api('/api/orders', { method: 'POST', body: { ...orderBody, couponCode: 'HALF', idempotencyKey: 'k2' }, token });
  assert.equal(half.body.data.order.discount, 30); // capped, not 100
});

test('min order, expiry, and inactive coupons are rejected with clear codes', async () => {
  await Coupon.create({ code: 'MIN300', discountType: 'fixed', value: 20, minOrderAmount: 300 });
  await Coupon.create({ code: 'OLD', discountType: 'fixed', value: 20, expiresAt: new Date(Date.now() - 86400000) });
  await Coupon.create({ code: 'OFF', discountType: 'fixed', value: 20, isActive: false });
  const { token } = await makeUser('c@freddo.com');

  assert.equal((await api('/api/coupons/validate', { method: 'POST', body: { code: 'MIN300', subtotal: 200 }, token })).body.error.code, 'COUPON_MIN_ORDER');
  assert.equal((await api('/api/coupons/validate', { method: 'POST', body: { code: 'OLD', subtotal: 200 }, token })).body.error.code, 'COUPON_EXPIRED');
  assert.equal((await api('/api/coupons/validate', { method: 'POST', body: { code: 'OFF', subtotal: 200 }, token })).body.error.code, 'COUPON_INVALID');
  assert.equal((await api('/api/coupons/validate', { method: 'POST', body: { code: 'NOPE', subtotal: 200 }, token })).body.error.code, 'COUPON_INVALID');
});

test('per-user limit blocks a second use', async () => {
  await Coupon.create({ code: 'ONCE', discountType: 'fixed', value: 10, usageLimitPerUser: 1 });
  const { token } = await makeUser('c@freddo.com');

  const first = await api('/api/orders', { method: 'POST', body: { ...orderBody, couponCode: 'ONCE' }, token });
  assert.equal(first.status, 201);

  const second = await api('/api/orders', { method: 'POST', body: { ...orderBody, couponCode: 'ONCE', idempotencyKey: 'k3' }, token });
  assert.equal(second.status, 400);
  assert.equal(second.body.error.code, 'COUPON_USER_LIMIT');
});

test('global limit: the conditional claim refuses overshoot', async () => {
  await Coupon.create({ code: 'TWO', discountType: 'fixed', value: 10, usageLimitGlobal: 2, usedCount: 1 });
  const { token } = await makeUser('c@freddo.com');
  const { token: other } = await makeUser('d@freddo.com');

  const ok = await api('/api/orders', { method: 'POST', body: { ...orderBody, couponCode: 'TWO' }, token });
  assert.equal(ok.status, 201);
  assert.equal((await Coupon.findOne({ code: 'TWO' })).usedCount, 2);

  const blocked = await api('/api/orders', { method: 'POST', body: { ...orderBody, couponCode: 'TWO' }, token: other });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.error.code, 'COUPON_EXHAUSTED');
});

test('admin manages coupons; duplicate codes 409; non-admin blocked', async () => {
  const { token: admin } = await makeUser('a@freddo.com', ROLES.ADMIN);
  const { token: customer } = await makeUser('c@freddo.com');

  const created = await api('/api/admin/coupons', {
    method: 'POST',
    body: { code: 'new10', discountType: 'percentage', value: 10 },
    token: admin,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.coupon.code, 'NEW10');

  const dup = await api('/api/admin/coupons', {
    method: 'POST',
    body: { code: 'NEW10', discountType: 'fixed', value: 5 },
    token: admin,
  });
  assert.equal(dup.status, 409);

  const id = created.body.data.coupon._id;
  const off = await api(`/api/admin/coupons/${id}`, { method: 'PATCH', body: { isActive: false }, token: admin });
  assert.equal(off.body.data.coupon.isActive, false);

  const list = await api('/api/admin/coupons?search=new', { token: admin });
  assert.equal(list.body.data.coupons.length, 1);

  assert.equal((await api('/api/admin/coupons', { token: customer })).status, 403);
});
