import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';
import Review from '../src/features/reviews/review.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Reviews (doc 12): duplicate policy, server-computed verification,
// visibility rules, consistent rating summaries.
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
  const user = await User.create({ name: 'Reviewer', email, passwordHash, role });
  return { user, token: signAccessToken(user) };
}

async function makeItem(slug = 'latte') {
  return MenuItem.create({
    slug,
    name: { ar: 'لاتيه', en: 'Latte' },
    description: { ar: 'وصف', en: 'Desc' },
    category: { slug: 'hot-coffee', name: { ar: 'قهوة', en: 'Coffee' } },
    basePrice: 50,
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

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  server.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await MenuItem.deleteMany({});
  await Order.deleteMany({});
  await Review.deleteMany({});
});

test('a customer reviews a product and it appears publicly with the summary', async () => {
  await makeItem();
  const { token } = await makeUser('c@freddo.com');

  const created = await api('/api/reviews', {
    method: 'POST',
    body: { targetType: 'product', productSlug: 'latte', rating: 5, comment: 'تحفة أوي' },
    token,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.review.isVerifiedPurchase, false);

  const list = await api('/api/reviews?target=product&product=latte');
  assert.equal(list.body.data.reviews.length, 1);
  assert.equal(list.body.data.summary.average, 5);
  assert.equal(list.body.data.summary.count, 1);

  // The item detail carries the recomputed rating too.
  const item = await api('/api/menu/latte');
  assert.equal(item.body.data.item.rating.count, 1);
});

test('one review per customer per product: writing again edits, never duplicates', async () => {
  await makeItem();
  const { token } = await makeUser('c@freddo.com');

  await api('/api/reviews', { method: 'POST', body: { targetType: 'product', productSlug: 'latte', rating: 2, comment: 'مش عاجبني' }, token });
  const again = await api('/api/reviews', { method: 'POST', body: { targetType: 'product', productSlug: 'latte', rating: 4, comment: 'رجعت في كلامي' }, token });
  assert.equal(again.status, 201);

  assert.equal(await Review.countDocuments(), 1);
  const list = await api('/api/reviews?target=product&product=latte');
  assert.equal(list.body.data.reviews.length, 1);
  assert.equal(list.body.data.reviews[0].rating, 4);
  assert.equal(list.body.data.summary.average, 4);
});

test('rating outside 1-5 and short comments are rejected', async () => {
  await makeItem();
  const { token } = await makeUser('c@freddo.com');

  const bad = await api('/api/reviews', { method: 'POST', body: { targetType: 'product', productSlug: 'latte', rating: 7, comment: 'كويس' }, token });
  assert.equal(bad.status, 400);

  const short = await api('/api/reviews', { method: 'POST', body: { targetType: 'product', productSlug: 'latte', rating: 4, comment: 'تم' }, token });
  assert.equal(short.status, 400);
});

test('verified purchase is computed from completed orders, never trusted', async () => {
  const item = await makeItem();
  const { user, token } = await makeUser('c@freddo.com');

  // A pending order does not count.
  await Order.create({
    orderNumber: 'FR-PEND1', user: user._id,
    items: [{ product: item._id, name: { ar: 'ل', en: 'L' }, unitPrice: 50, qty: 1, lineTotal: 50 }],
    subtotal: 50, total: 50, customer: { name: 'R', phone: '01012345678' }, status: 'pending',
  });
  const r1 = await api('/api/reviews', {
    method: 'POST',
    body: { targetType: 'product', productSlug: 'latte', rating: 5, comment: 'جربته', isVerifiedPurchase: true },
    token,
  });
  assert.equal(r1.body.data.review.isVerifiedPurchase, false);

  // Complete the order and edit the review: now it verifies.
  await Order.updateOne({ orderNumber: 'FR-PEND1' }, { $set: { status: 'completed' } });
  const r2 = await api('/api/reviews', {
    method: 'POST',
    body: { targetType: 'product', productSlug: 'latte', rating: 5, comment: 'جربته فعلاً' },
    token,
  });
  assert.equal(r2.body.data.review.isVerifiedPurchase, true);
});

test('admin hides and restores a review; public list and rating follow', async () => {
  await makeItem();
  const { token } = await makeUser('c@freddo.com');
  const { token: admin } = await makeUser('a@freddo.com', ROLES.ADMIN);

  await api('/api/reviews', { method: 'POST', body: { targetType: 'product', productSlug: 'latte', rating: 1, comment: 'وحش جداً' }, token });
  const all = await api('/api/admin/reviews', { token: admin });
  assert.equal(all.body.data.reviews.length, 1);
  const id = all.body.data.reviews[0].id;

  const hidden = await api(`/api/admin/reviews/${id}/visibility`, { method: 'PATCH', body: { isVisible: false }, token: admin });
  assert.equal(hidden.status, 200);

  const list = await api('/api/reviews?target=product&product=latte');
  assert.equal(list.body.data.reviews.length, 0);
  const item = await api('/api/menu/latte');
  assert.equal(item.body.data.item.rating.count, 0);

  await api(`/api/admin/reviews/${id}/visibility`, { method: 'PATCH', body: { isVisible: true }, token: admin });
  const item2 = await api('/api/menu/latte');
  assert.equal(item2.body.data.item.rating.count, 1);
});

test('cafe reviews work without a product and stay separate', async () => {
  const { token } = await makeUser('c@freddo.com');

  const created = await api('/api/reviews', { method: 'POST', body: { targetType: 'cafe', rating: 5, comment: 'المكان جميل' }, token });
  assert.equal(created.status, 201);

  const list = await api('/api/reviews?target=cafe');
  assert.equal(list.body.data.reviews.length, 1);
  assert.equal(list.body.data.summary.count, 1);

  // One cafe review per customer too.
  await api('/api/reviews', { method: 'POST', body: { targetType: 'cafe', rating: 4, comment: 'تعديل رأيي' }, token });
  assert.equal(await Review.countDocuments({ targetType: 'cafe' }), 1);
});

test('guests cannot write reviews and non-admins cannot moderate', async () => {
  await makeItem();
  const { token } = await makeUser('c@freddo.com');

  assert.equal((await api('/api/reviews', { method: 'POST', body: { targetType: 'cafe', rating: 5, comment: 'جميل' } })).status, 401);
  assert.equal((await api('/api/admin/reviews', { token })).status, 403);
});
