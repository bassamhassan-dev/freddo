// The two OAuth providers (decision: Google + Facebook login). No passport:
// the authorization-code exchange is two HTTPS calls per provider, so a
// strategy framework would be weight without gain at this size.
//
// Everything is env-gated. A provider with no client id/secret is simply
// "not configured": its button hides on the client and starting its flow
// answers 503.
//
// The HTTP layer is injectable for tests: setProviderHttpForTests swaps the
// one function that talks to Google/Facebook, so the whole callback flow
// (linking, creation, session) is tested without network or credentials.

const PROVIDERS = {
  google: {
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'openid email profile',
    extraAuthParams: { access_type: 'online', response_type: 'code' },
  },
  facebook: {
    env: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    scope: 'email,public_profile',
    extraAuthParams: { response_type: 'code' },
  },
};

export const OAUTH_PROVIDERS = Object.keys(PROVIDERS);

export function isProviderConfigured(provider) {
  return PROVIDERS[provider].env.every((name) => Boolean(process.env[name]));
}

export function configuredProviders() {
  return Object.fromEntries(OAUTH_PROVIDERS.map((p) => [p, isProviderConfigured(p)]));
}

// Safe config report: names and shapes only, never values. Used by the
// startup log and GET /api/auth/oauth/status so a "button does nothing"
// problem can be diagnosed without anyone pasting a secret.
export function oauthDiagnostics() {
  const out = {};
  for (const provider of OAUTH_PROVIDERS) {
    const names = PROVIDERS[provider].env;
    const missing = names.filter((n) => !process.env[n]);
    const problems = [];
    for (const n of names) {
      const v = process.env[n];
      if (!v) continue;
      if (v !== v.trim()) problems.push(`${n} has a space before/after the value`);
      if (/^["'].*["']$/.test(v.trim())) problems.push(`${n} is wrapped in quotes, remove them`);
    }
    const id = process.env[names[0]];
    if (provider === 'google' && id && !id.trim().endsWith('.apps.googleusercontent.com')) {
      problems.push('GOOGLE_CLIENT_ID should end with .apps.googleusercontent.com');
    }
    out[provider] = { configured: missing.length === 0, missing, problems, callbackPath: `/api/auth/oauth/${provider}/callback` };
  }
  return out;
}

export function buildAuthUrl(provider, { state, redirectUri }) {
  const cfg = PROVIDERS[provider];
  const clientId = process.env[cfg.env[0]];
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: cfg.scope,
    state,
    ...cfg.extraAuthParams,
  });
  return `${cfg.authUrl}?${params}`;
}

// The one network function. Exchanges the code for an access token, then
// fetches the profile. Returns { id, email, name, emailVerified }.
async function defaultFetchProfile(provider, code, redirectUri) {
  const cfg = PROVIDERS[provider];
  const clientId = process.env[cfg.env[0]];
  const clientSecret = process.env[cfg.env[1]];

  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) throw new Error(`google token exchange failed: ${token.error || tokenRes.status} ${token.error_description || ''}`.trim());
    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.sub) throw new Error('google profile failed');
    return {
      id: profile.sub,
      email: profile.email ? String(profile.email).toLowerCase() : null,
      name: profile.name || profile.email || 'Freddo customer',
      emailVerified: profile.email_verified === true,
    };
  }

  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.search = new URLSearchParams({
    client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code,
  });
  const tokenRes = await fetch(tokenUrl);
  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.access_token) throw new Error(`facebook token exchange failed: ${token.error?.message || tokenRes.status}`);
  const profileUrl = new URL('https://graph.facebook.com/v19.0/me');
  profileUrl.search = new URLSearchParams({ fields: 'id,name,email', access_token: token.access_token });
  const profileRes = await fetch(profileUrl);
  const profile = await profileRes.json();
  if (!profileRes.ok || !profile.id) throw new Error('facebook profile failed');
  return {
    id: profile.id,
    email: profile.email ? String(profile.email).toLowerCase() : null,
    name: profile.name || profile.email || 'Freddo customer',
    // Facebook only returns an email the user shared with the app; the
    // linking policy treats a returned email as provider-verified.
    emailVerified: Boolean(profile.email),
  };
}

let fetchProfileImpl = defaultFetchProfile;
export function setProviderHttpForTests(impl) {
  fetchProfileImpl = impl || defaultFetchProfile;
}
export function fetchProviderProfile(provider, code, redirectUri) {
  return fetchProfileImpl(provider, code, redirectUri);
}
