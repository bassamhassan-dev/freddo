import Category from './category.model.js';
import MenuItem from '../menu/menuItem.model.js';
import { AppError } from '../../utils/AppError.js';
import { deleteImage } from '../uploads/cloudinary.service.js';

// Admin catalog management (Sprint 35): category CRUD + reorder, and menu
// item create / full update / delete. Validation is explicit and picks
// fields one by one - the request body is never spread into a document.

const bad = (code, ar, en) => new AppError(400, code, ar, en);
const notFound = (code, ar, en) => new AppError(404, code, ar, en);

const isText = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
const loc = (v, max, field) => {
  if (!v || !isText(v.ar, max) || !isText(v.en, max)) {
    throw bad('VALIDATION_ERROR', `املا ${field} بالعربي والإنجليزي`, `Fill ${field} in both Arabic and English`);
  }
  return { ar: v.ar.trim(), en: v.en.trim() };
};
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Existing databases already have items with embedded categories and no
// Category documents. This creates the missing ones (in first-seen order)
// so the admin screen works right after a deploy, no reseed needed.
export async function ensureCategories() {
  const known = new Set((await Category.find({}, 'slug').lean()).map((c) => c.slug));
  const items = await MenuItem.find({}, 'category').sort({ sortOrder: 1 }).lean();
  let next = await Category.countDocuments();
  for (const it of items) {
    if (it.category?.slug && !known.has(it.category.slug)) {
      known.add(it.category.slug);
      await Category.create({ slug: it.category.slug, name: it.category.name, sortOrder: next++ });
    }
  }
}

export async function listCategories() {
  await ensureCategories();
  const cats = await Category.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
  const counts = await MenuItem.aggregate([{ $group: { _id: '$category.slug', n: { $sum: 1 } } }]);
  const byslug = new Map(counts.map((c) => [c._id, c.n]));
  return cats.map((c) => ({ ...c, itemCount: byslug.get(c.slug) || 0 }));
}

export async function createCategory({ slug, name }) {
  const cleanName = loc(name, 60, 'اسم القسم');
  const finalSlug = slugify(slug || cleanName.en);
  if (!finalSlug) throw bad('VALIDATION_ERROR', 'اسم القسم بالإنجليزي لازم يكون حروف وأرقام', 'The English name needs letters or numbers');
  await ensureCategories();
  if (await Category.exists({ slug: finalSlug })) {
    throw new AppError(409, 'CATEGORY_EXISTS', 'القسم ده موجود بالفعل', 'This category already exists');
  }
  const sortOrder = await Category.countDocuments();
  return Category.create({ slug: finalSlug, name: cleanName, sortOrder });
}

// The slug stays fixed after creation (items and URLs point at it); only
// the names change, and the items' embedded copy is rewritten to match.
export async function updateCategory(id, { name }) {
  const cat = await Category.findById(id);
  if (!cat) throw notFound('CATEGORY_NOT_FOUND', 'القسم مش موجود', 'Category not found');
  cat.name = loc(name, 60, 'اسم القسم');
  await cat.save();
  await MenuItem.updateMany({ 'category.slug': cat.slug }, { $set: { 'category.name': cat.name } });
  return cat;
}

export async function reorderCategories(ids) {
  if (!Array.isArray(ids) || ids.some((i) => typeof i !== 'string')) {
    throw bad('VALIDATION_ERROR', 'ابعت ترتيب الأقسام', 'Send the category order');
  }
  await Promise.all(ids.map((id, index) => Category.updateOne({ _id: id }, { $set: { sortOrder: index } })));
}

export async function deleteCategory(id) {
  const cat = await Category.findById(id);
  if (!cat) throw notFound('CATEGORY_NOT_FOUND', 'القسم مش موجود', 'Category not found');
  if (await MenuItem.exists({ 'category.slug': cat.slug })) {
    throw new AppError(409, 'CATEGORY_NOT_EMPTY', 'القسم فيه أصناف، انقلها أو امسحها الأول', 'This category still has items - move or delete them first');
  }
  await cat.deleteOne();
}

