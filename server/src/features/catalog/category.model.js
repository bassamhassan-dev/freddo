import mongoose from 'mongoose';

// Admin-managed menu category (Sprint 35). Items keep an embedded
// { slug, name } snapshot of their category, so the public menu JSON and
// every existing client keep working unchanged. This collection owns the
// display order and the names; renaming a category rewrites the snapshot
// on its items (see catalog.service.js).
const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    name: {
      ar: { type: String, required: true, trim: true, maxlength: 60 },
      en: { type: String, required: true, trim: true, maxlength: 60 },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
