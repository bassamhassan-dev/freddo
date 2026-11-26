import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/features/auth/user.model.js';
import MenuItem from '../src/features/menu/menuItem.model.js';
import { ROLES } from '../src/utils/roles.js';
import { signAccessToken } from '../src/utils/tokens.js';

// The barista workspace: staff-only recipes, role enforcement, and the
// privacy rule that public endpoints never serialize recipe data.
let mongod;
let server;
let baseUrl;

async function api(path, { token } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function makeUser(email, role) {
  const passwordHash = await User.hashPassword('secret123');
  const user = await User.create({ name: 'Test', email, passwordHash, role });
  return { user, token: signAccessToken(user) };
}

const recipe = {
  ingredients: [{ name: { ar: 'بن', en: 'Beans' }, quantity: 18, unit: 'g' }],
  steps: [{ ar: 'اطحن', en: 'Grind' }],
  notes: { ar: 'ملاحظة', en: 'Note' },
};

async function makeItem(slug, overrides = {}) {
  return MenuItem.create({
    slug,
    name: { ar: 'صنف', en: 'Item' },
    description: { ar: 'وصف', en: 'Desc' },
    category: { slug: 'hot-coffee', name: { ar: 'قهوة', en: 'Coffee' } },
    basePrice: 50,
    recipe,
    ...overrides,
  });
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
  await MenuItem.deleteMany({});
});

test('barista lists all workspace items including unavailable ones, without recipe bodies', async () => {
  await makeItem('latte');
  await makeItem('off-item', { isAvailable: false });
  const { token } = await makeUser('b@freddo.com', ROLES.BARISTA);

  const res = await api('/api/barista/items', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.items.length, 2);
  assert.equal(res.body.data.items[0].hasVisibleRecipe, true);
  assert.equal(res.body.data.items[0].recipe, undefined);
});

test('barista reads a full recipe', async () => {
  await makeItem('latte');
  const { token } = await makeUser('b@freddo.com', ROLES.BARISTA);

  const res = await api('/api/barista/items/latte/recipe', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.recipe.ingredients[0].unit, 'g');
  assert.equal(res.body.data.recipe.steps.length, 1);
});

test('a hidden recipe behaves like a missing one', async () => {
  await makeItem('secret', { recipe: { ...recipe, isVisible: false } });
  const { token } = await makeUser('b@freddo.com', ROLES.BARISTA);

  const res = await api('/api/barista/items/secret/recipe', { token });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'RECIPE_NOT_FOUND');

  const list = await api('/api/barista/items', { token });
  assert.equal(list.body.data.items[0].hasVisibleRecipe, false);
});

test('customers and guests are kept out of the workspace', async () => {
  await makeItem('latte');
  const { token } = await makeUser('c@freddo.com', ROLES.CUSTOMER);

  assert.equal((await api('/api/barista/items', { token })).status, 403);
  assert.equal((await api('/api/barista/items')).status, 401);
  assert.equal((await api('/api/barista/items/latte/recipe', { token })).status, 403);
});

test('admin stays authorized on barista endpoints (doc 7.5)', async () => {
  await makeItem('latte');
  const { token } = await makeUser('a@freddo.com', ROLES.ADMIN);

  assert.equal((await api('/api/barista/items', { token })).status, 200);
  assert.equal((await api('/api/barista/items/latte/recipe', { token })).status, 200);
});

test('public menu and item detail never serialize recipe fields (doc 7.5)', async () => {
  await makeItem('latte');

  const menu = await api('/api/menu');
  assert.equal(menu.status, 200);
  assert.equal(JSON.stringify(menu.body).includes('ingredients'), false);

  const detail = await api('/api/menu/latte');
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.recipe, undefined);
});
