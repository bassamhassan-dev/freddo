import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { homeForRole } from '@/auth/roleRedirect.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import OAuthButtons from '@/components/OAuthButtons.jsx';

// The one login page for all roles (doc 3.1). The role returned by the
// backend decides where the user lands - the page never asks for it.
export default function LoginPage({ lang }) {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // OAuth failures come back from the provider dance as a query param.
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('oauthError');
    if (code) setError(t(lang, `oauthErr_${code}`));
  }, [location.search, lang]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login({ email, password });
      // Back to where a guard bounced us from, else the role's home.
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : homeForRole(user.role), { replace: true });
    } catch (err) {
      // The API sends bilingual messages; show the active language.
      setError(err.message?.[lang] || t(lang, 'loginError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'loginTitle')}
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
          {t(lang, 'email')}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
          {t(lang, 'password')}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
        {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? t(lang, 'authWorking') : t(lang, 'loginSubmit')}
        </Button>
        <OAuthButtons lang={lang} />
      </form>
      <p className="mt-4 text-center text-sm text-secondary">
        {t(lang, 'noAccount')}{' '}
        <Link to="/register" className="font-bold text-primary underline underline-offset-4">
          {t(lang, 'register')}
        </Link>
      </p>
    </section>
  );
}
