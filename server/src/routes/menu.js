import { Router } from 'express';
import MenuItem from '../models/MenuItem.js';
import { ApiError } from '../middleware/errors.js';

const router = Router();

// GET /api/menu - the public menu.
// Only available items are returned: filtering happens here in the query,
// never on the client, so a disabled item cannot leak into a cart later.
// Optional ?category=<slug> narrows to one category (doc 6.7).
router.get('/', async (req, res, next) => {
  try {
    const filter = { isAvailable: true };
    const { category } = req.query;
    if (typeof category === 'string' && category.trim() !== '') {
      filter['category.slug'] = category.trim().toLowerCase();
    }
    const items = await MenuItem.find(filter).sort({ sortOrder: 1, 'name.en': 1 });
    res.json({ items: items.map((item) => item.toPublicJSON()) });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/:slug - one item for the product detail page.
router.get('/:slug', async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({
      slug: req.params.slug.toLowerCase(),
      isAvailable: true,
    });
    if (!item) {
      throw new ApiError(
        404,
        'ITEM_NOT_FOUND',
        'الصنف ده مش موجود في المنيو',
        'This item is not on the menu'
      );
    }
    res.json({ item: item.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