// ---- menu items ----

const price = (v, field) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000) throw bad('VALIDATION_ERROR', `${field} لازم يكون رقم صحيح`, `${field} must be a valid number`);
  return n;
};

function cleanImageUrl(url) {
  if (url === undefined || url === null || url === '') return null;
  if (typeof url !== 'string' || url.length > 2000 || !(/^https:\/\/.+/.test(url) || /^\/[A-Za-z0-9][\w./-]*$/.test(url))) {
    throw bad('IMAGE_URL_INVALID', 'رابط الصورة غير صالح', 'Invalid image URL');
  }
  return url;
}

async function normalizeItem(body) {
  const b = body || {};
  const name = loc(b.name, 80, 'اسم الصنف');
  const description = loc(b.description, 500, 'الوصف');
  const cat = await Category.findOne({ slug: String(b.categorySlug || '').toLowerCase() });
  if (!cat) throw bad('CATEGORY_NOT_FOUND', 'اختار قسم موجود', 'Pick an existing category');
  const variants = (Array.isArray(b.variants) ? b.variants : []).slice(0, 10).map((v) => ({
    ...(v._id ? { _id: v._id } : {}),
    label: loc(v.label, 40, 'اسم الحجم'),
    price: price(v.price, 'سعر الحجم'),
    isAvailable: v.isAvailable !== false,
  }));
  const addOns = (Array.isArray(b.addOns) ? b.addOns : []).slice(0, 20).map((a) => ({
    ...(a._id ? { _id: a._id } : {}),
    name: loc(a.name, 40, 'اسم الإضافة'),
    price: price(a.price, 'سعر الإضافة'),
    isAvailable: a.isAvailable !== false,
  }));
  const imageUrl = cleanImageUrl(b.imageUrl);
  return {
    fields: {
      name,
      description,
      category: { slug: cat.slug, name: cat.name },
      basePrice: price(b.basePrice, 'السعر'),
      variants,
      addOns,
      isAvailable: b.isAvailable !== false,
      isDrink: b.isDrink === true,
      isFeatured: b.isFeatured === true,
      isBestSeller: b.isBestSeller === true,
    },
    imageUrl,
    slug: b.slug ? slugify(b.slug) : '',
  };
}

export async function createItem(body) {
  const { fields, imageUrl, slug } = await normalizeItem(body);
  const finalSlug = slug || slugify(fields.name.en);
  if (!finalSlug) throw bad('VALIDATION_ERROR', 'الاسم بالإنجليزي لازم يكون حروف وأرقام', 'The English name needs letters or numbers');
  if (await MenuItem.exists({ slug: finalSlug })) {
    throw new AppError(409, 'SLUG_TAKEN', 'فيه صنف بنفس الاسم', 'An item with this name already exists');
  }
  const sortOrder = await MenuItem.countDocuments();
  return MenuItem.create({
    ...fields,
    slug: finalSlug,
    sortOrder,
    images: imageUrl ? [{ url: imageUrl, alt: fields.name }] : [],
  });
}

// Full update. The slug never changes (links and carts use it); the image
// is only touched when a new URL is sent; the recipe is left alone.
export async function updateItem(id, body) {
  const item = await MenuItem.findById(id);
  if (!item) throw notFound('ITEM_NOT_FOUND', 'الصنف ده مش موجود', 'This item does not exist');
  const { fields, imageUrl } = await normalizeItem(body);
  Object.assign(item, fields);
  let previous;
  if (imageUrl && item.images?.[0]?.url !== imageUrl) {
    previous = item.images?.[0];
    item.images = [{ url: imageUrl, alt: fields.name }];
  }
  await item.save();
  if (previous?.storageId) await deleteImage(previous.storageId).catch(() => {});
  return item;
}

export async function deleteItem(id) {
  const item = await MenuItem.findById(id);
  if (!item) throw notFound('ITEM_NOT_FOUND', 'الصنف ده مش موجود', 'This item does not exist');
  await item.deleteOne();
  if (item.images?.[0]?.storageId) await deleteImage(item.images[0].storageId).catch(() => {});
}
