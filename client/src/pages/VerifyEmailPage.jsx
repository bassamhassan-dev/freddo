import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiVerifyEmail } from '@/api/auth.js';
import { useAuthStore } from '@/store/auth.js';
import { t } from '@/i18n/index.js';

// Landing page for the verification link in the registration email
// (Sprint 33). The token arrives in the URL, we post it once, and on
// success the session is refreshed so the stored user picks up
// emailVerified=true without a re-login.
export default function VerifyEmailPage({ lang }) {
  const [params] = useSearchParams();
  const token = params.get('token');
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const [state, setState] = useState('working');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke guard
    ran.current = true;
    if (!token) {
      setState('bad');
      return;
    }
    (async () => {
      try {
        await apiVerifyEmail(token);
        await bootstrap(); // reload the user so emailVerified shows true
        setState('ok');
      } catch {
        setState('bad');
      }
    })();
  }, [token, bootstrap]);

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-5 py-20 text-center">
      <h2 className="text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'verifyEmailTitle')}
      </h2>
      {state === 'working' && <p className="text-secondary">{t(lang, 'verifyEmailWorking')}</p>}
      {state === 'ok' && (
        <>
          <p className="font-semibold text-foreground">{t(lang, 'verifyEmailOk')}</p>
          <Link to="/" className="text-accent underline">{t(lang, 'backHome')}</Link>
        </>
      )}
      {state === 'bad' && (
        <>
          <p className="font-semibold text-red-400">{t(lang, 'verifyEmailBad')}</p>
          <Link to="/" className="text-accent underline">{t(lang, 'backHome')}</Link>
        </>
      )}
    </section>
  );
}
