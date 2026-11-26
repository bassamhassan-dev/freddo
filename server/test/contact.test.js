import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import ContactMessage from '../src/features/contact/contactMessage.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Contact messages (doc 11): public intake, admin-only reading, statuses.
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

const validMessage = {
  name: 'زائر',
  email: 'guest@example.com',
  subject: 'اقتراح',
  message: 'ياريت تضيفوا فرع في سموحة.',
};

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
  await ContactMessage.deleteMany({});
});

async function makeAdmin() {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Admin', email: 'a@freddo.com', passwordHash, role: ROLES.ADMIN });
  return { user, token: signAccessToken(user) };
}

test('a guest sends a message; the response carries no record data', async () => {
  const res = await api('/api/contact', { method: 'POST', body: validMessage });
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.data, { received: true });
  assert.equal(await ContactMessage.countDocuments(), 1);
});

test('missing fields and bad emails are rejected', async () => {
  const empty = await api('/api/contact', { method: 'POST', body: { name: 'زائر' } });
  assert.equal(empty.status, 400);

  const badEmail = await api('/api/contact', { method: 'POST', body: { ...validMessage, email: 'not-an-email' } });
  assert.equal(badEmail.status, 400);
});

test('admin lists, filters, marks read and archives', async () => {
  const { token } = await makeAdmin();
  await api('/api/contact', { method: 'POST', body: validMessage });
  await api('/api/contact', { method: 'POST', body: { ...validMessage, subject: 'شكوى خدمة' } });

  const all = await api('/api/admin/contact', { token });
  assert.equal(all.body.data.messages.length, 2);

  const searched = await api('/api/admin/contact?search=شكوى', { token });
  assert.equal(searched.body.data.messages.length, 1);

  const id = all.body.data.messages[0]._id;
  const read = await api(`/api/admin/contact/${id}`, { method: 'PATCH', body: { status: 'read' }, token });
  assert.equal(read.body.data.message.status, 'read');
  assert.ok(read.body.data.message.readAt);

  await api(`/api/admin/contact/${id}`, { method: 'PATCH', body: { status: 'archived', adminNotes: 'اترد عليه' }, token });
  const archivedOnly = await api('/api/admin/contact?status=archived', { token });
  assert.equal(archivedOnly.body.data.messages.length, 1);
  assert.equal(archivedOnly.body.data.messages[0].adminNotes, 'اترد عليه');
});

test('messages are never public: customers and guests cannot list them', async () => {
  const passwordHash = await User.hashPassword('secret123');
  const customer = await User.create({ name: 'Cust', email: 'c@freddo.com', passwordHash, role: ROLES.CUSTOMER });

  assert.equal((await api('/api/admin/contact')).status, 401);
  assert.equal((await api('/api/admin/contact', { token: signAccessToken(customer) })).status, 403);
});
