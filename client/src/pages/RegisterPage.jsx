import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Public registration creates customer accounts only (doc 3.2) - the
// backend ignores any role field, and this form never sends one.
export default function RegisterPage({ lang }) {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ name, email, password });
      navigate('/', { replace: true }); // customers land on the menu
    } catch (err) {
      setError(err.message?.[lang] || t(lang, 'registerError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'registerTitle')}
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
          {t(lang, 'fullName')}
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
          <span className="text-xs font-normal text-muted">{t(lang, 'passwordHint')}</span>
        </label>
        {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? t(lang, 'authWorking') : t(lang, 'registerSubmit')}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-secondary">
        {t(lang, 'haveAccount')}{' '}
        <Link to="/login" className="font-bold text-primary underline underline-offset-4">
          {t(lang, 'login')}
        </Link>
      </p>
    </section>
  );
}
