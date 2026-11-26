import './env.js';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import RefreshToken from '../src/features/auth/refreshToken.model.js';

// Auth flows against the real app on an in-memory Mongo. Cookies are read
// from set-cookie headers and replayed by hand - no browser needed.
let mongod;
let server;
let baseUrl;

const customer = { name: 'Bassam Hassan', email: 'bassam@example.com', password: 'secret123' };

async function api(path, { method = 'GET', body, token, cookie } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${baseUrl}/api/auth${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, setCookie: res.headers.get('set-cookie') };
}

function refreshCookieFrom(setCookie) {
  const row = (setCookie || '').split(',').find((c) => c.trim().startsWith('freddo_refresh='));
  return row ? row.trim().split(';')[0] : null;
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

test('register creates a customer, hashes the password, and starts a session', async () => {
  await User.deleteMany({});
  const res = await api('/register', { method: 'POST', body: customer });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.user.role, 'customer');
  assert.equal(res.body.data.user.email, 'bassam@example.com');
  assert.ok(res.body.data.accessToken);
  // Refresh session: HttpOnly cookie, scoped to /api/auth.
  const cookie = refreshCookieFrom(res.setCookie);
  assert.ok(cookie);
  assert.match(res.setCookie, /HttpOnly/i);
  assert.match(res.setCookie, /Path=\/api\/auth/);

  const stored = await User.findOne({ email: 'bassam@example.com' }).select('+passwordHash');
  assert.ok(stored.passwordHash.startsWith('$2')); // bcrypt
  assert.ok(!stored.passwordHash.includes('secret123'));
  assert.equal(await RefreshToken.countDocuments({ user: stored._id }), 1);
});

test('register rejects privileged role assignment and bad input', async () => {
  await User.deleteMany({});
  const sneaky = await api('/register', { method: 'POST', body: { ...customer, role: 'admin' } });
  assert.equal(sneaky.status, 201);
  assert.equal(sneaky.body.data.user.role, 'customer');

  const bad = await api('/register', { method: 'POST', body: { name: 'B', email: 'nope', password: 'short' } });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'VALIDATION_ERROR');

  const dup = await api('/register', { method: 'POST', body: customer });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'EMAIL_TAKEN');
});

test('email is normalized: uppercase registration matches lowercase login', async () => {
  await User.deleteMany({});
  await api('/register', { method: 'POST', body: { ...customer, email: 'BASSAM@Example.COM' } });
  const res = await api('/login', { method: 'POST', body: { email: 'bassam@example.com', password: customer.password } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.role, 'customer');
});

test('login fails identically for unknown email and wrong password', async () => {
  await User.deleteMany({});
  await api('/register', { method: 'POST', body: customer });
  for (const body of [
    { email: 'ghost@example.com', password: 'secret123' },
    { email: customer.email, password: 'wrong-pass' },
  ]) {
    const res = await api('/login', { method: 'POST', body });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_INVALID_CREDENTIALS');
    assert.ok(res.body.error.message.ar);
    assert.ok(res.body.error.message.en);
  }
});

test('inactive accounts cannot log in', async () => {
  await User.deleteMany({});
  await api('/register', { method: 'POST', body: customer });
  await User.updateOne({ email: customer.email }, { isActive: false });
  const res = await api('/login', { method: 'POST', body: { email: customer.email, password: customer.password } });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'AUTH_INACTIVE');
});

test('me returns the user for a valid access token and 401 without one', async () => {
  await User.deleteMany({});
  const reg = await api('/register', { method: 'POST', body: customer });
  const me = await api('/me', { token: reg.body.data.accessToken });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.email, customer.email);

  const noToken = await api('/me');
  assert.equal(noToken.status, 401);
  assert.equal(noToken.body.error.code, 'AUTH_REQUIRED');

  const badToken = await api('/me', { token: 'garbage' });
  assert.equal(badToken.status, 401);
  assert.equal(badToken.body.error.code, 'AUTH_INVALID_TOKEN');
});

test('refresh rotates the session and the old token cannot be replayed', async () => {
  await User.deleteMany({});
  const reg = await api('/register', { method: 'POST', body: customer });
  const first = refreshCookieFrom(reg.setCookie);

  const rotated = await api('/refresh', { method: 'POST', cookie: first });
  assert.equal(rotated.status, 200);
  assert.ok(rotated.body.data.accessToken);
  const second = refreshCookieFrom(rotated.setCookie);
  assert.ok(second);
  assert.notEqual(second, first);

  // Replaying the old (already rotated) token is reuse: all sessions die.
  const replay = await api('/refresh', { method: 'POST', cookie: first });
  assert.equal(replay.status, 401);
  const user = await User.findOne({ email: customer.email });
  assert.equal(await RefreshToken.countDocuments({ user: user._id }), 0);

  // And the rotated token is dead too now (reuse revoked everything).
  const afterRevoke = await api('/refresh', { method: 'POST', cookie: second });
  assert.equal(afterRevoke.status, 401);
});

test('logout revokes exactly its own session', async () => {
  await User.deleteMany({});
  const reg = await api('/register', { method: 'POST', body: customer });
  const cookie = refreshCookieFrom(reg.setCookie);

  const out = await api('/logout', { method: 'POST', cookie });
  assert.equal(out.status, 204);

  const reuse = await api('/refresh', { method: 'POST', cookie });
  assert.equal(reuse.status, 401);
});

test('refresh without a cookie is a clean 401', async () => {
  const res = await api('/refresh', { method: 'POST' });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'AUTH_INVALID_TOKEN');
});

test('password hash is never exposed through any endpoint', async () => {
  await User.deleteMany({});
  const reg = await api('/register', { method: 'POST', body: customer });
  assert.equal(reg.body.data.user.passwordHash, undefined);
  const me = await api('/me', { token: reg.body.data.accessToken });
  assert.equal(me.body.data.user.passwordHash, undefined);
});
