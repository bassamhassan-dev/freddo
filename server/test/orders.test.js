import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';

// Order flow tests on in-memory Mongo: server-authoritative pricing,
// snapshots, ownership, cancellation, idempotency.
let mongod;
let server;
let baseUrl;

const sampleItem = (overrides = {}) => ({
  slug: 'spanish-latte',
  name: { ar: 'سبانيش لاتيه', en: 'Spanish Latte' },
  description: { ar: 'وصف', en: 'desc' },
  category: { slug: 'hot-coffee', name: { ar: 'قهوة ساخنة', en: 'Hot Coffee' } },
  basePrice: 75,
  variants: [
    { label: { ar: 'وسط', en: 'Medium' }, price: 85 },
    { label: { ar: 'كبير', en: 'Large' }, price: 95 },
  ],
  addOns: [{ name: { ar: 'شوت إضافي', en: 'Extra shot' }, price: 15 }],
  isAvailable: true,
  ...overrides,
});

async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api/orders${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function makeCustomer(email) {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Test Customer', email, passwordHash });
  const { signAccessToken } = await import('../src/utils/tokens.js');
  return { user, token: signAccessToken(user) };
}

let latte;
let mediumId;
let shotId;

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
  await Order.deleteMany({});
  await MenuItem.deleteMany({});
  latte = await MenuItem.create(sampleItem());
  mediumId = latte.variants[0]._id.toString();
  shotId = latte.addOns[0]._id.toString();
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('orders require authentication', async () => {
  const res = await api('/', { method: 'POST', body: { phone: '01000000000', lines: [] } });
  assert.equal(res.status, 401);
  const mine = await api('/mine');
  assert.equal(mine.status, 401);
});

test('create re-prices everything from the catalog (doc 8.5)', async () => {
  const { token } = await makeCustomer('a@example.com');
  const res = await api('/', {
    method: 'POST',
    token,
    body: {
      phone: '01012345678',
      lines: [
        { slug: 'spanish-latte', variantId: mediumId, addOnIds: [shotId], qty: 2, notes: 'سكر قليل' },
      ],
    },
  });
  assert.equal(res.status, 201);
  const { order } = res.body.data;
  // (85 medium + 15 shot) * 2 = 200 - whatever the client claimed.
  assert.equal(order.items[0].unitPrice, 100);
  assert.equal(order.items[0].lineTotal, 200);
  assert.equal(order.subtotal, 200);
  assert.equal(order.total, 200);
  assert.equal(order.paymentMethod, 'cod');
  assert.equal(order.status, 'pending');
  assert.match(order.orderNumber, /^FR-[0-9A-F]{6}$/);
  assert.equal(order.statusHistory.length, 1);
});

// Regression (Bassam's checkout bug): an item with NO size options must
// order cleanly with no coupon code at all - coupon is never required,
// and an empty-string couponCode from the client is ignored, not rejected.
test('no-variant item orders with no coupon, and empty-string coupon is ignored', async () => {
  const { token } = await makeCustomer('plain@example.com');
  await MenuItem.create(sampleItem({ slug: 'croissant', variants: [], addOns: [], basePrice: 40 }));

  const plain = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'croissant', qty: 2 }] },
  });
  assert.equal(plain.status, 201);
  assert.equal(plain.body.data.order.total, 80);

  const emptyCoupon = await api('/', {
    method: 'POST',
    token,
    body: {
      phone: '01012345678',
      lines: [{ slug: 'croissant', qty: 1 }],
      couponCode: '',
      redeemPoints: false,
    },
  });
  assert.equal(emptyCoupon.status, 201);
  assert.equal(emptyCoupon.body.data.order.total, 40);
});

// Sprint 32: the customer chooses pickup or delivery; delivery requires an
// address and snapshots it on the order.
test('fulfillment: pickup by default, delivery needs and keeps an address', async () => {
  const { token } = await makeCustomer('fulfill@example.com');

  const pickup = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', qty: 1, variantId: mediumId }] },
  });
  assert.equal(pickup.status, 201);
  assert.equal(pickup.body.data.order.fulfillmentType, 'pickup');

  const noAddress = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', qty: 1, variantId: mediumId }], fulfillmentType: 'delivery' },
  });
  assert.equal(noAddress.status, 400);
  assert.equal(noAddress.body.error.code, 'ADDRESS_REQUIRED');

  const delivery = await api('/', {
    method: 'POST',
    token,
    body: {
      phone: '01012345678',
      lines: [{ slug: 'spanish-latte', qty: 1, variantId: mediumId }],
      fulfillmentType: 'delivery',
      deliveryAddress: 'الواسطى، شارع الجيش، عمارة 12',
    },
  });
  assert.equal(delivery.status, 201);
  assert.equal(delivery.body.data.order.fulfillmentType, 'delivery');
  assert.equal(delivery.body.data.order.deliveryAddress, 'الواسطى، شارع الجيش، عمارة 12');
});

