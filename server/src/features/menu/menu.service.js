import MenuItem from './menuItem.model.js';
import Category from '../catalog/category.model.js';
import { AppError } from '../../utils/AppError.js';

// The menu's business logic lives here and only here. The service knows
// nothing about HTTP (no req/res), which is what keeps these rules testable
// and reusable from a future admin controller, a seed script or a queue job.
//
// The rule that matters most: unavailable items are filtered in the
// database query itself, never on the client, so a disabled item cannot
// leak into a menu or a cart later.

// The public menu: available items in display order, optionally narrowed
// to one category slug (requirements doc 6.7). `category` arrives already
// trimmed and non-empty from the controller.
export async function listAvailableItems({ category } = {}) {
  const filter = { isAvailable: true };
  if (category) filter['category.slug'] = category.toLowerCase();
  const items = await MenuItem.find(filter).sort({ sortOrder: 1, 'name.en': 1 });
  // Admin-controlled category order (Sprint 35): stable sort, so items
  // keep their own order inside each category. Unknown slugs go last.
  const order = new Map((await Category.find({}, 'slug sortOrder').lean()).map((c) => [c.slug, c.sortOrder]));
  items.sort((a, b) => (order.get(a.category.slug) ?? 1e9) - (order.get(b.category.slug) ?? 1e9));
  return items.map((item) => item.toPublicJSON());
}

// One item for the product detail page. Unavailable and unknown slugs get
// the same 404: the public API does not reveal that a hidden item exists.
export async function getAvailableItemBySlug(slug) {
  const item = await MenuItem.findOne({ slug: slug.toLowerCase(), isAvailable: true });
  if (!item) {
    throw new AppError(
      404,
      'ITEM_NOT_FOUND',
      'الصنف ده مش موجود في المنيو',
      'This item is not on the menu'
    );
  }
  return item.toPublicJSON();
}
