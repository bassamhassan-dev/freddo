import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';

// Everything about JWTs lives here. Secrets come from the environment and
// are read lazily (at sign/verify time, not import time) so tests can set
// them before the first call and the server fails with a clear message,
// not a crash on boot.

const ACCESS_TTL = '15m'; // short-lived; the client refreshes silently
const REFRESH_TTL_DAYS = 7;

function secret(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in environment / ناقص ${name} في ملف البيئة`);
  }
  return value;
}

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, secret('JWT_ACCESS_SECRET'), {
    expiresIn: ACCESS_TTL,
  });
}

// The refresh token carries a unique session id (jti) so it can be revoked
// individually and rotated on every use.
export function signRefreshToken(user, sessionId) {
  return jwt.sign({ sub: user._id.toString(), jti: sessionId }, secret('JWT_REFRESH_SECRET'), {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, secret('JWT_ACCESS_SECRET'));
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, secret('JWT_REFRESH_SECRET'));
}

// Refresh tokens are stored hashed (SHA-256), never in plain text: a
// database leak must not hand out live sessions. SHA-256 (not bcrypt) is
// right here because tokens are high-entropy random strings, not human
// passwords - brute force is not the threat, disclosure is.
export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
