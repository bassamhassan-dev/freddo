import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Odd inputs found in the end-to-end pass (Sprint 38): each used to be a 500.
let mongod; let server; let base;
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await new Promise((r) => { server = app.listen(0, () => { base = `http://localhost:${server.address().port}`; r(); }); });
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

const call = async (path, { method = 'POST', body, raw, token } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(base + '/api' + path, { method, headers, body: raw ?? JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

test('a request body over the limit is 413, bad JSON is 400', async () => {
  const big = await call('/contact', { body: { name: 'x', email: 'x@y.com', message: 'a'.repeat(200000) } });
  assert.equal(big.status, 413);
  assert.equal(big.body.error.code, 'PAYLOAD_TOO_LARGE');
  const bad = await call('/contact', { raw: '{nope' });
  assert.equal(bad.status, 400);
});

test('a null order line is a 400, and an unknown status name is a 400', async () => {
  const user = await User.create({ name: 'Cust', email: 'c@x.com', passwordHash: await User.hashPassword('secret123'), emailVerifiedAt: new Date() });
  const admin = await User.create({ name: 'Admin', email: 'a@x.com', passwordHash: await User.hashPassword('secret123'), role: 'admin', emailVerifiedAt: new Date() });
  await MenuItem.create({ slug: 'tea', name: { ar: 'شاي', en: 'Tea' }, description: { ar: 'و', en: 'd' }, category: { slug: 't', name: { ar: 'ت', en: 'T' } }, basePrice: 15, isAvailable: true });
  const token = signAccessToken(user);
  const res = await call('/orders', { token, body: { phone: '01012345678', lines: [null] } });
  assert.equal(res.status, 400);
  const placed = await call('/orders', { token, body: { phone: '01012345678', lines: [{ slug: 'tea', qty: 1 }] } });
  const id = placed.body.data.order._id;
  for (const to of ['zzz', 'constructor', 5]) {
    const r = await call(`/admin/orders/${id}/status`, { token: signAccessToken(admin), body: { to } });
    assert.equal(r.status, 400, String(to));
  }
  assert.equal((await Order.findById(id)).status, 'pending');
});
