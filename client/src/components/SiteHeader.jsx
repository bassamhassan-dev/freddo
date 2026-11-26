import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { useCartStore, cartCount } from '@/store/cart.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// The header shared by every page. On the homepage it renders as an
// overlay (transparent, melting into the full-screen hero below it - the
// Aura Roast direction, Sprint 24); on inner pages it stays in flow.
// Desktop gets a wide-spaced link row; الحجوزات is the prominent gold pill
// on every screen size. Hash links land on homepage sections via the
// scroll effect in App.jsx.
const linkCls = 'text-sm font-bold text-secondary transition hover:text-primary hover:[text-shadow:0_0_10px_rgba(255,170,30,.6)]';

export default function SiteHeader({ lang, onToggleLang, overlay = false }) {
  const { user, status } = useAuthStore();
  const count = useCartStore(cartCount);

  const navLinks = (
    <>
      <Link to="/" className={linkCls}>{t(lang, 'navHome')}</Link>
      <Link to="/#menu" className={linkCls}>{t(lang, 'navMenu')}</Link>
      <Link to="/#offers" className={linkCls}>{t(lang, 'navOffers')}</Link>
      <Link to="/#about" className={linkCls}>{t(lang, 'navAbout')}</Link>
      <Link to="/contact" className={linkCls}>{t(lang, 'contactTitle')}</Link>
    </>
  );

  return (
    <header
      className={
        overlay
          ? 'absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/35 to-transparent'
          : 'border-b border-border/40 bg-background/80 backdrop-blur'
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-brand text-3xl font-black tracking-wide text-[#fff6e6] [text-shadow:0_0_10px_rgba(255,170,30,.8)]">
            FREDDO
          </span>
          <span className="mt-1 text-[11px] font-bold tracking-[0.34em] text-primary">{t(lang, 'appName')}</span>
        </Link>

        {/* Desktop link row: spread wide so the nav breathes like the mock. */}
        <nav className="hidden items-center gap-8 md:flex">{navLinks}</nav>

        <div className="flex items-center gap-2">
          {/* Reservations: the one action Bassam wants unmissable. */}
          <Link to="/reservations">
            <Button size="sm" className="shadow-neon-sm">{t(lang, 'reservationsTitle')}</Button>
          </Link>
          <Link to="/cart">
            <Button variant="ghost" size="sm" aria-label={t(lang, 'cartTitle')}>
              {t(lang, 'cartIcon')}{count > 0 ? ` (${count})` : ''}
            </Button>
          </Link>
          {status === 'authed' && user ? (
            <Link to="/account">
              <Button variant="ghost" size="sm">{user.name}</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm">{t(lang, 'login')}</Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={onToggleLang}>
            {t(lang, 'languageSwitch')}
          </Button>
        </div>

        {/* Mobile: the links live on their own scrollable row. */}
        <nav className="flex w-full items-center gap-5 overflow-x-auto pt-1 md:hidden">{navLinks}</nav>
      </div>
    </header>
  );
}
