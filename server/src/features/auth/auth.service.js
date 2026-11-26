import crypto from 'node:crypto';
import mongoose from 'mongoose';
import User from './user.model.js';
import { sendVerificationEmail } from '../../services/mail.service.js';
import RefreshToken from './refreshToken.model.js';
import { AppError } from '../../utils/AppError.js';
import { ROLES } from '../../utils/roles.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  REFRESH_TTL_MS,
} from '../../utils/tokens.js';

// All authentication business rules. No HTTP here: the controller passes
// clean values and gets back { user, accessToken, refreshToken } or an
// AppError. Refresh rotation and reuse detection live here and nowhere else.

const invalidCredentials = () =>
  // One identical message for "email not found" and "wrong password":
  // the API must not reveal which emails are registered.
  new AppError(401, 'AUTH_INVALID_CREDENTIALS', 'الإيميل أو الباسورد غلط', 'Incorrect email or password');

export async function issueSession(user) {
  const sessionId = new mongoose.Types.ObjectId().toString();
  const refreshToken = signRefreshToken(user, sessionId);
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

// Public registration creates customers only (doc 3.2). Any role sent in
// the payload is ignored by picking fields explicitly - mass assignment is
// impossible because the request body is never spread into the document.
// Registration issues a session right away (the customer can browse and
// fill a cart), but the account starts unverified: ordering is blocked
// until the emailed link is clicked. The raw token goes only to the
// inbox; we store its sha256 hash with a 24-hour expiry.
function newVerificationToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    raw,
    hash: crypto.createHash('sha256').update(raw).digest('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

async function issueVerification(user) {
  const token = newVerificationToken();
  user.verificationTokenHash = token.hash;
  user.verificationTokenExpiresAt = token.expiresAt;
  await user.save();
  await sendVerificationEmail(user, token.raw);
}

export async function registerCustomer({ name, email, password }) {
  const passwordHash = await User.hashPassword(password);
  try {
    const user = await User.create({ name, email, passwordHash, role: ROLES.CUSTOMER });
    await issueVerification(user);
    return { user, ...(await issueSession(user)) };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, 'EMAIL_TAKEN', 'الإيميل ده متسجل بالفعل', 'This email is already registered');
    }
    throw err;
  }
}

export async function verifyEmail(rawToken) {
  const hash = crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
  const user = await User.findOne({ verificationTokenHash: hash }).select('+verificationTokenHash +verificationTokenExpiresAt');
  if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
    throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'اللينك ده مش صالح أو خلص، اطلب لينك جديد', 'This link is invalid or expired, request a new one');
  }
  user.emailVerifiedAt = user.emailVerifiedAt || new Date();
  user.verificationTokenHash = undefined;
  user.verificationTokenExpiresAt = undefined;
  await user.save();
  return { user };
}

export async function resendVerification(user) {
  if (user.emailVerifiedAt) {
    throw new AppError(400, 'ALREADY_VERIFIED', 'إيميلك مؤكد بالفعل', 'Your email is already verified');
  }
  await issueVerification(user);
}

export async function login({ email, password }) {
  // passwordHash is select:false, so ask for it explicitly here and only here.
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(password))) throw invalidCredentials();
  if (!user.isActive) {
    throw new AppError(403, 'AUTH_INACTIVE', 'الحساب ده متوقف، كلم الإدارة', 'This account is disabled, contact the café');
  }
  user.lastLoginAt = new Date();
  await user.save();
  return { user, ...(await issueSession(user)) };
}

// Rotation: every refresh swaps the old session for a new one, so a
// refresh token works exactly once. If a presented token is valid JWT but
// unknown to the store, it was already rotated (or stolen and replayed) -
// treat it as reuse and revoke every session of that user (doc 3.3/3.4).
export async function refresh(rawToken) {
  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw new AppError(401, 'AUTH_INVALID_TOKEN', 'الجلسة خلصت، سجل دخول تاني', 'Session expired, please log in again');
  }
  const stored = await RefreshToken.findOne({ tokenHash: hashRefreshToken(rawToken) });
  if (!stored) {
    await RefreshToken.deleteMany({ user: payload.sub });
    throw new AppError(401, 'AUTH_INVALID_TOKEN', 'الجلسة خلصت، سجل دخول تاني', 'Session expired, please log in again');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    await RefreshToken.deleteMany({ user: payload.sub });
    throw new AppError(401, 'AUTH_INVALID_TOKEN', 'الجلسة خلصت، سجل دخول تاني', 'Session expired, please log in again');
  }
  await stored.deleteOne();
  return { user, ...(await issueSession(user)) };
}

// Logout revokes exactly the session in the cookie. An absent/unknown
// cookie is fine - the client still clears its state and gets 204.
export async function logout(rawToken) {
  if (rawToken) await RefreshToken.deleteOne({ tokenHash: hashRefreshToken(rawToken) });
}

export async function getById(id) {
  return User.findById(id);
}
