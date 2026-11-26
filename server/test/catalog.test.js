import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Sprint 35: admin menu item + category CRUD on in-memory Mongo.
let mongod, server, baseUrl, adminToken, customerToken;

async function api(path, { method = 'GET', body, token = adminToken } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const L = (ar, en) => ({ ar, en });

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const passwordHash = await User.hashPassword('secret123');
  adminToken = signAccessToken(await User.create({ name: 'Admin', email: 'a@x.com', passwordHash, role: 'admin' }));
  customerToken = signAccessToken(await User.create({ name: 'Cust', email: 'c@x.com', passwordHash }));
  await MenuItem.create({
    slug: 'old-latte', name: L('لاتيه', 'Old Latte'), description: L('و', 'd'),
    category: { slug: 'legacy', name: L('قديم', 'Legacy') }, basePrice: 30,
  });
  await new Promise((r) => { server = app.listen(0, () => { baseUrl = `http://localhost:${server.address().port}`; r(); }); });
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('catalog admin is admin-only', async () => {
  assert.equal((await api('/api/admin/categories', { token: customerToken })).status, 403);
  assert.equal((await api('/api/admin/menu', { method: 'POST', token: customerToken, body: {} })).status, 403);
});

test('categories: legacy ones appear automatically; create, rename, reorder, delete rules', async () => {
  const first = await api('/api/admin/categories');
  assert.equal(first.status, 200);
  assert.ok(first.body.data.categories.find((c) => c.slug === 'legacy' && c.itemCount === 1));

  const created = await api('/api/admin/categories', { method: 'POST', body: { name: L('حلويات', 'Sweets') } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.category.slug, 'sweets');
  const dup = await api('/api/admin/categories', { method: 'POST', body: { name: L('حلويات', 'Sweets') } });
  assert.equal(dup.status, 409);
  const incomplete = await api('/api/admin/categories', { method: 'POST', body: { name: { ar: 'x' } } });
  assert.equal(incomplete.status, 400);

  // Rename rewrites the items' embedded copy.
  const legacy = first.body.data.categories.find((c) => c.slug === 'legacy');
  await api(`/api/admin/categories/${legacy._id}`, { method: 'PUT', body: { name: L('كلاسيك', 'Classic') } });
  assert.equal((await MenuItem.findOne({ slug: 'old-latte' })).category.name.en, 'Classic');

  // Reorder: sweets first.
  const ids = [created.body.data.category._id, legacy._id];
  const re = await api('/api/admin/categories/reorder', { method: 'PATCH', body: { ids } });
  assert.deepEqual(re.body.data.categories.map((c) => c.slug), ['sweets', 'legacy']);

  // Non-empty category cannot be deleted; an empty one can.
  assert.equal((await api(`/api/admin/categories/${legacy._id}`, { method: 'DELETE' })).status, 409);
  assert.equal((await api(`/api/admin/categories/${created.body.data.category._id}`, { method: 'DELETE' })).status, 200);
});

test('menu items: create validates, edits, shows on public menu, deletes', async () => {
  const bad = await api('/api/admin/menu', { method: 'POST', body: { name: L('كوكيز', 'Cookie'), categorySlug: 'legacy', basePrice: 20 } });
  assert.equal(bad.status, 400); // description missing

  const create = await api('/api/admin/menu', {
    method: 'POST',
    body: {
      name: L('كوكيز', 'Cookie'), description: L('كوكيز طازة', 'Fresh cookie'),
      categorySlug: 'legacy', basePrice: 25, isDrink: false,
      variants: [{ label: L('صغير', 'Small'), price: 25 }, { label: L('كبير', 'Large'), price: 40 }],
      addOns: [{ name: L('شوكولاتة', 'Chocolate'), price: 5 }],
      imageUrl: '/menu/cookie.svg',
    },
  });
  assert.equal(create.status, 201);
  const item = create.body.data.item;
  assert.equal(item.slug, 'cookie');
  assert.equal(item.category.name.en, 'Classic');
  assert.equal(item.variants.length, 2);

  const dup = await api('/api/admin/menu', {
    method: 'POST',
    body: { name: L('كوكيز', 'Cookie'), description: L('و', 'd'), categorySlug: 'legacy', basePrice: 25 },
  });
  assert.equal(dup.status, 409);

  const badCat = await api('/api/admin/menu', {
    method: 'POST',
    body: { name: L('س', 'Sx'), description: L('و', 'd'), categorySlug: 'nope', basePrice: 25 },
  });
  assert.equal(badCat.status, 400);

  const pub = await api('/api/menu', { token: null });
  assert.ok(pub.body.data.items.find((i) => i.slug === 'cookie'));

  const upd = await api(`/api/admin/menu/${item._id}`, {
    method: 'PUT',
    body: {
      name: L('كوكيز', 'Cookie'), description: L('جديد', 'New desc'), categorySlug: 'legacy',
      basePrice: 30, isAvailable: false, variants: [], addOns: [],
    },
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.item.basePrice, 30);
  assert.equal(upd.body.data.item.slug, 'cookie');
  assert.equal(upd.body.data.item.images[0].url, '/menu/cookie.svg'); // image untouched
  const pub2 = await api('/api/menu', { token: null });
  assert.equal(pub2.body.data.items.find((i) => i.slug === 'cookie'), undefined); // unavailable hidden

  assert.equal((await api(`/api/admin/menu/${item._id}`, { method: 'DELETE' })).status, 200);
  assert.equal(await MenuItem.findOne({ slug: 'cookie' }), null);
  assert.equal((await api(`/api/admin/menu/${item._id}`, { method: 'DELETE' })).status, 404);
});
