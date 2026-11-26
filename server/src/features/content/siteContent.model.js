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
      // Optional: section keys only carry the enabled flag, copy and URL
      // keys fill these. Maxlength keeps the CMS lean on purpose.
      ar: { type: String, trim: true, maxlength: 500 },
      en: { type: String, trim: true, maxlength: 500 },
    },
    // For section keys: is this homepage section visible right now.
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SiteContent = mongoose.model('SiteContent', siteContentSchema);
export default SiteContent;
