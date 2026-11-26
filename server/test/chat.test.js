import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as connectSocket } from 'socket.io-client';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import { ChatConversation, ChatMessage } from '../src/features/chat/chat.model.js';
import { attachChatSocket } from '../src/features/chat/chat.socket.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// Support chat (Sprint 26): REST history + unread counters + the live
// socket round trip, customer and admin sides.
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
  const res = await fetch(`${baseUrl}/api/chat${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function openSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = connectSocket(baseUrl, { auth: { token }, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  server = createServer(app);
  attachChatSocket(server);
  await new Promise((resolve) => {
    server.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await ChatConversation.deleteMany({});
  await ChatMessage.deleteMany({});
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('customer sends over REST, admin lists with unread, reads and replies; counters move both ways', async () => {
  const customer = await makeUser('chat-c@example.com', ROLES.CUSTOMER);
  const admin = await makeUser('chat-a@example.com', ROLES.ADMIN);

  const sent = await api('/mine/messages', { method: 'POST', token: customer.token, body: { text: 'عندكم واي فاي؟' } });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.data.message.senderRole, 'customer');

  // Empty messages are rejected.
  const empty = await api('/mine/messages', { method: 'POST', token: customer.token, body: { text: '  ' } });
  assert.equal(empty.status, 400);

  const list = await api('/admin', { token: admin.token });
  assert.equal(list.status, 200);
  assert.equal(list.body.data.conversations.length, 1);
  assert.equal(list.body.data.conversations[0].unreadForAdmin, 1);
  assert.equal(list.body.data.conversations[0].lastMessagePreview, 'عندكم واي فاي؟');
  const conversationId = list.body.data.conversations[0].id;

  // Reading the thread clears the admin counter.
  await api(`/admin/${conversationId}/read`, { method: 'POST', token: admin.token });
  const after1 = await api('/admin', { token: admin.token });
  assert.equal(after1.body.data.conversations[0].unreadForAdmin, 0);

  // Admin replies; the customer's counter moves.
  const reply = await api(`/admin/${conversationId}/messages`, { method: 'POST', token: admin.token, body: { text: 'أيوه طبعاً، اتفضل' } });
  assert.equal(reply.status, 201);
  const mine = await api('/mine', { token: customer.token });
  assert.equal(mine.body.data.conversation.unreadForCustomer, 1);
  assert.equal(mine.body.data.messages.length, 2);

  // Role enforcement: a customer cannot read the admin list.
  const forbidden = await api('/admin', { token: customer.token });
  assert.equal(forbidden.status, 403);
});

test('socket round trip: customer message reaches the admins room live', async () => {
  const customer = await makeUser('chat-c2@example.com', ROLES.CUSTOMER);
  const admin = await makeUser('chat-a2@example.com', ROLES.ADMIN);

  const adminSocket = await openSocket(admin.token);
  const customerSocket = await openSocket(customer.token);

  const received = new Promise((resolve) => adminSocket.on('chat:message', resolve));
  const ack = await customerSocket.emitWithAck('chat:send', { text: 'الأوردر بتاعي اتأخر' });
  assert.equal(ack.ok, true);

  const payload = await received;
  assert.equal(payload.message.text, 'الأوردر بتاعي اتأخر');
  assert.equal(payload.message.senderRole, 'customer');
  assert.equal(payload.message.senderName, customer.user.name); // S29 identity snapshot
  assert.equal(ack.message.senderName, customer.user.name);
  assert.ok(payload.conversationId);

  // Persisted too - the next REST history read sees the socket message.
  const history = await api('/mine', { token: customer.token });
  assert.equal(history.body.data.messages.length, 1);
  assert.equal(history.body.data.messages[0].senderName, customer.user.name);

  adminSocket.close();
  customerSocket.close();
});

test('a socket without a valid token is rejected', async () => {
  await assert.rejects(openSocket('not-a-token'));
});

// Regression (S26 runtime bug): the client emits chat:join with an OBJECT
// { conversationId }, and the handler used to pass it straight into
// findOne at path _id - CastError on Bassam's machine, uncovered by tests.
test('admin joins and replies over the socket with the client payload shape', async () => {
  const customer = await makeUser('chat-c3@example.com', ROLES.CUSTOMER);
  const admin = await makeUser('chat-a3@example.com', ROLES.ADMIN);

  const sent = await api('/mine/messages', { method: 'POST', token: customer.token, body: { text: 'لو سمحت' } });
  assert.equal(sent.status, 201);
  const list = await api('/admin', { token: admin.token });
  const conversationId = list.body.data.conversations[0].id;
  assert.equal(list.body.data.conversations[0].unreadForAdmin, 1);

  const adminSocket = await openSocket(admin.token);
  const customerSocket = await openSocket(customer.token);

  // The exact client emit: an object payload, not a bare string.
  const joinAck = await adminSocket.emitWithAck('chat:join', { conversationId });
  assert.equal(joinAck.ok, true);

  // Joining cleared the admin unread counter.
  const after = await api('/admin', { token: admin.token });
  assert.equal(after.body.data.conversations[0].unreadForAdmin, 0);

  // Admin sends over the socket with the client body shape; the customer,
  // sitting in the conversation room, receives it live.
  const received = new Promise((resolve) => customerSocket.on('chat:message', resolve));
  const sendAck = await adminSocket.emitWithAck('chat:send', { conversationId, text: 'أهلاً، أمرك؟' });
  assert.equal(sendAck.ok, true);
  const payload = await received;
  assert.equal(payload.message.text, 'أهلاً، أمرك؟');
  assert.equal(payload.message.senderRole, 'admin');

  const history = await api(`/admin/${conversationId}/messages`, { token: admin.token });
  assert.equal(history.body.data.messages.length, 2);

  adminSocket.close();
  customerSocket.close();
});
