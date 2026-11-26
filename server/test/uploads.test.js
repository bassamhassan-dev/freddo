import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Upload pipeline tests (doc 16): admin-only, and without Cloudinary env
// vars the endpoint reports itself unconfigured while the plain-URL banner
// path keeps working. The real upload is verified manually once
// credentials land (steps in WALKTHROUGH-SPRINT16.md).
let mongod;
let server;
let baseUrl;
let adminToken;
let customerToken;

async function api(path, { method = 'GET', token, formData } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api${path}`, { method, headers, body: formData });
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

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('upload status reports unconfigured without env vars', async () => {
  const res = await api('/admin/uploads/status', { token: adminToken });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { configured: false });
});

test('upload answers 503 (not a crash) when Cloudinary is not configured', async () => {
  const fd = new FormData();
  fd.append('image', new Blob([Buffer.from('89504e47', 'hex')], { type: 'image/png' }), 'x.png');
  const res = await api('/admin/uploads', { method: 'POST', token: adminToken, formData: fd });
  assert.equal(res.status, 503);
  assert.equal(res.body.error.code, 'CLOUDINARY_NOT_CONFIGURED');
});

test('uploads are admin-only', async () => {
  assert.equal((await api('/admin/uploads/status')).status, 401);
  assert.equal((await api('/admin/uploads/status', { token: customerToken })).status, 403);
  assert.equal((await api('/admin/uploads', { method: 'POST', token: customerToken })).status, 403);
});
