import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiBanners } from '@/api/banners.js';
import { getMenu } from '@/api/menu.js';
import { useContentStore, ct, sectionOn } from '@/store/content.js';
import { t } from '@/i18n/index.js';
import MenuItemCard from '@/components/MenuItemCard.jsx';
import BannerCard from '@/components/BannerCard.jsx';

// Sprint 23b: the scroll-discovery homepage sections. Each one is
// show/hide-controllable from the admin CMS (sectionOn) and its copy is a
// CMS override with an i18n fallback (ct).

export function FeaturedSection({ lang }) {
  const { overrides, sections } = useContentStore();
  const [items, setItems] = useState([]);
  useEffect(() => {
    getMenu().then((d) => setItems((d.items || []).filter((i) => i.isFeatured))).catch(() => {});
  }, []);
  if (!sectionOn(sections, 'sectionFeatured') || !items.length) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-12">
      <h2 className="mb-1 text-center text-2xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.5)]">
        {ct(overrides, lang, 'featuredTitle', t)}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <MenuItemCard key={item._id} item={item} lang={lang} />)}
      </div>
    </section>
  );
}

export function OffersSection({ lang }) {
  const { overrides, sections } = useContentStore();
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    apiBanners('offers').then((d) => setBanners(d.banners || [])).catch(() => {});
  }, []);
  if (!sectionOn(sections, 'sectionOffers') || !banners.length) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-12">
      <h2 className="mb-1 text-center text-2xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.5)]">
        {ct(overrides, lang, 'offersTitle', t)}
      </h2>
      <p className="mb-4 text-center text-sm text-secondary">{ct(overrides, lang, 'offersSubtitle', t)}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((b) => <BannerCard key={b._id} banner={b} lang={lang} className="h-44" />)}
      </div>
    </section>
  );
}

export function AboutSection({ lang }) {
  const { overrides, sections } = useContentStore();
  if (!sectionOn(sections, 'sectionAbout')) return null;
  // Real interior photos; the admin replaces each via the aboutImage URL keys.
  const img1 = ct(overrides, lang, 'aboutImage1', t);
  const img2 = ct(overrides, lang, 'aboutImage2', t);
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 pb-12 md:flex-row md:gap-10">
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <img src={img1} alt="" className="h-56 w-full rounded-2xl border border-border object-cover" loading="lazy" />
        <img src={img2} alt="" className="mt-8 h-56 w-full rounded-2xl border border-border object-cover" loading="lazy" />
      </div>
      <div className="text-center md:text-start">
        <h2 className="mb-2 text-2xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.5)]">
          {ct(overrides, lang, 'aboutTitle', t)}
        </h2>
        <p className="max-w-xl leading-relaxed text-secondary">{ct(overrides, lang, 'aboutBody', t)}</p>
      </div>
    </section>
  );
}

export function GallerySection({ lang }) {
  const { overrides, sections } = useContentStore();
  if (!sectionOn(sections, 'sectionGallery')) return null;
  // Six photo slots, each replaceable from the CMS (galleryImage1-6).
  const photos = [1, 2, 3, 4, 5, 6].map((i) => ct(overrides, lang, `galleryImage${i}`, t));
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-14">
      <h2 className="mb-4 text-center text-2xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.5)]">
        {ct(overrides, lang, 'galleryTitle', t)}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="h-40 w-full rounded-2xl border border-border object-cover transition hover:opacity-90 sm:h-52"
          />
        ))}
      </div>
    </section>
  );
}

const iconCls = 'h-5 w-5 text-primary';
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconCls} aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
  </svg>
);
const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconCls} aria-hidden="true">
    <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconCls} aria-hidden="true">
    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
  </svg>
);

export function InfoStrip({ lang }) {
  const { overrides, sections } = useContentStore();
  if (!sectionOn(sections, 'sectionInfo')) return null;
  const cell = 'flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 text-center';
  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-5 pb-14 sm:grid-cols-3">
      <div className={cell}>
        <ClockIcon />
        <p className="text-sm font-bold text-foreground">{ct(overrides, lang, 'infoHours', t)}</p>
      </div>
      <div className={cell}>
        <PinIcon />
        <p className="text-sm font-bold text-foreground">{ct(overrides, lang, 'infoLocation', t)}</p>
      </div>
      <div className={cell}>
        <PhoneIcon />
        <p className="text-sm font-bold text-foreground" dir="ltr">{ct(overrides, lang, 'infoPhone', t)}</p>
      </div>
    </section>
  );
}
