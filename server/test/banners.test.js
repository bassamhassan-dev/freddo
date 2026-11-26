import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import Banner from '../src/features/banners/banner.model.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Banner tests (doc 5): public endpoint filters by placement, active flag
// and campaign window; admin CRUD validates image/CTA links.
let mongod;
let server;
let baseUrl;
let adminToken;

const sample = (overrides = {}) => ({
  placement: 'main',
  title: { ar: 'عرض', en: 'Offer' },
  description: { ar: 'وصف', en: 'Desc' },
  imageUrl: 'https://cdn.example.com/banner.jpg',
  ctaText: { ar: 'اطلب', en: 'Order' },
  ctaLink: '/item/spanish-latte',
  active: true,
  sortOrder: 0,
  ...overrides,
});

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const passwordHash = await User.hashPassword('secret123');
  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash, role: 'admin' });
  adminToken = signAccessToken(admin);
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await Banner.deleteMany({});
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('public list returns only active banners in their window, ordered', async () => {
  await Banner.create(sample({ sortOrder: 2 }));
  await Banner.create(sample({ title: { ar: 'أول', en: 'First' }, sortOrder: 1 }));
  await Banner.create(sample({ active: false })); // hidden
  await Banner.create(sample({ endAt: new Date(Date.now() - 1000) })); // expired
  await Banner.create(sample({ startAt: new Date(Date.now() + 86400000) })); // future
  await Banner.create(sample({ placement: 'secondary_left' })); // other slot

  const res = await api('/banners?placement=main');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.banners.length, 2);
  assert.equal(res.body.data.banners[0].title.en, 'First'); // sortOrder respected
  assert.equal(res.body.data.banners[0].cloudinaryPublicId, undefined);
});

test('public list rejects an unknown placement', async () => {
  const res = await api('/banners?placement=top');
  assert.equal(res.status, 400);
});

test('admin CRUD: create validates image and CTA link, patch reorders and deactivates', async () => {
  const badImage = await api('/admin/banners', {
    method: 'POST', token: adminToken,
    body: sample({ imageUrl: 'not-a-url' }),
  });
  assert.equal(badImage.status, 400);
  assert.equal(badImage.body.error.code, 'INVALID_IMAGE');

  const badLink = await api('/admin/banners', {
    method: 'POST', token: adminToken,
    body: sample({ ctaLink: 'javascript:alert(1)' }),
  });
  assert.equal(badLink.status, 400);
  assert.equal(badLink.body.error.code, 'INVALID_LINK');

  const created = await api('/admin/banners', { method: 'POST', token: adminToken, body: sample() });
  assert.equal(created.status, 201);
  const id = created.body.data.banner._id;

  const patched = await api(`/admin/banners/${id}`, {
    method: 'PATCH', token: adminToken,
    body: { sortOrder: 5, active: false },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.data.banner.sortOrder, 5);
  assert.equal(patched.body.data.banner.active, false);

  const list = await api('/admin/banners', { token: adminToken });
  assert.equal(list.body.data.banners.length, 1); // admin sees inactive ones

  const removed = await api(`/admin/banners/${id}`, { method: 'DELETE', token: adminToken });
  assert.equal(removed.status, 200);
  assert.equal(await Banner.countDocuments(), 0);
});

test('admin banner endpoints are admin-only', async () => {
  const passwordHash = await User.hashPassword('secret123');
  const customer = await User.create({ name: 'Cust', email: 'c@example.com', passwordHash });
  const token = signAccessToken(customer);
  assert.equal((await api('/admin/banners', { token })).status, 403);
  assert.equal((await api('/admin/banners')).status, 401);
});
