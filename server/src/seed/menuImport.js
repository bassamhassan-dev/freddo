import MenuItem from '../features/menu/menuItem.model.js';
import Category from '../features/catalog/category.model.js';
import { categories, realItems } from './realMenu.js';

// Safe import of the printed Freddo menu. It only ADDS what is missing:
// - a category that does not exist yet is created at the end of the order;
// - an item whose slug does not exist yet is created, with its photo;
// - anything that already exists is left exactly as it is (admin edits,
//   uploaded photos, prices) and only reported when it differs.
// It never disables, deletes or reorders anything, and it never touches
// users or orders. Without apply=true it only returns the plan.
export async function planMenuImport() {
  const haveCats = new Set((await Category.find({}, 'slug').lean()).map((c) => c.slug));
  const existing = new Map((await MenuItem.find({}, 'slug basePrice name').lean()).map((i) => [i.slug, i]));
  const plan = { newCategories: [], newItems: [], skipped: [], differs: [] };
  for (const c of categories) if (!haveCats.has(c.slug)) plan.newCategories.push(c);
  for (const item of realItems) {
    const found = existing.get(item.slug);
    if (!found) plan.newItems.push(item);
    else {
      plan.skipped.push(item.slug);
      if (found.basePrice !== item.basePrice || found.name?.en !== item.name.en) {
        plan.differs.push({ slug: item.slug, db: `${found.name?.en} / ${found.basePrice}`, menu: `${item.name.en} / ${item.basePrice}` });
      }
    }
  }
  return plan;
}

export async function applyMenuImport(plan) {
  let next = await Category.countDocuments();
  for (const c of plan.newCategories) {
    await Category.create({ slug: c.slug, name: c.name, sortOrder: next++ });
  }
  const base = await MenuItem.countDocuments();
  let n = 0;
  for (const { imageUrl, ...item } of plan.newItems) {
    // $setOnInsert: if the item appeared meanwhile, nothing is overwritten.
    await MenuItem.updateOne(
      { slug: item.slug },
      { $setOnInsert: { ...item, sortOrder: base + n, images: [{ url: imageUrl, alt: item.name }] } },
      { upsert: true }
    );
    n += 1;
  }
  return { categories: plan.newCategories.length, items: plan.newItems.length };
}
