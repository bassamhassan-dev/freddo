import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { useCartStore, cartCount } from '@/store/cart.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// The header shared by every page. On the homepage it renders as an
// overlay (transparent, melting into the full-screen hero below it);
// on inner pages it stays in flow.
//
// Mobile (Sprint 29b, Bassam's direction): ONE balanced row - logo,
// الحجوزات pill, cart, hamburger. The links moved into an end-side drawer,
// each in its own warm-palette color so the nav reads at a glance, with a
// visible active state. Account and language live in the drawer on mobile
// and stay as buttons on desktop. RTL: the drawer slides from the inline
// end side, which is the left in Arabic - the natural thumb side.
const LINKS = [
  { to: '/', key: 'navHome', match: (p, h) => p === '/' && !h, cls: 'text-[#ffb21a]' },
  { to: '/#menu', key: 'navMenu', match: (p, h) => p === '/' && h === '#menu', cls: 'text-[#ff8f4d]' },
  { to: '/#offers', key: 'navOffers', match: (p, h) => p === '/' && h === '#offers', cls: 'text-[#ffd166]' },
  { to: '/#about', key: 'navAbout', match: (p, h) => p === '/' && h === '#about', cls: 'text-[#f6e7cf]' },
  { to: '/contact', key: 'contactTitle', match: (p) => p === '/contact', cls: 'text-[#e8836b]' },
];

const activeCls = 'font-black [text-shadow:0_0_12px_rgba(255,170,30,.55)]';

export default function SiteHeader({ lang, onToggleLang, overlay = false }) {
  const { user, status } = useAuthStore();
  const count = useCartStore(cartCount);
  const [drawer, setDrawer] = useState(false);
  const { pathname, hash } = useLocation();

  // Close the drawer on navigation and on Escape; lock body scroll while open.
  useEffect(() => setDrawer(false), [pathname, hash]);
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawer]);

  const linkCls = (match) =>
    `text-sm font-bold transition hover:brightness-125 hover:[text-shadow:0_0_10px_rgba(255,170,30,.6)] ${match ? activeCls : 'opacity-90'}`;

  return (
    <header
      className={
        overlay
          ? 'absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/35 to-transparent'
          : 'border-b border-border/40 bg-background/80 backdrop-blur'
      }
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-x-4 px-5 py-4">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-brand text-2xl font-black tracking-wide text-[#fff6e6] [text-shadow:0_0_10px_rgba(255,170,30,.8)] md:text-3xl">
            FREDDO
          </span>
          <span className="mt-1 text-[11px] font-bold tracking-[0.34em] text-primary">{t(lang, 'appName')}</span>
        </Link>

        {/* Desktop link row: spread wide so the nav breathes like the mock. */}
        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => {
            const active = l.match(pathname, hash);
            return (
              <Link key={l.key} to={l.to} className={`${linkCls(active)} ${l.cls}`} aria-current={active ? 'page' : undefined}>
                {t(lang, l.key)}
              </Link>
            );
          })}
        </nav>

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
          <span className="hidden items-center gap-2 md:flex">
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
          </span>
          {/* Mobile hamburger: opens the link drawer. */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            aria-label={t(lang, 'navMenuOpen')}
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </Button>
        </div>
      </div>

      {/* Mobile drawer: color-coded links + account + language. Portaled
          to body: the header's backdrop-blur would otherwise trap the
          fixed overlay inside the 80px-tall header. */}
      {drawer && createPortal(
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 end-0 flex w-72 max-w-[85vw] flex-col border-s border-amber-900/40 bg-[#120d08] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-brand text-xl font-black tracking-wide text-[#fff6e6] [text-shadow:0_0_10px_rgba(255,170,30,.8)]">FREDDO</span>
              <Button variant="ghost" size="sm" aria-label={t(lang, 'navMenuClose')} onClick={() => setDrawer(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </Button>
            </div>
            <nav className="flex flex-col gap-1">
              {LINKS.map((l) => {
                const active = l.match(pathname, hash);
                return (
                  <Link
                    key={l.key}
                    to={l.to}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-lg px-3 py-2.5 text-base font-bold transition hover:bg-[#241a10] ${l.cls} ${active ? `bg-[#241a10] ${activeCls}` : ''}`}
                  >
                    <span className={`me-2 inline-block h-2 w-2 rounded-full ${active ? 'bg-current' : 'bg-current opacity-40'}`} />
                    {t(lang, l.key)}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-amber-900/40 pt-4">
              {status === 'authed' && user ? (
                <Link to="/account">
                  <Button variant="ghost" className="w-full justify-start">{user.name}</Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button variant="ghost" className="w-full justify-start">{t(lang, 'login')}</Button>
                </Link>
              )}
              <Button variant="ghost" className="w-full justify-start" onClick={onToggleLang}>
                {t(lang, 'languageSwitch')}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
