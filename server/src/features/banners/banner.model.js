import mongoose from 'mongoose';

// Homepage banners (doc 5.2). Three fixed placements; the admin manages
// content, order, active state and an optional campaign window. Media
// handling (doc 16) plans Cloudinary, but no account is configured yet, so
// banners store a plain image URL for now - the Cloudinary publicId field
// is already here so the migration is additive, not breaking.
const localizedString = (required) => ({
  ar: { type: String, trim: true, maxlength: 200, required },
  en: { type: String, trim: true, maxlength: 200, required },
});

const bannerSchema = new mongoose.Schema(
  {
    placement: {
      type: String,
      enum: ['main', 'secondary_left', 'secondary_right', 'offers'],
      required: true,
      index: true,
    },
    title: localizedString(true),
    description: localizedString(false),
    imageUrl: { type: String, required: true, trim: true },
    cloudinaryPublicId: { type: String, trim: true },
    ctaText: localizedString(false),
    ctaLink: { type: String, trim: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { timestamps: true }
);

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
