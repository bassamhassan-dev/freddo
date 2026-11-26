import { Link } from 'react-router-dom';
import { useContentStore, ct, sectionOn } from '@/store/content.js';
import { t } from '@/i18n/index.js';
import FreddoMark from '@/components/FreddoMark.jsx';

// Sprint 23c: the site footer. Every string and link is a CMS override
// with an i18n fallback; the admin can hide the whole footer. Social
// icons render only when the admin set that network's https URL.
const SOCIALS = [
  { key: 'socialFacebook', label: 'Facebook', path: 'M13 3h4v4h-3c-.6 0-1 .4-1 1v3h4l-.5 4H13v7H9v-7H6v-4h3V7c0-2.2 1.8-4 4-4z' },
  { key: 'socialInstagram', label: 'Instagram', path: 'M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5zM17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zm3 15a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10zM17.5 5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
  { key: 'socialTiktok', label: 'TikTok', path: 'M16 3c.4 2.3 1.9 3.8 4 4v3c-1.6 0-3-.5-4-1.3V15a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.2a2.9 2.9 0 1 0 2 2.7V3h3z' },
];

export default function SiteFooter({ lang }) {
  const { overrides, sections } = useContentStore();
  if (!sectionOn(sections, 'footer')) return null;
  const year = new Date().getFullYear();
  const linkCls = 'text-sm text-secondary transition-colors hover:text-primary';
  const socials = SOCIALS.filter((s) => overrides[s.key]?.en);

  return (
    <footer className="border-t border-border bg-[#0d0905]">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
        <div className="flex flex-col items-start gap-3">
          <FreddoMark small subtitle={t(lang, 'appName')} />
          <p className="text-sm text-secondary">{ct(overrides, lang, 'footerTagline', t)}</p>
          {socials.length > 0 && (
            <div className="mt-1 flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={overrides[s.key].en}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="rounded-full border border-border p-2 text-accent transition-all duration-300 hover:border-primary hover:text-primary hover:shadow-neon-sm motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-6"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d={s.path} /></svg>
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-3 font-black text-foreground">{t(lang, 'footerLinksTitle')}</p>
          <ul className="flex flex-col gap-2">
            <li><Link className={linkCls} to="/">{t(lang, 'footerMenuLink')}</Link></li>
            <li><Link className={linkCls} to="/reservations">{t(lang, 'reservationsTitle')}</Link></li>
            <li><Link className={linkCls} to="/orders">{t(lang, 'myOrders')}</Link></li>
            <li><Link className={linkCls} to="/contact">{t(lang, 'contactTitle')}</Link></li>
            <li><Link className={linkCls} to="/account">{t(lang, 'accountTitle')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-black text-foreground">{t(lang, 'footerContactTitle')}</p>
          <ul className="flex flex-col gap-2 text-sm text-secondary">
            <li>{ct(overrides, lang, 'infoLocation', t)}</li>
            <li dir="ltr" className="rtl:text-right">{ct(overrides, lang, 'infoPhone', t)}</li>
          </ul>
        </div>
        <div>
          <p className="mb-3 font-black text-foreground">{t(lang, 'footerHoursTitle')}</p>
          <p className="text-sm text-secondary">{ct(overrides, lang, 'infoHours', t)}</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        {ct(overrides, lang, 'footerRights', t)} · {year}
      </div>
    </footer>
  );
}
