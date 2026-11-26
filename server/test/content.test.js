import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import SiteContent from '../src/features/content/siteContent.model.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Site-content CMS tests: public endpoint returns only stored overrides,
// admin upserts and reverts, unknown keys rejected, admin-only writes.
let mongod;
let server;
let baseUrl;
let adminToken;
let customerToken;

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
  const customer = await User.create({ name: 'Cust', email: 'c@example.com', passwordHash });
  customerToken = signAccessToken(customer);
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await SiteContent.deleteMany({});
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('public content is empty until the admin sets an override', async () => {
  const res = await api('/content');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.contents, {});
});

test('admin upserts a bilingual override and the public endpoint serves it', async () => {
  const put = await api('/admin/content/tagline', {
    method: 'PUT', token: adminToken,
    body: { ar: 'قهوة تستاهل كل سهرة', en: 'Coffee worth every late night' },
  });
  assert.equal(put.status, 200);
  assert.equal(put.body.data.value.ar, 'قهوة تستاهل كل سهرة');

  const res = await api('/content');
  assert.equal(res.body.data.contents.tagline.en, 'Coffee worth every late night');
  assert.equal(res.body.data.contents.menuTitle, undefined); // untouched keys stay absent

  // Update the same key again: it is an upsert, not a duplicate.
  await api('/admin/content/tagline', { method: 'PUT', token: adminToken, body: { ar: 'نسخة ٢', en: 'v2' } });
  assert.equal(await SiteContent.countDocuments({ key: 'tagline' }), 1);
  assert.equal((await api('/content')).body.data.contents.tagline.en, 'v2');
});

test('sending both values empty reverts to the built-in copy', async () => {
  await api('/admin/content/menuTitle', { method: 'PUT', token: adminToken, body: { ar: 'القايمة', en: 'The list' } });
  const revert = await api('/admin/content/menuTitle', { method: 'PUT', token: adminToken, body: { ar: '', en: '' } });
  assert.equal(revert.body.data.reverted, true);
  assert.equal(await SiteContent.countDocuments(), 0);

  // One language only is a validation error, not a revert.
  const half = await api('/admin/content/menuTitle', { method: 'PUT', token: adminToken, body: { ar: 'بس', en: '' } });
  assert.equal(half.status, 400);
});

test('unknown keys are rejected and writes are admin-only', async () => {
  const unknown = await api('/admin/content/footerSecret', { method: 'PUT', token: adminToken, body: { ar: 'x', en: 'x' } });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.error.code, 'UNKNOWN_KEY');

  assert.equal((await api('/admin/content/tagline', { method: 'PUT', token: customerToken, body: { ar: 'x', en: 'x' } })).status, 403);
  assert.equal((await api('/admin/content', { token: customerToken })).status, 403);
  assert.equal((await api('/admin/content')).status, 401);
});

test('section keys toggle visibility with no copy; url keys need https', async () => {
  // Section toggle.
  const off = await api('/admin/content/sectionAbout', { method: 'PUT', token: adminToken, body: { enabled: false } });
  assert.equal(off.status, 200);
  assert.equal(off.body.data.enabled, false);
  let pub = await api('/content');
  assert.equal(pub.body.data.sections.sectionAbout, false);
  const on = await api('/admin/content/sectionAbout', { method: 'PUT', token: adminToken, body: { enabled: true } });
  assert.equal(on.body.data.enabled, true);
  pub = await api('/content');
  assert.equal(pub.body.data.sections.sectionAbout, true);

  // A section PUT without a boolean is rejected.
  assert.equal((await api('/admin/content/sectionAbout', { method: 'PUT', token: adminToken, body: {} })).status, 400);

  // URL keys: https only, empty reverts.
  assert.equal((await api('/admin/content/socialFacebook', { method: 'PUT', token: adminToken, body: { url: 'http://fb.com/x' } })).status, 400);
  const ok = await api('/admin/content/socialFacebook', { method: 'PUT', token: adminToken, body: { url: 'https://facebook.com/freddo' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.value.en, 'https://facebook.com/freddo');
  pub = await api('/content');
  assert.equal(pub.body.data.contents.socialFacebook.ar, 'https://facebook.com/freddo');
});
