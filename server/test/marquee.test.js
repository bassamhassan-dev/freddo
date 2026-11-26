import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import Marquee from '../src/features/marquee/marquee.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Announcement marquee (Sprint 28): public read shape, admin write with
// validation, and the disabled/empty states the client relies on.
let mongod;
let server;
let baseUrl;

async function makeUser(email, role) {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Test', email, passwordHash, role });
  return { user, token: signAccessToken(user) };
}

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
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
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('untouched database: public read says disabled, no strip', async () => {
  const res = await api('/api/marquee');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.enabled, false);
  assert.deepEqual(res.body.data.phrases, []);
});

test('admin writes the strip; public read returns it; validation holds', async () => {
  const admin = await makeUser('marquee-a@example.com', ROLES.ADMIN);
  const customer = await makeUser('marquee-c@example.com', ROLES.CUSTOMER);

  // Customers cannot write it.
  const forbidden = await api('/api/admin/marquee', {
    method: 'PUT', token: customer.token,
    body: { isEnabled: true, phrases: [{ ar: 'س', en: 's' }] },
  });
  assert.equal(forbidden.status, 403);

  // A phrase needs both languages.
  const bad = await api('/api/admin/marquee', {
    method: 'PUT', token: admin.token,
    body: { isEnabled: true, phrases: [{ ar: 'عروض', en: '' }] },
  });
  assert.equal(bad.status, 400);

  const phrases = [
    { ar: 'قهوتك.. على مزاجك', en: 'Your coffee.. your mood' },
    { ar: 'كود WELCOME10 على أول طلب', en: 'Code WELCOME10 on your first order' },
  ];
  const put = await api('/api/admin/marquee', {
    method: 'PUT', token: admin.token, body: { isEnabled: true, phrases },
  });
  assert.equal(put.status, 200);
  assert.equal(put.body.data.enabled, true);

  const pub = await api('/api/marquee');
  assert.equal(pub.body.data.enabled, true);
  assert.equal(pub.body.data.phrases.length, 2);
  assert.equal(pub.body.data.phrases[0].ar, 'قهوتك.. على مزاجك'); // order preserved

  // Hiding the strip: public read flips to disabled.
  await api('/api/admin/marquee', { method: 'PUT', token: admin.token, body: { isEnabled: false, phrases } });
  const hidden = await api('/api/marquee');
  assert.equal(hidden.body.data.enabled, false);
});
