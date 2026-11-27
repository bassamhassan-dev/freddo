import './env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MenuItem from '../src/features/menu/menuItem.model.js';
import Category from '../src/features/catalog/category.model.js';
import User from '../src/features/auth/user.model.js';
import Order from '../src/features/orders/order.model.js';
import { planMenuImport, applyMenuImport } from '../src/seed/menuImport.js';
import { assertSafeToSeed } from '../src/seed/seedGuard.js';
import { realItems, categories } from '../src/seed/realMenu.js';

let mongod;
before(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri()); });
after(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => { await Promise.all([MenuItem.deleteMany({}), Category.deleteMany({}), User.deleteMany({}), Order.deleteMany({})]); });

const adminItem = { slug: 'my-special', name: { ar: 'مميز', en: 'Special' }, description: { ar: 'و', en: 'd' }, category: { slug: 'specials', name: { ar: 'خاص', en: 'Specials' } }, basePrice: 99, isAvailable: true, images: [{ url: 'https://res.cloudinary.com/x/mine.jpg' }] };

test('import is a dry run until applied, and adds only what is missing', async () => {
  await MenuItem.create(adminItem);
  await Category.create({ slug: 'specials', name: adminItem.category.name, sortOrder: 0 });
  const plan = await planMenuImport();
  assert.equal(plan.newItems.length, realItems.length);
  assert.equal(await MenuItem.countDocuments(), 1, 'planning writes nothing');
  const done = await applyMenuImport(plan);
  assert.equal(done.items, realItems.length);
  assert.equal(await Category.countDocuments(), categories.length + 1);
  assert.equal((await Category.findOne({ slug: 'specials' })).sortOrder, 0, 'existing category order kept');
  const mine = await MenuItem.findOne({ slug: 'my-special' });
  assert.equal(mine.isAvailable, true, 'admin item is never switched off');
  assert.equal(await User.countDocuments(), 0);
  assert.equal(await Order.countDocuments(), 0);
});

test('re-running changes nothing, and admin edits and uploaded photos survive', async () => {
  await applyMenuImport(await planMenuImport());
  await MenuItem.updateOne({ slug: 'latte' }, { $set: { basePrice: 95, isAvailable: false, images: [{ url: 'https://res.cloudinary.com/x/latte.jpg' }] } });
  const before = await MenuItem.countDocuments();
  const plan = await planMenuImport();
  assert.equal(plan.newItems.length, 0);
  assert.equal(plan.newCategories.length, 0);
  assert.deepEqual(plan.differs.map((d) => d.slug), ['latte'], 'a changed price is only reported');
  await applyMenuImport(plan);
  const latte = await MenuItem.findOne({ slug: 'latte' });
  assert.equal(latte.basePrice, 95);
  assert.equal(latte.isAvailable, false);
  assert.equal(latte.images[0].url, 'https://res.cloudinary.com/x/latte.jpg');
  assert.equal(await MenuItem.countDocuments(), before);
});

test('the demo seed refuses production, real users and real orders unless forced', async () => {
  await assert.rejects(assertSafeToSeed({ env: { NODE_ENV: 'production' }, argv: [] }), /production/);
  await assertSafeToSeed({ env: { NODE_ENV: 'production' }, argv: ['--force'] });
  await assertSafeToSeed({ env: {}, argv: [] }); // empty database is fine
  await User.create({ name: 'Demo', email: 'demo.customer@freddo.cafe', passwordHash: 'x'.repeat(20) });
  await User.create({ name: 'Boss', email: 'boss@freddo.cafe', passwordHash: 'x'.repeat(20) });
  await assertSafeToSeed({ env: { ADMIN_EMAIL: 'Boss@freddo.cafe' }, argv: [] }); // only seed users
  const real = await User.create({ name: 'Real Person', email: 'real@x.com', passwordHash: 'x'.repeat(20) });
  await assert.rejects(assertSafeToSeed({ env: { ADMIN_EMAIL: 'boss@freddo.cafe' }, argv: [] }), /non-seed user/);
  await assertSafeToSeed({ env: {}, argv: ['--force'] });
  await User.deleteOne({ _id: real._id });
  await Order.collection.insertOne({ orderNumber: 'FR-ABC123' });
  await assert.rejects(assertSafeToSeed({ env: { ADMIN_EMAIL: 'boss@freddo.cafe' }, argv: [] }), /real order/);
});

import { ensureAdmin } from '../src/seed/createAdmin.js';
test('create-admin makes one admin, never changes an existing account unless asked', async () => {
  await assert.rejects(ensureAdmin({ email: 'bad', password: 'longenough1' }), /ADMIN_EMAIL/);
  await assert.rejects(ensureAdmin({ email: 'a@x.com', password: 'short' }), /8 characters/);
  assert.equal((await ensureAdmin({ email: 'A@x.com', password: 'longenough1' })).status, 'created');
  const first = await User.findOne({ email: 'a@x.com' }).select('+passwordHash');
  assert.equal(first.role, 'admin');
  assert.equal((await ensureAdmin({ email: 'a@x.com', password: 'another-pass-2' })).status, 'exists');
  assert.equal((await User.findOne({ email: 'a@x.com' }).select('+passwordHash')).passwordHash, first.passwordHash);
  assert.equal((await ensureAdmin({ email: 'a@x.com', password: 'another-pass-2', resetPassword: true })).status, 'password-reset');
  assert.notEqual((await User.findOne({ email: 'a@x.com' }).select('+passwordHash')).passwordHash, first.passwordHash);
  await User.create({ name: 'Cust', email: 'c@x.com', passwordHash: 'x'.repeat(20) });
  await assert.rejects(ensureAdmin({ email: 'c@x.com', password: 'longenough1' }), /already exists as a customer/);
  assert.equal(await Order.countDocuments(), 0);
});
