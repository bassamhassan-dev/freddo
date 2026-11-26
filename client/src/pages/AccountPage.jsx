import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { apiMyLoyalty } from '@/api/loyalty.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { apiUpdateProfile, apiUploadAvatar } from '@/api/auth.js';
import ChatAvatar from '@/components/ChatAvatar.jsx';

// The customer's account home: who they are, and logout. Orders and
// reservations join this page in their own sprints.
export default function AccountPage({ lang }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loyalty, setLoyalty] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Profile edits return the fresh public user; push it into the auth store
  // so the header, chat and checkout pick it up without a reload.
  const applyUser = (next) => useAuthStore.setState({ user: { ...user, ...next } });

  const onSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { user: next } = await apiUpdateProfile({ name, phone });
      applyUser(next);
      setMsg({ ok: true, text: t(lang, 'profileSaved') });
    } catch (err) {
      setMsg({ ok: false, text: err.message?.[lang] || t(lang, 'orderError') });
    }
    setBusy(false);
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const { user: next } = await apiUploadAvatar(file);
      applyUser(next);
    } catch (err) {
      setMsg({ ok: false, text: err.message?.[lang] || t(lang, 'orderError') });
    }
    setBusy(false);
  };

  useEffect(() => {
    apiMyLoyalty().then(setLoyalty).catch(() => setLoyalty(null));
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'accountTitle')}
      </h2>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <ChatAvatar name={user?.name} src={user?.avatarUrl} variant="amber" />
          <label className="cursor-pointer text-sm font-semibold text-accent underline">
            {t(lang, 'changePhoto')}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onAvatar} disabled={busy} />
          </label>
        </div>
        <p className="text-sm text-secondary" dir="ltr">{user?.email}</p>
        <form className="flex flex-col gap-2" onSubmit={onSave}>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            {t(lang, 'profileName')}
            <input className="rounded-xl border border-border bg-background p-2 text-foreground" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            {t(lang, 'profilePhone')}
            <input className="rounded-xl border border-border bg-background p-2 text-foreground" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <Button type="submit" disabled={busy}>{t(lang, 'saveProfile')}</Button>
          {msg && <p className={`text-sm font-semibold ${msg.ok ? 'text-accent' : 'text-red-400'}`}>{msg.text}</p>}
        </form>
        <p className="text-sm text-secondary">
          {t(lang, 'role')}: {t(lang, `role_${user?.role}`)}
        </p>
        {loyalty && (
          <div className="mt-2 rounded-xl border border-border bg-background p-4">
            <p className="text-lg font-black text-primary">
              {loyalty.balance} {t(lang, 'loyaltyPoints')}
            </p>
            <p className="text-xs text-secondary">
              {t(lang, 'loyaltyEarnNote').replace('{n}', loyalty.earnPercent).replace('{r}', loyalty.redeemPoints)}
            </p>
            {loyalty.transactions.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-xs text-secondary">
                {loyalty.transactions.slice(0, 5).map((tx) => (
                  <li key={tx._id} className="flex justify-between gap-2">
                    <span>{tx.description || t(lang, `loyaltyType_${tx.type}`)}</span>
                    <span className={tx.points >= 0 ? 'text-primary' : 'text-red-400'}>
                      {tx.points >= 0 ? `+${tx.points}` : tx.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Link to="/orders">
          <Button variant="ghost" className="mt-2 w-full">{t(lang, 'myOrders')}</Button>
        </Link>
        <Button variant="ghost" onClick={onLogout} className="mt-2">
          {t(lang, 'logout')}
        </Button>
      </div>
    </section>
  );
}
