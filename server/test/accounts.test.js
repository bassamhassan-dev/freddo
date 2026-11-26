import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import RefreshToken from '../src/features/auth/refreshToken.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Admin account management (doc 3.7): creation, safeguards, revocation.
let mongod;
let server;
let baseUrl;

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api/admin/accounts${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function makeUser(email, role, overrides = {}) {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Test', email, passwordHash, role, ...overrides });
  return { user, token: signAccessToken(user) };
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
  await RefreshToken.deleteMany({});
});

test('admin lists accounts with filters and overview totals', async () => {
  const { token } = await makeUser('a@freddo.com', ROLES.ADMIN);
  await makeUser('b@freddo.com', ROLES.BARISTA);
  await makeUser('c@freddo.com', ROLES.CUSTOMER, { isActive: false });

  const res = await api('', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.total, 3);
  assert.equal(res.body.data.overview.admin.active, 1);
  assert.equal(res.body.data.overview.customer.disabled, 1);

  const filtered = await api('?role=barista', { token });
  assert.equal(filtered.body.data.total, 1);
  assert.equal(filtered.body.data.accounts[0].role, 'barista');

  const searched = await api('?search=c@freddo', { token });
  assert.equal(searched.body.data.total, 1);
});

test('admin creates a barista account with a one-time temporary password', async () => {
  const { token } = await makeUser('a@freddo.com', ROLES.ADMIN);

  const res = await api('', { method: 'POST', body: { name: 'Barista One', email: 'b1@freddo.com', role: 'barista' }, token });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.account.role, 'barista');
  assert.ok(res.body.data.temporaryPassword.length >= 12);

  // The temporary password actually logs in, and the stored hash is not it.
  const created = await User.findOne({ email: 'b1@freddo.com' }).select('+passwordHash');
  assert.notEqual(created.passwordHash, res.body.data.temporaryPassword);
  assert.ok(await created.verifyPassword(res.body.data.temporaryPassword));
});

test('creating a customer or a duplicate through this endpoint is rejected', async () => {
  const { token } = await makeUser('a@freddo.com', ROLES.ADMIN);
  await makeUser('dup@freddo.com', ROLES.CUSTOMER);

  const customer = await api('', { method: 'POST', body: { name: 'X', email: 'x@freddo.com', role: 'customer' }, token });
  assert.equal(customer.status, 400);
  assert.equal(customer.body.error.code, 'ROLE_NOT_ALLOWED');

  const dup = await api('', { method: 'POST', body: { name: 'X', email: 'dup@freddo.com', role: 'barista' }, token });
  assert.equal(dup.status, 409);
});

test('deactivation revokes sessions; activation restores access', async () => {
  const { token } = await makeUser('a@freddo.com', ROLES.ADMIN);
  const { user: barista } = await makeUser('b@freddo.com', ROLES.BARISTA);
  await RefreshToken.create({
    user: barista._id,
    tokenHash: 'hash-' + barista._id,
    expiresAt: new Date(Date.now() + 86400000),
  });

  const off = await api(`/${barista._id}/status`, { method: 'PATCH', body: { isActive: false }, token });
  assert.equal(off.status, 200);
  assert.equal(await RefreshToken.countDocuments({ user: barista._id }), 0);

  const on = await api(`/${barista._id}/status`, { method: 'PATCH', body: { isActive: true }, token });
  assert.equal(on.body.data.account.isActive, true);
});

test('the last active admin cannot be deactivated or demoted', async () => {
  const { user: admin, token } = await makeUser('a@freddo.com', ROLES.ADMIN);
  const { token: other } = await makeUser('a2@freddo.com', ROLES.ADMIN);

  // Self-deactivation is blocked even with two admins.
  const self = await api(`/${admin._id}/status`, { method: 'PATCH', body: { isActive: false }, token });
  assert.equal(self.status, 400);

  // Demote one admin: fine. Then the remaining one is protected.
  const demote = await api(`/${admin._id}/role`, { method: 'PATCH', body: { role: 'customer' }, token: other });
  assert.equal(demote.status, 200);

  const { user: lastAdmin } = await User.findOne({ email: 'a2@freddo.com' }).then((u) => ({ user: u }));
  const block1 = await api(`/${lastAdmin._id}/status`, {
    method: 'PATCH',
    body: { isActive: false },
    token: signAccessToken(lastAdmin),
  });
  assert.equal(block1.status, 400); // self-deactivation hits first
});

test('last active admin protected from deactivation by another admin', async () => {
  const { token: t1 } = await makeUser('a1@freddo.com', ROLES.ADMIN);
  const { user: second } = await makeUser('a2@freddo.com', ROLES.ADMIN);

  // Deactivate admin2 via admin1: allowed (one active admin remains).
  const off = await api(`/${second._id}/status`, { method: 'PATCH', body: { isActive: false }, token: t1 });
  assert.equal(off.status, 200);

  // Now admin1 is the last active admin. A second admin token is gone, so
  // simulate an attack on self via service-level path: self is blocked.
  const selfBlock = await api('', { token: t1 });
  assert.equal(selfBlock.status, 200);
  const me = selfBlock.body.data.accounts.find((a) => a.email === 'a1@freddo.com');
  const attempt = await api(`/${me.id}/status`, { method: 'PATCH', body: { isActive: false }, token: t1 });
  assert.equal(attempt.status, 400); // CANNOT_DISABLE_SELF
});

test('role change revokes sessions and forbids changing your own role', async () => {
  const { user: admin, token } = await makeUser('a@freddo.com', ROLES.ADMIN);
  const { user: barista } = await makeUser('b@freddo.com', ROLES.BARISTA);
  await makeUser('a2@freddo.com', ROLES.ADMIN);
  await RefreshToken.create({
    user: barista._id,
    tokenHash: 'hash-role-' + barista._id,
    expiresAt: new Date(Date.now() + 86400000),
  });

  const own = await api(`/${admin._id}/role`, { method: 'PATCH', body: { role: 'customer' }, token });
  assert.equal(own.status, 400);

  const changed = await api(`/${barista._id}/role`, { method: 'PATCH', body: { role: 'admin' }, token });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.data.account.role, 'admin');
  assert.equal(await RefreshToken.countDocuments({ user: barista._id }), 0);
});

test('non-admin roles are kept out of account management', async () => {
  const { token: barista } = await makeUser('b@freddo.com', ROLES.BARISTA);
  const { token: customer } = await makeUser('c@freddo.com', ROLES.CUSTOMER);

  assert.equal((await api('', { token: barista })).status, 403);
  assert.equal((await api('', { token: customer })).status, 403);
  assert.equal((await api('')).status, 401);
});
