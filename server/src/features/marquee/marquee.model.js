import mongoose from 'mongoose';

// The announcement marquee (Sprint 28): one singleton document holding the
// strip's on/off switch and its phrases in display order. Bilingual, admin
// managed, seeded with defaults. Kept out of the key-value content CMS
// because an ordered list does not fit the single-value content model.
const phraseSchema = new mongoose.Schema(
  {
    ar: { type: String, required: true, trim: true, maxlength: 120 },
    en: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { _id: false }
);

const marqueeSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true },
    isEnabled: { type: Boolean, default: true },
    phrases: { type: [phraseSchema], default: [] },
  },
  { timestamps: true }
);

const Marquee = mongoose.model('Marquee', marqueeSchema);
export default Marquee;
