import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import Banner from './banner.model.js';
import { deleteImage } from '../uploads/cloudinary.service.js';

const PLACEMENTS = ['main', 'secondary_left', 'secondary_right'];

// Links must be http(s) URLs or site-relative paths (doc 5.3: validate).
const isValidLink = (value) =>
  /^https?:\/\/.+/.test(value) || (/^\//.test(value) && !/^\/\//.test(value));

// GET /api/banners?placement=main - public: only active banners inside
// their campaign window, in display order (doc 5.3).
export const listPublic = catchAsync(async (req, res) => {
  const { placement } = req.query;
  if (!PLACEMENTS.includes(placement)) {
    throw new AppError(400, 'VALIDATION', 'مكان البانر مش صحيح', 'Invalid banner placement');
  }
  const now = new Date();
  const banners = await Banner.find({
    placement,
    active: true,
    $and: [
      { $or: [{ startAt: { $exists: false } }, { startAt: null }, { startAt: { $lte: now } }] },
      { $or: [{ endAt: { $exists: false } }, { endAt: null }, { endAt: { $gte: now } }] },
    ],
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  sendSuccess(res, 200, { banners });
});

export const adminList = catchAsync(async (req, res) => {
  const banners = await Banner.find({}).sort({ placement: 1, sortOrder: 1, createdAt: 1 }).lean();
  sendSuccess(res, 200, { banners });
});

function validatePayload(body) {
  if (!body || !PLACEMENTS.includes(body.placement)) {
    throw new AppError(400, 'VALIDATION', 'مكان البانر مش صحيح', 'Invalid banner placement');
  }
  if (!body.imageUrl || !/^https?:\/\/.+/.test(body.imageUrl)) {
    throw new AppError(400, 'INVALID_IMAGE', 'رابط الصورة مش صحيح', 'The image URL is invalid');
  }
  if (body.ctaLink && !isValidLink(body.ctaLink)) {
    throw new AppError(400, 'INVALID_LINK', 'رابط الزر مش صحيح', 'The CTA link is invalid');
  }
  if (body.startAt && body.endAt && new Date(body.endAt) <= new Date(body.startAt)) {
    throw new AppError(400, 'VALIDATION', 'فترة الحملة مش صحيحة', 'The campaign window is invalid');
  }
}

// POST /api/admin/banners
export const adminCreate = catchAsync(async (req, res) => {
  validatePayload(req.body);
  const banner = await Banner.create(req.body);
  sendSuccess(res, 201, { banner });
});

// PATCH /api/admin/banners/:id - edit content, reorder (sortOrder),
// activate/deactivate, reschedule. Reorder is just a sortOrder change.
export const adminUpdate = catchAsync(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new AppError(404, 'NOT_FOUND', 'البانر ده مش موجود', 'Banner not found');
  const next = { ...banner.toObject(), ...req.body };
  validatePayload(next);
  const oldImage = { url: banner.imageUrl, publicId: banner.cloudinaryPublicId };
  Object.assign(banner, req.body);
  await banner.save();
  // Image lifecycle (doc 16): replacing an uploaded image deletes the old
  // Cloudinary asset so orphans never pile up. Best-effort: a Cloudinary
  // failure is logged, never a 500 on a content edit.
  if (oldImage.publicId && req.body.imageUrl && req.body.imageUrl !== oldImage.url && oldImage.publicId !== banner.cloudinaryPublicId) {
    deleteImage(oldImage.publicId).catch(() => {});
  }
  sendSuccess(res, 200, { banner });
});

export const adminDelete = catchAsync(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new AppError(404, 'NOT_FOUND', 'البانر ده مش موجود', 'Banner not found');
  if (banner.cloudinaryPublicId) deleteImage(banner.cloudinaryPublicId).catch(() => {});
  sendSuccess(res, 200, { deleted: true });
});
