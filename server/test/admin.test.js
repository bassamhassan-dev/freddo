import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// The admin board: role enforcement, order status flow, availability
// toggling - on in-memory Mongo.
let mongod;
let server;
let baseUrl;

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api/admin${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function makeUser(email, role) {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Test', email, passwordHash, role });
  return { user, token: signAccessToken(user) };
}

async function makeOrder(userId, status = 'pending') {
  return Order.create({
    orderNumber: `FR-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
    user: userId,
    items: [{ product: new mongoose.Types.ObjectId(), name: { ar: 'أ', en: 'x' }, unitPrice: 50, qty: 1, lineTotal: 50 }],
    subtotal: 50,
    total: 50,
    customer: { name: 'Test', phone: '01012345678' },
    status,
  });
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
  await Order.deleteMany({});
  await MenuItem.deleteMany({});
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('the admin namespace rejects customers and guests', async () => {
  const customer = await makeUser('cust@example.com', ROLES.CUSTOMER);
  const guest = await api('/orders');
  assert.equal(guest.status, 401);
  const asCustomer = await api('/orders', { token: customer.token });
  assert.equal(asCustomer.status, 403);
  assert.equal(asCustomer.body.error.code, 'AUTH_FORBIDDEN');
});

test('admin lists orders filtered by status', async () => {
  const admin = await makeUser('admin@example.com', ROLES.ADMIN);
  const customer = await makeUser('c2@example.com', ROLES.CUSTOMER);
  await makeOrder(customer.user._id, 'pending');
  await makeOrder(customer.user._id, 'pending');
  await makeOrder(customer.user._id, 'completed');

  const all = await api('/orders', { token: admin.token });
  assert.equal(all.body.data.total, 3);
  const pending = await api('/orders?status=pending', { token: admin.token });
  assert.equal(pending.body.data.total, 2);
  assert.equal(pending.body.data.orders[0].status, 'pending');
  const bad = await api('/orders?status=nonsense', { token: admin.token });
  assert.equal(bad.status, 400);
});

test('admin advances status through valid transitions only, with history', async () => {
  const admin = await makeUser('a2@example.com', ROLES.ADMIN);
  const customer = await makeUser('c3@example.com', ROLES.CUSTOMER);
  const order = await makeOrder(customer.user._id, 'pending');

  const confirm = await api(`/orders/${order._id}/status`, {
    method: 'POST',
    token: admin.token,
    body: { to: 'confirmed' },
  });
  assert.equal(confirm.status, 200);
  assert.equal(confirm.body.data.order.status, 'confirmed');

  // Skipping preparing straight to completed is not a valid transition.
  const skip = await api(`/orders/${order._id}/status`, {
    method: 'POST',
    token: admin.token,
    body: { to: 'completed' },
  });
  assert.equal(skip.status, 409);
  assert.equal(skip.body.error.code, 'INVALID_TRANSITION');

  const history = await Order.findById(order._id);
  assert.equal(history.statusHistory.length, 1);
  assert.equal(history.statusHistory[0].to, 'confirmed');
});

test('admin toggles availability and the public menu follows', async () => {
  const admin = await makeUser('a3@example.com', ROLES.ADMIN);
  const item = await MenuItem.create({
    slug: 'latte',
    name: { ar: 'لاتيه', en: 'Latte' },
    description: { ar: 'وصف', en: 'desc' },
    category: { slug: 'hot-coffee', name: { ar: 'قهوة', en: 'Coffee' } },
    basePrice: 50,
  });

  const off = await api(`/menu/${item._id}/availability`, {
    method: 'PATCH',
    token: admin.token,
    body: { isAvailable: false },
  });
  assert.equal(off.status, 200);
  assert.equal(off.body.data.isAvailable, false);

  // The public API must stop showing it (server-side filter, Sprint 1).
  const pub = await fetch(`${baseUrl}/api/menu`);
  const { data } = await pub.json();
  assert.equal(data.items.find((i) => i.slug === 'latte'), undefined);

  const on = await api(`/menu/${item._id}/availability`, {
    method: 'PATCH',
    token: admin.token,
    body: { isAvailable: true },
  });
  assert.equal(on.body.data.isAvailable, true);

  const bad = await api(`/menu/${item._id}/availability`, {
    method: 'PATCH',
    token: admin.token,
    body: { isAvailable: 'yes' },
  });
  assert.equal(bad.status, 400);
});

test('admin menu list includes unavailable items', async () => {
  const admin = await makeUser('a4@example.com', ROLES.ADMIN);
  await MenuItem.create({
    slug: 'hidden-gem',
    name: { ar: 'مخفي', en: 'Hidden' },
    description: { ar: 'وصف', en: 'desc' },
    category: { slug: 'tea', name: { ar: 'شاي', en: 'Tea' } },
    basePrice: 30,
    isAvailable: false,
  });
  const res = await api('/menu', { token: admin.token });
  assert.equal(res.body.data.items.length, 1);
  assert.equal(res.body.data.items[0].slug, 'hidden-gem');
});

test('admin swaps a menu item image: validation, 404, role enforcement', async () => {
  const admin = await makeUser('a5@example.com', ROLES.ADMIN);
  const customer = await makeUser('c4@example.com', ROLES.CUSTOMER);
  const item = await MenuItem.create({
    slug: 'mocha',
    name: { ar: 'موكا', en: 'Mocha' },
    description: { ar: 'وصف', en: 'desc' },
    category: { slug: 'hot-coffee', name: { ar: 'قهوة', en: 'Coffee' } },
    basePrice: 55,
    images: [{ url: 'https://res.cloudinary.com/x/old.jpg', storageId: 'old-id', alt: { ar: 'موكا', en: 'Mocha' } }],
  });

  // Role enforcement.
  assert.equal((await api(`/menu/${item._id}/image`, { method: 'PATCH', body: { url: 'https://a.com/x.jpg' } })).status, 401);
  assert.equal((await api(`/menu/${item._id}/image`, { method: 'PATCH', token: customer.token, body: { url: 'https://a.com/x.jpg' } })).status, 403);

  // URL validation: only https or a site-relative path.
  for (const url of ['javascript:alert(1)', 'ftp://a.com/x', 'http://a.com/x', 'not-a-url', '//evil.com/x']) {
    const res = await api(`/menu/${item._id}/image`, { method: 'PATCH', token: admin.token, body: { url } });
    assert.equal(res.status, 400, url);
    assert.equal(res.body.error.code, 'IMAGE_URL_INVALID');
  }

  // Unknown item.
  const missing = await api(`/menu/${new mongoose.Types.ObjectId()}/image`, {
    method: 'PATCH', token: admin.token, body: { url: 'https://a.com/x.jpg' },
  });
  assert.equal(missing.status, 404);

  // https swap replaces the old Cloudinary image and its storageId.
  const swap = await api(`/menu/${item._id}/image`, {
    method: 'PATCH', token: admin.token, body: { url: 'https://res.cloudinary.com/x/new.jpg' },
  });
  assert.equal(swap.status, 200);
  assert.equal(swap.body.data.item.images[0].url, 'https://res.cloudinary.com/x/new.jpg');
  assert.equal(swap.body.data.item.images[0].storageId, undefined);

  // Site-relative path (the seeded SVGs) is accepted too.
  const local = await api(`/menu/${item._id}/image`, {
    method: 'PATCH', token: admin.token, body: { url: '/menu/mocha.svg' },
  });
  assert.equal(local.status, 200);
  const saved = await MenuItem.findById(item._id);
  assert.equal(saved.images[0].url, '/menu/mocha.svg');
});
