import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Order from '../src/features/orders/order.model.js';
import { outbox } from '../src/services/mail.service.js';

// Sprint 33: email verification gates ordering, and every placed order
// triggers a confirmation email. No SMTP in tests - the mail service
// falls back to the dev outbox, which we inspect directly.
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

const lastMailTo = (email) => [...outbox].reverse().find((m) => m.to === email);
const tokenFromMail = (mail) => mail.text.match(/verify-email\?token=([0-9a-f]+)/)?.[1];

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
    slug: 'email-latte',
    name: { ar: 'لاتيه', en: 'Latte' },
    description: { ar: 'و', en: 'd' },
    category: { slug: 'hot-coffee', name: { ar: 'قهوة', en: 'Coffee' } },
    basePrice: 50,
    variants: [],
    addOns: [],
    isAvailable: true,
    isDrink: true,
  });
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('register sends a verification email and the account starts unverified', async () => {
  const email = 'verify-me@example.com';
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Verifier', email, password: 'secret123' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.user.emailVerified, false);

  const mail = lastMailTo(email);
  assert.ok(mail, 'verification email was logged');
  assert.ok(tokenFromMail(mail), 'email carries a token link');

  const stored = await User.findOne({ email }).select('+verificationTokenHash');
  assert.ok(stored.verificationTokenHash, 'only the hash is stored');
  assert.equal(stored.emailVerifiedAt, undefined);
});

test('an unverified customer cannot order; a verified one can', async () => {
  const email = 'gate@example.com';
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Gate', email, password: 'secret123' },
  });
  const token = reg.body.data.accessToken;

  const blocked = await api('/api/orders', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'email-latte', qty: 1 }] },
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, 'EMAIL_NOT_VERIFIED');

  const bad = await api('/api/auth/verify-email', { method: 'POST', body: { token: 'deadbeef' } });
  assert.equal(bad.status, 400);

  const verify = await api('/api/auth/verify-email', {
    method: 'POST',
    body: { token: tokenFromMail(lastMailTo(email)) },
  });
  assert.equal(verify.status, 200);
  assert.equal(verify.body.data.user.emailVerified, true);

  // The token is single-use: replaying it fails.
  const replay = await api('/api/auth/verify-email', {
    method: 'POST',
    body: { token: tokenFromMail(lastMailTo(email)) },
  });
  assert.equal(replay.status, 400);

  const allowed = await api('/api/orders', {
    method: 'POST',
    token,
    body: { phone: '01012345678', lines: [{ slug: 'email-latte', qty: 1 }] },
  });
  assert.equal(allowed.status, 201);
});

test('placing an order sends a confirmation email with the order number', async () => {
  const email = 'confirm@example.com';
  await User.create({
    name: 'Confirmed',
    email,
    passwordHash: await User.hashPassword('secret123'),
    emailVerifiedAt: new Date(),
  });
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password: 'secret123' } });
  const res = await api('/api/orders', {
    method: 'POST',
    token: login.body.data.accessToken,
    body: { phone: '01012345678', lines: [{ slug: 'email-latte', qty: 2 }] },
  });
  assert.equal(res.status, 201);
  const orderNumber = res.body.data.order.orderNumber;

  const mail = lastMailTo(email);
  assert.ok(mail, 'confirmation email was logged');
  assert.ok(mail.text.includes(orderNumber), 'email names the order');
  assert.ok(mail.subject.includes(orderNumber));
});

test('resend-verification emails a fresh working token', async () => {
  const email = 'resend@example.com';
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Resend', email, password: 'secret123' },
  });
  const token = reg.body.data.accessToken;

  const resend = await api('/api/auth/resend-verification', { method: 'POST', token });
  assert.equal(resend.status, 200);

  const fresh = tokenFromMail(lastMailTo(email));
  const verify = await api('/api/auth/verify-email', { method: 'POST', body: { token: fresh } });
  assert.equal(verify.status, 200);

  // Once verified, resending is refused.
  const again = await api('/api/auth/resend-verification', { method: 'POST', token });
  assert.equal(again.status, 400);
  assert.equal(again.body.error.code, 'ALREADY_VERIFIED');
});

test('orders placed by an admin are not gated on email verification', async () => {
  await Order.deleteMany({});
  const email = 'admin-noverify@example.com';
  await User.create({
    name: 'Admin',
    email,
    passwordHash: await User.hashPassword('secret123'),
    role: 'admin',
  });
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password: 'secret123' } });
  const res = await api('/api/orders', {
    method: 'POST',
    token: login.body.data.accessToken,
    body: { phone: '01012345678', lines: [{ slug: 'email-latte', qty: 1 }] },
  });
  assert.equal(res.status, 201);
});
