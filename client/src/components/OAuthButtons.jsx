import { useEffect, useState } from 'react';
import { request } from '@/api/client.js';
import { t } from '@/i18n/index.js';

// "Continue with Google / Facebook" (Sprint 31). The buttons are ALWAYS on
// the auth forms - Bassam wants the near-final login page visible before
// the app credentials exist. A provider the server reports as configured
// is a live link into its OAuth flow; an unconfigured one renders disabled
// with a note that it activates once the keys are dropped in (env-gated,
// 503 server-side if called anyway - nothing half-works silently).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 5.04c1.7 0 3.22.59 4.42 1.74l3.29-3.29C17.74 1.7 15.09.6 12 .6 7.7.6 3.99 3.07 2.18 6.76l3.84 2.98C6.93 7.04 9.24 5.04 12 5.04Z"/><path fill="#4285F4" d="M23.4 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.4a5.47 5.47 0 0 1-2.37 3.59l3.76 2.92c2.2-2.03 3.61-5.02 3.61-8.7Z"/><path fill="#FBBC05" d="M6.03 14.26a7.2 7.2 0 0 1 0-4.52L2.18 6.76a11.42 11.42 0 0 0 0 10.48l3.85-2.98Z"/><path fill="#34A853" d="M12 23.4c3.09 0 5.68-1.02 7.58-2.77l-3.76-2.92c-1.04.7-2.38 1.12-3.82 1.12-2.76 0-5.07-2-5.98-4.7l-3.85 2.98C3.99 20.93 7.7 23.4 12 23.4Z"/></svg>
);
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z"/></svg>
);

const PROVIDERS = [
  { id: 'google', labelKey: 'oauthGoogle', Icon: GoogleIcon },
  { id: 'facebook', labelKey: 'oauthFacebook', Icon: FacebookIcon },
];

export default function OAuthButtons({ lang }) {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    request('/api/auth/oauth/providers')
      .then(({ data }) => setProviders(data.providers || {}))
      .catch(() => setProviders({}));
  }, []);

  if (providers === null) return null; // brief probe; buttons appear with the page

  const anyConfigured = PROVIDERS.some((p) => providers[p.id]);

  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-center text-xs text-secondary">{t(lang, 'oauthDivider')}</p>
      {PROVIDERS.map(({ id, labelKey, Icon }) => {
        const configured = providers[id] === true;
        const btn = (
          <button
            type="button"
            disabled={!configured}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/60 bg-transparent px-4 py-2 text-sm font-bold text-accent transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Icon />
            {t(lang, labelKey)}
          </button>
        );
        return configured ? (
          <a key={id} href={`${API_URL}/api/auth/oauth/${id}`}>{btn}</a>
        ) : (
          <span key={id}>{btn}</span>
        );
      })}
      {!anyConfigured && (
        <p className="text-center text-[11px] text-secondary/70">{t(lang, 'oauthComingSoon')}</p>
      )}
    </div>
  );
}
