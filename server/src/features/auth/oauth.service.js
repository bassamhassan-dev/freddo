import jwt from 'jsonwebtoken';
import User from './user.model.js';
import { AppError } from '../../utils/AppError.js';
import { ROLES } from '../../utils/roles.js';
import { issueSession } from './auth.service.js';
import { fetchProviderProfile } from './oauth.providers.js';

// OAuth business rules (Google + Facebook, the user's decision).
//
// Account linking policy (documented with the walkthrough):
//  1. A returning provider id logs straight in.
//  2. A provider-verified email that matches an existing account LINKS the
//     provider to that account - one person, one account, never a duplicate.
//  3. A new verified email creates a fresh customer account.
// Emails the provider did not verify are rejected: linking on an unverified
// address would hand account takeover to whoever types someone else's email.

export function signOAuthState(provider) {
  return jwt.sign({ provider, purpose: 'oauth-state' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '10m' });
}

export function verifyOAuthState(state, provider) {
  try {
    const payload = jwt.verify(state, process.env.JWT_ACCESS_SECRET);
    return payload.purpose === 'oauth-state' && payload.provider === provider;
  } catch {
    return false;
  }
}

const oauthFail = (code, ar, en) => new AppError(400, code, ar, en);

export async function handleOAuthCallback(provider, code, redirectUri) {
  const profile = await fetchProviderProfile(provider, code, redirectUri);
  if (!profile?.id) throw oauthFail('OAUTH_FAILED', 'تسجيل الدخول ماكتملش، جرب تاني', 'Sign-in did not complete, try again');
  if (!profile.email) {
    throw oauthFail('OAUTH_EMAIL_REQUIRED', 'محتاجين إيميلك من مزود الدخول', 'We need your email from the sign-in provider');
  }
  if (!profile.emailVerified) {
    throw oauthFail('OAUTH_EMAIL_UNVERIFIED', 'الإيميل ده مش مؤكد عند مزود الدخول', 'This email is not verified with the sign-in provider');
  }

  const idField = provider === 'google' ? 'oauthGoogleId' : 'oauthFacebookId';

  // 1. Known provider id.
  let user = await User.findOne({ [idField]: profile.id });
  if (!user) {
    // 2. Link by verified email, or 3. create a new customer.
    user = await User.findOne({ email: profile.email });
    if (user) {
      user[idField] = profile.id;
    } else {
      user = new User({
        name: String(profile.name).slice(0, 50) || 'Freddo customer',
        email: profile.email,
        role: ROLES.CUSTOMER,
        [idField]: profile.id,
      });
    }
  }
  if (!user.isActive) {
    throw new AppError(403, 'AUTH_INACTIVE', 'الحساب ده متوقف، كلم الإدارة', 'This account is disabled, contact the café');
  }
  user.lastLoginAt = new Date();
  await user.save();
  return { user, ...(await issueSession(user)) };
}
