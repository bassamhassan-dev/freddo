import multer from 'multer';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { isCloudinaryConfigured, uploadImage } from './cloudinary.service.js';

// Image validation (doc 16): raster web formats only, 5MB cap, parsed in
// memory - no file ever touches the server's disk.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/admin/uploads/status - lets the admin UI show the upload
// widget only when Cloudinary is actually configured.
export const status = catchAsync(async (req, res) => {
  sendSuccess(res, 200, { configured: isCloudinaryConfigured() });
});

// POST /api/admin/uploads - one image field named "image". Returns the
// secure URL + public id to store on the owning document.
export const create = catchAsync(async (req, res) => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', 'رفع الصور مش متظبط لسه - استخدم رابط صورة', 'Image upload is not configured yet - use an image URL');
  }
  if (!req.file) {
    throw new AppError(400, 'NO_FILE', 'مفيش صورة اتبعتت', 'No image was sent');
  }
  if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'نوع الصورة مش مسموح - JPG أو PNG أو WebP بس', 'Only JPG, PNG or WebP images are allowed');
  }
  const { imageUrl, publicId } = await uploadImage(req.file.buffer);
  sendSuccess(res, 201, { imageUrl, publicId });
});
