import { AppError } from '../../utils/AppError.js';
import { verifyAccessToken } from '../../utils/tokens.js';
import User from './user.model.js';

// Authorization is enforced here, on the server, on every protected route
// (doc 3.8): the React route guards are only UX, never security.

// Requires a valid `Authorization: Bearer <accessToken>`. Attaches the
// fresh user document as req.user so downstream code always sees the
// current role/active state, not the (possibly stale) token claims.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    next(new AppError(401, 'AUTH_REQUIRED', 'لازم تسجل دخول الأول', 'You need to log in first'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new Error('inactive');
    req.user = user;
    next();
  } catch {
    next(new AppError(401, 'AUTH_INVALID_TOKEN', 'الجلسة خلصت، سجل دخول تاني', 'Session expired, please log in again'));
  }
}

// requireRole('admin') after requireAuth: 403 when the role does not match.
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    next(new AppError(403, 'AUTH_FORBIDDEN', 'مش مسموح ليك تدخل هنا', 'You are not allowed here'));
    return;
  }
  next();
};