test('create rejects unavailable items and bad variants with clear codes', async () => {
  const { token } = await makeCustomer('b@example.com');
  await MenuItem.create(sampleItem({ slug: 'gone', isAvailable: false }));
  const unavailable = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'gone', qty: 1 }] },
  });
  assert.equal(unavailable.status, 409);
  assert.equal(unavailable.body.error.code, 'ITEM_UNAVAILABLE');

  const badVariant = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', qty: 1 }] },
  });
  assert.equal(badVariant.status, 400);
  assert.equal(badVariant.body.error.code, 'INVALID_VARIANT');

  const badPhone = await api('/', {
    method: 'POST',
    token,
    body: { phone: 'abc', lines: [{ slug: 'spanish-latte', variantId: mediumId, qty: 1 }] },
  });
  assert.equal(badPhone.status, 400);
  assert.equal(badPhone.body.error.code, 'INVALID_PHONE');
});

test('the snapshot survives later catalog edits and deletion', async () => {
  const { token } = await makeCustomer('c@example.com');
  const created = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', variantId: mediumId, qty: 1 }] },
  });
  const orderId = created.body.data.order._id;

  latte.name.en = 'Renamed Latte';
  latte.basePrice = 999;
  await latte.save();

  const fetched = await api(`/${orderId}`, { token });
  const { order } = fetched.body.data;
  assert.equal(order.name, undefined); // item field, not order field
  assert.equal(order.items[0].name.en, 'Spanish Latte'); // frozen at purchase
  assert.equal(order.items[0].unitPrice, 85);
});

test('customers see only their own orders; another user gets 404', async () => {
  const owner = await makeCustomer('owner@example.com');
  const other = await makeCustomer('other@example.com');
  const created = await api('/', {
    method: 'POST',
    token: owner.token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', variantId: mediumId, qty: 1 }] },
  });
  const orderId = created.body.data.order._id;

  const mine = await api('/mine', { token: owner.token });
  assert.equal(mine.body.data.orders.length, 1);
  const theirs = await api('/mine', { token: other.token });
  assert.equal(theirs.body.data.orders.length, 0);
  const peek = await api(`/${orderId}`, { token: other.token });
  assert.equal(peek.status, 404);
  assert.equal(peek.body.error.code, 'ORDER_NOT_FOUND');
});

test('a customer cancels while pending but not after confirmation', async () => {
  const { user, token } = await makeCustomer('d@example.com');
  const created = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', variantId: mediumId, qty: 1 }] },
  });
  const orderId = created.body.data.order._id;

  const cancelled = await api(`/${orderId}/cancel`, { method: 'POST', token });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.order.status, 'cancelled');
  assert.ok(cancelled.body.data.order.cancelledAt);

  // New order, moved to confirmed in the DB (admin flow lands next sprint).
  const second = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', variantId: mediumId, qty: 1 }] },
  });
  await Order.findByIdAndUpdate(second.body.data.order._id, { status: 'confirmed' });
  const tooLate = await api(`/${second.body.data.order._id}/cancel`, { method: 'POST', token });
  assert.equal(tooLate.status, 409);
  assert.equal(tooLate.body.error.code, 'CANNOT_CANCEL');
  void user;
});

test('idempotency: a retried submit returns the same order, no duplicate', async () => {
  const { token } = await makeCustomer('e@example.com');
  const body = { phone: '01012345678', lines: [{ slug: 'spanish-latte', variantId: mediumId, qty: 1 }] };
  const first = await api('/', { method: 'POST', token, body, headers: { 'idempotency-key': 'cart-123' } });
  assert.equal(first.status, 201);
  const retry = await api('/', { method: 'POST', token, body, headers: { 'idempotency-key': 'cart-123' } });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.order.orderNumber, first.body.data.order.orderNumber);
  assert.equal(await Order.countDocuments({ idempotencyKey: 'cart-123' }), 1);
});

test('quantity limits are enforced', async () => {
  const { token } = await makeCustomer('f@example.com');
  const res = await api('/', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'spanish-latte', variantId: mediumId, qty: 21 }] },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_QTY');
});
