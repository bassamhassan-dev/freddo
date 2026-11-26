import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiBanners } from '@/api/banners.js';
import { Button } from '@/components/ui/button';
import HeroSection from '@/components/HeroSection.jsx';

// Sprint 23: the hero IS the slider - a big full-bleed rotation of the
// 'main' banners, auto-advancing every ~3 seconds. Slides crossfade with
// CSS opacity; the artwork is decorative and the text is a bilingual HTML
// overlay, so both languages read correctly. Honors the user's motion
// preference: no auto-rotation and no crossfade under
// prefers-reduced-motion. With no main banners yet, the classic Freddo
// mark hero takes over.
const ROTATE_MS = 2800;

export default function HeroSlider({ lang }) {
  const [banners, setBanners] = useState(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    apiBanners('main').then((d) => setBanners(d.banners || [])).catch(() => setBanners([]));
  }, []);

  const reduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!banners || banners.length < 2 || paused || reduced) return undefined;
    const id = setInterval(() => setSlide((s) => (s + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [banners, paused, reduced]);

  if (banners === null) return <div className="h-[55vh] w-full animate-pulse bg-card" />;
  if (banners.length === 0) return <HeroSection lang={lang} />;

  const active = banners[slide];

  return (
    <section
      className="relative h-[55vh] min-h-[340px] w-full overflow-hidden md:h-[68vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <div
          key={b._id}
          aria-hidden={i !== slide}
          className={`absolute inset-0 bg-cover bg-center motion-safe:transition-opacity motion-safe:duration-700 ${
            i === slide ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url(${b.imageUrl})` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0806] via-black/40 to-black/20" />
      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col items-start justify-end gap-3 px-5 pb-12">
        <p className="text-3xl font-black text-primary [text-shadow:0_0_18px_rgba(255,150,20,.6)] md:text-5xl">
          {active.title[lang]}
        </p>
        {active.description?.[lang] && (
          <p className="max-w-lg text-sm font-semibold text-foreground md:text-base">{active.description[lang]}</p>
        )}
        {active.ctaText?.[lang] && active.ctaLink && (
          active.ctaLink.startsWith('/') ? (
            <Link to={active.ctaLink}><Button className="mt-1">{active.ctaText[lang]}</Button></Link>
          ) : (
            <a href={active.ctaLink} target="_blank" rel="noreferrer"><Button className="mt-1">{active.ctaText[lang]}</Button></a>
          )
        )}
        {banners.length > 1 && (
          <div className="absolute bottom-4 start-1/2 flex -translate-x-1/2 gap-1 rtl:translate-x-1/2">
            {banners.map((b, i) => (
              <button
                key={b._id}
                type="button"
                aria-label={`slide ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-1.5 w-7 rounded-full transition-colors duration-300 ${i === slide ? 'bg-primary shadow-neon-sm' : 'bg-cream/30'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
