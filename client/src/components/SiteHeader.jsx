import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { useCartStore, cartCount } from '@/store/cart.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// The header shared by every page: brand, account entry, language switch.
export default function SiteHeader({ lang, onToggleLang }) {
  const { user, status } = useAuthStore();
  const count = useCartStore(cartCount);

  return (
    <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
      <Link to="/" className="flex flex-col leading-none">
        <span className="font-brand text-3xl font-black tracking-wide text-[#fff6e6] [text-shadow:0_0_10px_rgba(255,170,30,.8)]">
          FREDDO
        </span>
        <span className="mt-1 text-[11px] font-bold tracking-[0.34em] text-primary">{t(lang, 'appName')}</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link to="/cart">
          <Button variant="ghost" size="sm" aria-label={t(lang, 'cartTitle')}>
            {t(lang, 'cartIcon')}{count > 0 ? ` (${count})` : ''}
          </Button>
        </Link>
        {status === 'authed' && user ? (
          <>
            <Link to="/reservations" className="text-sm font-bold text-secondary transition hover:text-primary">
              {t(lang, 'reservationsTitle')}
            </Link>
            <Link to="/account">
              <Button variant="ghost" size="sm">{user.name}</Button>
            </Link>
          </>
        ) : (
          <Link to="/login">
            <Button variant="ghost" size="sm">{t(lang, 'login')}</Button>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={onToggleLang}>
          {t(lang, 'languageSwitch')}
        </Button>
      </div>
    </header>
  );
}
