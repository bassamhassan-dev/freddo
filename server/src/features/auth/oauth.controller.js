import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import {
  OAUTH_PROVIDERS,
  configuredProviders,
  oauthDiagnostics,
  isProviderConfigured,
  buildAuthUrl,
} from './oauth.providers.js';
import { signOAuthState, verifyOAuthState, handleOAuthCallback } from './oauth.service.js';

// OAuth endpoints (Google + Facebook). The browser dance is redirect-based,
// so errors cannot ride the JSON error shape - they go back to the client's
// login page as a readable query param instead.
const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

function checkProvider(req) {
  const { provider } = req.params;
  if (!OAUTH_PROVIDERS.includes(provider)) {
    throw new AppError(404, 'NOT_FOUND', 'مزود الدخول ده مش موجود', 'Unknown sign-in provider');
  }
  return provider;
}

const redirectUriFor = (req, provider) =>
  `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;

// GET /api/auth/oauth/providers - which buttons the login page shows.
export const providers = catchAsync(async (req, res) => {
  sendSuccess(res, 200, { providers: configuredProviders() });
});

// GET /api/auth/oauth/status - which provider env vars are present (names
// only, never values), plus the exact redirect URI Google/Facebook must list.
export const status = catchAsync(async (req, res) => {
  const diag = oauthDiagnostics();
  for (const p of Object.keys(diag)) diag[p].redirectUri = redirectUriFor(req, p);
  sendSuccess(res, 200, { providers: diag, clientUrl: clientUrl() });
});

// GET /api/auth/oauth/:provider - bounce the browser to the provider's
// consent screen with a signed, 10-minute state (our CSRF token).
export const start = catchAsync(async (req, res) => {
  const provider = checkProvider(req);
  if (!isProviderConfigured(provider)) {
    throw new AppError(503, 'OAUTH_NOT_CONFIGURED', 'تسجيل الدخول ده مش متظبط لسه', 'This sign-in provider is not configured yet');
  }
  const state = signOAuthState(provider);
  res.redirect(buildAuthUrl(provider, { state, redirectUri: redirectUriFor(req, provider) }));
});

// GET /api/auth/oauth/:provider/callback - exchange, link-or-create, then
// back to the client with the refresh cookie already set. The client calls
// /api/auth/refresh from its callback page and lands logged in.
export const callback = catchAsync(async (req, res) => {
  const provider = checkProvider(req);
  const { code, state } = req.query;
  if (req.query.error) {
    // The user pressed cancel / the provider refused (e.g. access_denied).
    console.warn(`[oauth] ${provider} returned error=${String(req.query.error).slice(0, 80)}`);
    res.redirect(`${clientUrl()}/login?oauthError=OAUTH_DENIED`);
    return;
  }
  if (!code || !state || !verifyOAuthState(state, provider)) {
    res.redirect(`${clientUrl()}/login?oauthError=OAUTH_STATE`);
    return;
  }
  try {
    const { refreshToken } = await handleOAuthCallback(provider, code, redirectUriFor(req, provider));
    res.cookie('freddo_refresh', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${clientUrl()}/oauth/callback`);
  } catch (err) {
    // Log the real reason (provider error text, no secrets) - the browser only
    // gets a generic code, so without this a failure would be silent.
    console.error(`[oauth] ${provider} callback failed: ${err.message}`);
    const code2 = err.code && String(err.code).startsWith('OAUTH') ? err.code
      : err.code === 'AUTH_INACTIVE' ? 'AUTH_INACTIVE' : 'OAUTH_FAILED';
    res.redirect(`${clientUrl()}/login?oauthError=${code2}`);
  }
});
