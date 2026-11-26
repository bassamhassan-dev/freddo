import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { homeForRole } from '@/auth/roleRedirect.js';
import { t } from '@/i18n/index.js';

// Landing page after the OAuth redirect: the server already set the
// refresh cookie, so a single refresh call restores the session and we
// route to the role's home like any other login.
export default function OAuthCallbackPage({ lang }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await bootstrap();
      const { user } = useAuthStore.getState();
      navigate(user ? homeForRole(user.role) : '/login?oauthError=OAUTH_FAILED', { replace: true });
    })();
  }, [bootstrap, navigate]);

  return <p className="py-20 text-center text-secondary">{t(lang, 'oauthWorking')}</p>;
}
