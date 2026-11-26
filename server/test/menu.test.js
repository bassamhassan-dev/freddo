import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import MenuItem from '../src/models/MenuItem.js';

// These tests run against a real MongoDB started in memory just for the
// test run (mongodb-memory-server). No connection string, no credentials,
// and nobody's real data is ever touched.
let mongod;
let server;
let baseUrl;

const sample = (overrides = {}) => ({
  slug: 'spanish-latte',
  name: { ar: 'سبانيش لاتيه', en: 'Spanish Latte' },
  description: { ar: 'وصف عربي', en: 'English description' },
  category: { slug: 'hot-coffee', name: { ar: 'قهوة ساخنة', en: 'Hot Coffee' } },
  basePrice: 75,
  variants: [{ label: { ar: 'وسط', en: 'Medium' }, price: 85 }],
  addOns: [{ name: { ar: 'شوت إضافي', en: 'Extra shot' }, price: 15 }],
  isFeatured: true,
  isAvailable: true,
  sortOrder: 1,
  rating: { average: 4.9, count: 318 },
  ...overrides,
});

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

test('GET /api/menu returns only available items, in display order', async () => {
  await MenuItem.deleteMany({});
  await MenuItem.create([
    sample({ slug: 'b-item', sortOrder: 2 }),
    sample({ slug: 'a-item', sortOrder: 1 }),
    sample({ slug: 'hidden-item', sortOrder: 0, isAvailable: false }),
  ]);

  const res = await fetch(`${baseUrl}/api/menu`);
  assert.equal(res.status, 200);
  const { items } = await res.json();
  assert.deepEqual(
    items.map((i) => i.slug),
    ['a-item', 'b-item']
  );
});

test('GET /api/menu?category filters by category slug', async () => {
  await MenuItem.deleteMany({});
  await MenuItem.create([
    sample({ slug: 'coffee' }),
    sample({
      slug: 'cake',
      category: { slug: 'desserts', name: { ar: 'حلويات', en: 'Desserts' } },
    }),
  ]);

  const res = await fetch(`${baseUrl}/api/menu?category=desserts`);
  const { items } = await res.json();
  assert.equal(items.length, 1);
  assert.equal(items[0].slug, 'cake');
});

test('GET /api/menu/:slug returns one available item without internal fields', async () => {
  await MenuItem.deleteMany({});
  await MenuItem.create(sample());

  const res = await fetch(`${baseUrl}/api/menu/spanish-latte`);
  assert.equal(res.status, 200);
  const { item } = await res.json();
  assert.equal(item.name.ar, 'سبانيش لاتيه');
  assert.equal(item.name.en, 'Spanish Latte');
  assert.equal(item.basePrice, 75);
  // The public DTO must not leak internals: no isAvailable flag,
  // no sortOrder, no Mongo _id or __v.
  assert.equal(item.isAvailable, undefined);
  assert.equal(item.sortOrder, undefined);
  assert.equal(item._id, undefined);
  assert.equal(item.__v, undefined);
});

test('GET /api/menu/:slug is 404 for unavailable and unknown items', async () => {
  await MenuItem.deleteMany({});
  await MenuItem.create(sample({ slug: 'off-menu', isAvailable: false }));

  for (const slug of ['off-menu', 'never-existed']) {
    const res = await fetch(`${baseUrl}/api/menu/${slug}`);
    assert.equal(res.status, 404);
    const { error } = await res.json();
    assert.equal(error.code, 'ITEM_NOT_FOUND');
    assert.ok(error.message.ar);
    assert.ok(error.message.en);
  }
});

test('model validation rejects an item missing either language', async () => {
  const noArabic = sample({ slug: 'no-ar', name: { en: 'Only English' } });
  await assert.rejects(MenuItem.create(noArabic), /ar/);

  const noEnglish = sample({ slug: 'no-en', description: { ar: 'عربي بس' } });
  await assert.rejects(MenuItem.create(noEnglish), /en/);
});

test('model validation rejects negative prices and bad slugs', async () => {
  await assert.rejects(MenuItem.create(sample({ slug: 'bad-slug!', basePrice: -5 })));
});

test('unknown API routes return the standard 404 shape', async () => {
  const res = await fetch(`${baseUrl}/api/nope`);
  assert.equal(res.status, 404);
  const { error } = await res.json();
  assert.equal(error.code, 'NOT_FOUND');
});
