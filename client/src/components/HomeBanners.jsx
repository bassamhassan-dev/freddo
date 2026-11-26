import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiBanners } from '@/api/banners.js';
import { Button } from '@/components/ui/button';

// Homepage banners (doc 5.1): a main slider plus two secondary slots.
// Content, order, active state and campaign windows are admin-managed;
// this component only renders what the public API returns.
function BannerCard({ banner, lang, tall }) {
  const inner = (
    <div
      className={`relative flex w-full items-end overflow-hidden rounded-2xl border border-border bg-cover bg-center ${tall ? 'h-64' : 'h-32'}`}
      style={{ backgroundImage: `url(${banner.imageUrl})` }}
    >
      <div className="w-full bg-gradient-to-t from-black/85 to-transparent p-4">
        <p className={`font-black text-primary ${tall ? 'text-2xl' : 'text-base'}`}>{banner.title[lang]}</p>
        {banner.description?.[lang] && <p className="text-xs text-foreground">{banner.description[lang]}</p>}
        {banner.ctaText?.[lang] && banner.ctaLink && (
          <Button size="sm" className="mt-2">{banner.ctaText[lang]}</Button>
        )}
      </div>
    </div>
  );
  return banner.ctaLink?.startsWith('/') ? <Link to={banner.ctaLink}>{inner}</Link>
    : banner.ctaLink ? <a href={banner.ctaLink} target="_blank" rel="noreferrer">{inner}</a>
    : inner;
}

export default function HomeBanners({ lang }) {
  const [main, setMain] = useState([]);
  const [left, setLeft] = useState([]);
  const [right, setRight] = useState([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    apiBanners('main').then((d) => setMain(d.banners || [])).catch(() => {});
    apiBanners('secondary_left').then((d) => setLeft(d.banners || [])).catch(() => {});
    apiBanners('secondary_right').then((d) => setRight(d.banners || [])).catch(() => {});
  }, []);

  // Simple slider: advance every 5 seconds when there is more than one slide.
  useEffect(() => {
    if (main.length < 2) return undefined;
    const id = setInterval(() => setSlide((s) => (s + 1) % main.length), 5000);
    return () => clearInterval(id);
  }, [main.length]);

  if (!main.length && !left.length && !right.length) return null;

  return (
    <section className="mx-auto mb-10 flex w-full max-w-4xl flex-col gap-3 px-5">
      {main.length > 0 && (
        <div>
          <BannerCard banner={main[slide]} lang={lang} tall />
          {main.length > 1 && (
            <div className="mt-2 flex justify-center gap-1">
              {main.map((b, i) => (
                <button
                  key={b._id}
                  type="button"
                  aria-label={`slide ${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={`h-1.5 w-6 rounded-full ${i === slide ? 'bg-primary' : 'bg-border'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {(left.length > 0 || right.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {left[0] && <BannerCard banner={left[0]} lang={lang} />}
          {right[0] && <BannerCard banner={right[0]} lang={lang} />}
        </div>
      )}
    </section>
  );
}
