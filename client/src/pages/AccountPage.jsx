import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { apiMyLoyalty } from '@/api/loyalty.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// The customer's account home: who they are, and logout. Orders and
// reservations join this page in their own sprints.
export default function AccountPage({ lang }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loyalty, setLoyalty] = useState(null);

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
        <p className="text-lg font-bold text-foreground">{user?.name}</p>
        <p className="text-sm text-secondary">{user?.email}</p>
        <p className="text-sm text-secondary">
          {t(lang, 'role')}: {t(lang, `role_${user?.role}`)}
        </p>
        {loyalty && (
          <div className="mt-2 rounded-xl border border-border bg-background p-4">
            <p className="text-lg font-black text-primary">
              {loyalty.balance} {t(lang, 'loyaltyPoints')}
            </p>
            <p className="text-xs text-secondary">
              {t(lang, 'loyaltyEarnNote').replace('{n}', loyalty.egpPerPoint)}
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
