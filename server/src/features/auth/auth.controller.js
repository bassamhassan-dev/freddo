import * as authService from './auth.service.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import User from './user.model.js';
import { isCloudinaryConfigured, uploadImage, deleteImage } from '../uploads/cloudinary.service.js';

// The refresh token travels only in an HttpOnly cookie (JS can never read
// it, so XSS cannot steal it). SameSite=Lax blocks cross-site sending,
// which is our CSRF answer for this endpoint; every other protected route
// uses the Authorization header, which browsers never attach on their own.
// Secure switches on in production (HTTPS only).
const REFRESH_COOKIE = 'freddo_refresh';

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth', // the cookie is only ever sent to auth endpoints
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function validateRegister(body) {
  const { name, email, password } = body || {};
  const errors = [];
  if (typeof name !== 'string' || name.trim().length < 2) errors.push('name');
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');
  if (typeof password !== 'string' || password.length < 8) errors.push('password');
  if (errors.length) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'اكتب اسمك وإيميل صحيح وباسورد 8 حروف على الأقل',
      'Enter your name, a valid email, and a password of at least 8 characters'
    );
  }
  return { name: name.trim(), email: email.trim(), password };
}

export const register = catchAsync(async (req, res) => {
  const input = validateRegister(req.body);
  const { user, accessToken, refreshToken } = await authService.registerCustomer(input);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, 201, { user: user.toPublicJSON(), accessToken });
});

export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body || {};
  if (typeof token !== 'string' || !token) {
    throw new AppError(400, 'VALIDATION_ERROR', 'لينك التأكيد ناقص', 'The verification link is incomplete');
  }
  const { user } = await authService.verifyEmail(token);
  sendSuccess(res, 200, { user: user.toPublicJSON() });
});

export const resendVerification = catchAsync(async (req, res) => {
  await authService.resendVerification(req.user);
  sendSuccess(res, 200, { sent: true });
});

export const login = catchAsync(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'اكتب الإيميل والباسورد', 'Enter your email and password');
  }
  const { user, accessToken, refreshToken } = await authService.login({ email, password });
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, 200, { user: user.toPublicJSON(), accessToken });
});

export const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    throw new AppError(401, 'AUTH_INVALID_TOKEN', 'الجلسة خلصت، سجل دخول تاني', 'Session expired, please log in again');
  }
  const { user, accessToken, refreshToken } = await authService.refresh(token);
  setRefreshCookie(res, refreshToken);
  sendSuccess(res, 200, { user: user.toPublicJSON(), accessToken });
});

export const logout = catchAsync(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).end();
});

// GET /api/auth/me - who am I, from the access token.
export const me = catchAsync(async (req, res) => {
  sendSuccess(res, 200, { user: req.user.toPublicJSON() });
});

// PATCH /api/auth/me - the customer edits their own name and phone. Fields
// are picked one by one; role/email can never be changed from here.
export const updateMe = catchAsync(async (req, res) => {
  const { name, phone } = req.body || {};
  const user = await User.findById(req.user._id);
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      throw new AppError(400, 'VALIDATION_ERROR', 'الاسم لازم يكون حرفين على الأقل', 'Name must be at least 2 characters');
    }
    user.name = name.trim();
  }
  if (phone !== undefined) {
    const p = typeof phone === 'string' ? phone.trim() : '';
    if (p && !/^\+?[0-9\s-]{7,16}$/.test(p)) {
      throw new AppError(400, 'INVALID_PHONE', 'اكتب رقم موبايل صحيح', 'Enter a valid phone number');
    }
    user.phone = p || undefined;
  }
  await user.save();
  sendSuccess(res, 200, { user: user.toPublicJSON() });
});

// POST /api/auth/me/avatar - one image field "image" (multer in the route).
export const uploadAvatar = catchAsync(async (req, res) => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', 'رفع الصور مش متظبط لسه', 'Image upload is not configured yet');
  }
  if (!req.file) throw new AppError(400, 'NO_FILE', 'مفيش صورة اتبعتت', 'No image was sent');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'نوع الصورة مش مسموح - JPG أو PNG أو WebP بس', 'Only JPG, PNG or WebP images are allowed');
  }
  const user = await User.findById(req.user._id).select('+avatarPublicId');
  const { imageUrl, publicId } = await uploadImage(req.file.buffer, 'freddo-avatars');
  const old = user.avatarPublicId;
  user.avatarUrl = imageUrl;
  user.avatarPublicId = publicId;
  await user.save();
  if (old) await deleteImage(old).catch(() => {});
  sendSuccess(res, 200, { user: user.toPublicJSON() });
});
