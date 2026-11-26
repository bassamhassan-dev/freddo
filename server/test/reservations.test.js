import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import Table from '../src/features/reservations/table.model.js';
import Reservation from '../src/features/reservations/reservation.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Reservations (doc 10): booking rules, status machine, overlap protection.
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
  const user = await User.create({ name: 'Test', email, passwordHash, role });
  return { user, token: signAccessToken(user) };
}

// Tomorrow at 19:00 café time - always inside the booking window.
function tomorrowDate() {
  const d = new Date(Date.now() + 26 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
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
  await Table.deleteMany({});
  await Reservation.deleteMany({});
  await Table.create([
    { number: 'T1', capacity: 2, zone: 'indoor' },
    { number: 'T3', capacity: 4, zone: 'indoor' },
    { number: 'T6', capacity: 8, zone: 'outdoor' },
  ]);
});

test('a customer books a table for tomorrow evening', async () => {
  const { token } = await makeUser('c@freddo.com');

  const res = await api('/api/reservations', {
    method: 'POST',
    body: { date: tomorrowDate(), time: '19:00', guestCount: 4, notes: 'عند الشباك' },
    token,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.reservation.status, 'pending');
  assert.match(res.body.data.reservation.reservationNumber, /^RSV-/);

  const mine = await api('/api/reservations/mine', { token });
  assert.equal(mine.body.data.reservations.length, 1);
});

test('booking rules: hours, lead time, guest range, party fits a table', async () => {
  const { token } = await makeUser('c@freddo.com');
  const date = tomorrowDate();

  const late = await api('/api/reservations', { method: 'POST', body: { date, time: '23:30', guestCount: 2 }, token });
  assert.equal(late.body.error.code, 'OUTSIDE_HOURS');

  const today = new Date().toISOString().slice(0, 10);
  const soon = await api('/api/reservations', { method: 'POST', body: { date: today, time: '00:30', guestCount: 2 }, token });
  assert.ok(['TOO_SOON', 'OUTSIDE_HOURS'].includes(soon.body.error.code));

  const many = await api('/api/reservations', { method: 'POST', body: { date, time: '19:00', guestCount: 99 }, token });
  assert.equal(many.body.error.code, 'INVALID_GUESTS');

  const tooBig = await api('/api/reservations', { method: 'POST', body: { date, time: '19:00', guestCount: 10 }, token });
  assert.equal(tooBig.body.error.code, 'NO_CAPACITY');
});

test('guests cannot book; a customer sees only their own reservations', async () => {
  const { token } = await makeUser('c@freddo.com');
  const { token: other } = await makeUser('d@freddo.com');

  assert.equal((await api('/api/reservations', { method: 'POST', body: {} })).status, 401);

  await api('/api/reservations', { method: 'POST', body: { date: tomorrowDate(), time: '19:00', guestCount: 2 }, token });
  const others = await api('/api/reservations/mine', { token: other });
  assert.equal(others.body.data.reservations.length, 0);
});

test('customer cancels while pending only; admin confirms with a table', async () => {
  const { user, token } = await makeUser('c@freddo.com');
  const { token: admin } = await makeUser('a@freddo.com', ROLES.ADMIN);
  const table = await Table.findOne({ number: 'T3' });

  const created = await api('/api/reservations', {
    method: 'POST',
    body: { date: tomorrowDate(), time: '19:00', guestCount: 3 },
    token,
  });
  const id = created.body.data.reservation._id;

  // Confirm first: now the customer cannot self-cancel.
  const confirmed = await api(`/api/admin/reservations/${id}/status`, {
    method: 'POST',
    body: { to: 'confirmed', tableId: table._id },
    token: admin,
  });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.data.reservation.status, 'confirmed');

  const cancel = await api(`/api/reservations/${id}/cancel`, { method: 'POST', token });
  assert.equal(cancel.status, 409);

  // A pending one cancels fine.
  const second = await api('/api/reservations', {
    method: 'POST',
    body: { date: tomorrowDate(), time: '20:00', guestCount: 2 },
    token,
  });
  const cancelled = await api(`/api/reservations/${second.body.data.reservation._id}/cancel`, { method: 'POST', token });
  assert.equal(cancelled.body.data.reservation.status, 'cancelled');
});

test('overlap protection: the same table cannot double-book a slot', async () => {
  const { token } = await makeUser('c@freddo.com');
  const { token: admin } = await makeUser('a@freddo.com', ROLES.ADMIN);
  const table = await Table.findOne({ number: 'T3' });
  const date = tomorrowDate();

  const r1 = await api('/api/reservations', { method: 'POST', body: { date, time: '19:00', guestCount: 3 }, token });
  await api(`/api/admin/reservations/${r1.body.data.reservation._id}/status`, {
    method: 'POST', body: { to: 'confirmed', tableId: table._id }, token: admin,
  });

  // 20:00 overlaps the 19:00-21:00 slot on the same table.
  const r2 = await api('/api/reservations', { method: 'POST', body: { date, time: '20:00', guestCount: 3 }, token });
  const conflict = await api(`/api/admin/reservations/${r2.body.data.reservation._id}/status`, {
    method: 'POST', body: { to: 'confirmed', tableId: table._id }, token: admin,
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'TABLE_CONFLICT');

  // A bigger different table is fine.
  const t6 = await Table.findOne({ number: 'T6' });
  const ok = await api(`/api/admin/reservations/${r2.body.data.reservation._id}/status`, {
    method: 'POST', body: { to: 'confirmed', tableId: t6._id }, token: admin,
  });
  assert.equal(ok.status, 200);
});

test('table too small and bad transitions are rejected', async () => {
  const { token } = await makeUser('c@freddo.com');
  const { token: admin } = await makeUser('a@freddo.com', ROLES.ADMIN);
  const t1 = await Table.findOne({ number: 'T1' });

  const created = await api('/api/reservations', {
    method: 'POST',
    body: { date: tomorrowDate(), time: '19:00', guestCount: 4 },
    token,
  });
  const id = created.body.data.reservation._id;

  const small = await api(`/api/admin/reservations/${id}/status`, {
    method: 'POST', body: { to: 'confirmed', tableId: t1._id }, token: admin,
  });
  assert.equal(small.body.error.code, 'TABLE_TOO_SMALL');

  const bad = await api(`/api/admin/reservations/${id}/status`, {
    method: 'POST', body: { to: 'completed' }, token: admin,
  });
  assert.equal(bad.status, 409);

  assert.equal((await api(`/api/admin/reservations/${id}/status`, { method: 'POST', body: { to: 'confirmed', tableId: t1._id }, token })).status, 403);
});

test('admin filters by date and status, tables list is admin-only', async () => {
  const { token } = await makeUser('c@freddo.com');
  const { token: admin } = await makeUser('a@freddo.com', ROLES.ADMIN);

  await api('/api/reservations', { method: 'POST', body: { date: tomorrowDate(), time: '19:00', guestCount: 2 }, token });

  const byDate = await api(`/api/admin/reservations?date=${tomorrowDate()}`, { token: admin });
  assert.equal(byDate.body.data.reservations.length, 1);
  const byStatus = await api('/api/admin/reservations?status=confirmed', { token: admin });
  assert.equal(byStatus.body.data.reservations.length, 0);

  const tables = await api('/api/admin/tables', { token: admin });
  assert.equal(tables.body.data.tables.length, 3);
  assert.equal((await api('/api/admin/tables', { token })).status, 403);
});
