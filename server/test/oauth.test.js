import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import RefreshToken from '../src/features/auth/refreshToken.model.js';
import { setProviderHttpForTests } from '../src/features/auth/oauth.providers.js';
import { signOAuthState } from '../src/features/auth/oauth.service.js';

// OAuth tests with a fully mocked provider HTTP layer (no network, no
// credentials): redirect shape, state CSRF guard, link-by-verified-email,
// create-on-new-email, and the rejection paths.
let mongod;
let server;
let baseUrl;

async function raw(path) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text).catch?.(() => null) ?? null : null };
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  process.env.GOOGLE_CLIENT_ID = 'gid';
  process.env.GOOGLE_CLIENT_SECRET = 'gsecret';
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})]);
  setProviderHttpForTests(null);
});

after(async () => {
  setProviderHttpForTests(null);
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('providers endpoint reflects configuration; unconfigured start is 503', async () => {
  const res = await fetch(`${baseUrl}/api/auth/oauth/providers`);
  const { data } = await res.json();
  assert.deepEqual(data.providers, { google: true, facebook: false });

  const fb = await fetch(`${baseUrl}/api/auth/oauth/facebook`, { redirect: 'manual' });
  assert.equal(fb.status, 503);
  assert.equal((await fb.json()).error.code, 'OAUTH_NOT_CONFIGURED');
});

test('start redirects to Google with a signed state', async () => {
  const res = await fetch(`${baseUrl}/api/auth/oauth/google`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  const location = new URL(res.headers.get('location'));
  assert.equal(location.origin + location.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(location.searchParams.get('client_id'), 'gid');
  assert.ok(location.searchParams.get('state'));
});

test('callback creates a customer for a new verified email and sets the refresh cookie', async () => {
  setProviderHttpForTests(async () => ({
    id: 'g-123', email: 'new@example.com', name: 'New Person', emailVerified: true,
  }));
  const state = signOAuthState('google');
  const res = await fetch(`${baseUrl}/api/auth/oauth/google/callback?code=abc&state=${state}`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.ok(res.headers.get('location').endsWith('/oauth/callback'));
  assert.match(res.headers.get('set-cookie'), /freddo_refresh=/);

  const user = await User.findOne({ email: 'new@example.com' });
  assert.ok(user);
  assert.equal(user.role, 'customer');
  assert.equal(user.oauthGoogleId, 'g-123');
});

test('callback links a verified email to the existing account instead of duplicating', async () => {
  const passwordHash = await User.hashPassword('secret123');
  const existing = await User.create({ name: 'Existing', email: 'have@example.com', passwordHash });
  setProviderHttpForTests(async () => ({
    id: 'g-999', email: 'have@example.com', name: 'H', emailVerified: true,
  }));
  const state = signOAuthState('google');
  await fetch(`${baseUrl}/api/auth/oauth/google/callback?code=abc&state=${state}`, { redirect: 'manual' });

  const after = await User.find({ email: 'have@example.com' });
  assert.equal(after.length, 1);
  assert.equal(after[0]._id.toString(), existing._id.toString());
  assert.equal(after[0].oauthGoogleId, 'g-999');
});

test('bad state, unverified email and missing email bounce back to login with an error code', async () => {
  const goodState = signOAuthState('google');

  const badState = await fetch(`${baseUrl}/api/auth/oauth/google/callback?code=abc&state=forged`, { redirect: 'manual' });
  assert.ok(badState.headers.get('location').includes('oauthError=OAUTH_STATE'));

  setProviderHttpForTests(async () => ({ id: 'g-1', email: 'u@example.com', name: 'U', emailVerified: false }));
  const unverified = await fetch(`${baseUrl}/api/auth/oauth/google/callback?code=abc&state=${goodState}`, { redirect: 'manual' });
  assert.ok(unverified.headers.get('location').includes('oauthError=OAUTH_EMAIL_UNVERIFIED'));

  setProviderHttpForTests(async () => ({ id: 'g-2', email: null, name: 'NoMail', emailVerified: false }));
  const noEmail = await fetch(`${baseUrl}/api/auth/oauth/google/callback?code=abc&state=${goodState}`, { redirect: 'manual' });
  assert.ok(noEmail.headers.get('location').includes('oauthError=OAUTH_EMAIL_REQUIRED'));

  assert.equal(await User.countDocuments(), 0); // none of the failures created anyone
});
