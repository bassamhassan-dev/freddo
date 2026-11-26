import { useEffect, useState } from 'react';
import { request } from '@/api/client.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// "Continue with Google / Facebook". The buttons appear only for providers
// the server reports as configured (env-gated), so the page is unchanged
// until the app credentials are dropped in.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OAuthButtons({ lang }) {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    request('/api/auth/oauth/providers')
      .then(({ data }) => setProviders(data.providers))
      .catch(() => setProviders({}));
  }, []);

  if (!providers || (!providers.google && !providers.facebook)) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      <p className="text-center text-xs text-secondary">{t(lang, 'oauthDivider')}</p>
      {providers.google && (
        <a href={`${API_URL}/api/auth/oauth/google`}>
          <Button variant="ghost" className="w-full">{t(lang, 'oauthGoogle')}</Button>
        </a>
      )}
      {providers.facebook && (
        <a href={`${API_URL}/api/auth/oauth/facebook`}>
          <Button variant="ghost" className="w-full">{t(lang, 'oauthFacebook')}</Button>
        </a>
      )}
    </div>
  );
}
