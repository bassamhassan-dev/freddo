import mongoose from 'mongoose';
import User from './user.model.js';
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

async function issueSession(user) {
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
export async function registerCustomer({ name, email, password }) {
  const passwordHash = await User.hashPassword(password);
  try {
    const user = await User.create({ name, email, passwordHash, role: ROLES.CUSTOMER });
    return { user, ...(await issueSession(user)) };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, 'EMAIL_TAKEN', 'الإيميل ده متسجل بالفعل', 'This email is already registered');
    }
    throw err;
  }
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
