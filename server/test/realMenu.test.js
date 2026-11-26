import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import MenuItem from '../src/features/menu/menuItem.model.js';
import { categories, realItems } from '../src/seed/realMenu.js';

test('real menu data: unique slugs, known categories, valid documents, photos exist', () => {
  const slugs = realItems.map((i) => i.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const cats = new Set(categories.map((c) => c.slug));
  for (const { imageUrl, ...item } of realItems) {
    assert.ok(cats.has(item.category.slug), item.slug);
    assert.equal(new MenuItem(item).validateSync(), undefined, item.slug);
    assert.ok(fs.existsSync(new URL(`../../client/public${imageUrl}`, import.meta.url)), imageUrl);
  }
  // Items without a printed price must stay switched off.
  assert.ok(realItems.filter((i) => i.basePrice === 0).every((i) => !i.isAvailable));
});
