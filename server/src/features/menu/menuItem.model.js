import mongoose from 'mongoose';

// A bilingual text field: the same content in Arabic and English.
// Both are required so no item can go live missing one of the two
// languages - the menu is bilingual from day one, not translated later.
const localizedString = (options = {}) =>
  new mongoose.Schema(
    {
      ar: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    { _id: false, ...options }
  );

// Variants stay embedded inside MenuItem (requirements doc 6.3): sizes like
// Small/Medium/Large are never managed on their own, so a separate
// collection would only add joins with no benefit.
const variantSchema = new mongoose.Schema(
  {
    label: { type: localizedString(), required: true },
    price: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: true }
);

// Add-ons are embedded too (doc 6.4): extra shot, syrup, alternative milk.
const addOnSchema = new mongoose.Schema(
  {
    name: { type: localizedString(), required: true },
    price: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: true }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    // Where the file lives in storage later (S3/Cloudinary id). Optional
    // now, so Sprint 1 can use plain URLs.
    storageId: { type: String, trim: true },
    alt: localizedString(),
  },
  { _id: false }
);


// Internal recipe (requirements doc 7.2): staff-only, never serialized by
// toPublicJSON. Variant-specific quantities (doc 7.3) are deliberately not
// a separate structure yet: the notes field carries per-size differences
// ("double = 2 shots") until real usage justifies a formal shape. Ingredient
// inventory tracking is out of scope per the doc.
const ingredientSchema = new mongoose.Schema(
  {
    name: { type: localizedString(), required: true },
    quantity: { type: Number, required: true, min: 0 },
    // Free unit string kept intentionally small and consistent by seed
    // data (ml, g, shot, piece, pump). A unit registry is overkill now.
    unit: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    // Admin can hide a recipe from baristas without deleting it (doc 7.4).
    isVisible: { type: Boolean, default: true },
    ingredients: { type: [ingredientSchema], default: [] },
    // Ordered preparation steps.
    steps: { type: [localizedString()], default: [] },
    notes: localizedString(),
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    // URL-safe unique identifier, used by the public detail endpoint
    // instead of exposing Mongo's internal _id.
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    name: { type: localizedString(), required: true },
    description: { type: localizedString(), required: true },
    // Category is embedded for now: one slug + bilingual display name.
    // The requirements doc wants admin-managed categories with images and
    // ordering; that becomes its own collection in the admin sprint, and
    // items will reference it. Until then this keeps the menu usable
    // without building admin tooling first.
    category: {
      slug: { type: String, required: true, lowercase: true, trim: true },
      name: { type: localizedString(), required: true },
    },
    images: { type: [imageSchema], default: [] },
    basePrice: { type: Number, required: true, min: 0 },
    variants: { type: [variantSchema], default: [] },
    addOns: { type: [addOnSchema], default: [] },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    // Optional: food items may not have a preparation recipe at all.
    recipe: { type: recipeSchema },
    sortOrder: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

// The public menu is always read through this index: available items
// ordered for display.
menuItemSchema.index({ isAvailable: 1, sortOrder: 1 });

// Explicit public serializer (requirements doc 7.5): the API returns only
// what a customer is allowed to see, picked field by field. Anything added
// to the schema later - internal notes, cost, recipe links - stays out of
// the API unless it is added here on purpose.
menuItemSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    slug: this.slug,
    name: this.name,
    description: this.description,
    category: this.category,
    images: this.images,
    basePrice: this.basePrice,
    variants: this.variants,
    addOns: this.addOns,
    isFeatured: this.isFeatured,
    isBestSeller: this.isBestSeller,
    rating: this.rating,
  };
};


// Barista card: everything the workspace grid needs, without the recipe
// body. The recipe loads separately when a barista opens a card.
menuItemSchema.methods.toBaristaCardJSON = function toBaristaCardJSON() {
  return {
    slug: this.slug,
    name: this.name,
    category: this.category,
    images: this.images,
    isAvailable: this.isAvailable,
    hasVisibleRecipe: Boolean(this.recipe && this.recipe.isVisible),
  };
};

// Full internal recipe for one item. Only reached through the barista
// endpoints behind requireRole('barista', 'admin').
menuItemSchema.methods.toRecipeJSON = function toRecipeJSON() {
  return {
    slug: this.slug,
    name: this.name,
    category: this.category,
    recipe: this.recipe,
  };
};

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;
