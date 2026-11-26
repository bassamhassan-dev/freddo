import mongoose from 'mongoose';

// Editable site copy (admin CMS). One document per key; the value is
// bilingual like every other content field in the project. Only overrides
// live here: when a key has no document, the client falls back to the
// built-in i18n copy, so the DB can stay empty until the admin edits
// something. Keys are whitelisted in the controller - no free-form storage.
const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: {
      ar: { type: String, trim: true, maxlength: 500, required: true },
      en: { type: String, trim: true, maxlength: 500, required: true },
    },
  },
  { timestamps: true }
);

const SiteContent = mongoose.model('SiteContent', siteContentSchema);
export default SiteContent;
