import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// One banner card: background artwork + gradient + bilingual HTML overlay
// (text never lives inside the artwork - Sprint 21 lesson). Internal CTAs
// use Link, external ones open in a new tab.
export default function BannerCard({ banner, lang, className = 'h-32' }) {
  const inner = (
    <div
      className={`relative flex w-full items-end overflow-hidden rounded-2xl border border-border bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url(${banner.imageUrl})` }}
    >
      <div className="w-full bg-gradient-to-t from-black/85 to-transparent p-4">
        <p className="font-black text-primary text-base md:text-lg">{banner.title[lang]}</p>
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
