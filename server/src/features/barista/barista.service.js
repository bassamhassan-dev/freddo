import MenuItem from '../menu/menuItem.model.js';
import { AppError } from '../../utils/AppError.js';

// The barista workspace is read-only (requirements doc 2.3): it reads the
// same MenuItem collection as the public menu, but through staff
// serializers that are allowed to carry the internal recipe.

// Every item for the workspace grid - including unavailable ones, since a
// barista still needs the recipe for an item that is off the public menu.
export async function listWorkspaceItems() {
  const items = await MenuItem.find().sort({ sortOrder: 1, 'name.en': 1 });
  return items.map((item) => item.toBaristaCardJSON());
}

// One item's full recipe. A hidden recipe (doc 7.4) behaves exactly like a
// missing one: the workspace does not reveal that it exists.
export async function getRecipeBySlug(slug) {
  const item = await MenuItem.findOne({ slug: slug.toLowerCase() });
  if (!item || !item.recipe || !item.recipe.isVisible) {
    throw new AppError(404, 'RECIPE_NOT_FOUND', 'مفيش وصفة متاحة للصنف ده', 'No recipe available for this item');
  }
  return item.toRecipeJSON();
}
