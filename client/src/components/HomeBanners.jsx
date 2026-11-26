import { useEffect, useState } from 'react';
import { apiBanners } from '@/api/banners.js';
import BannerCard from '@/components/BannerCard.jsx';

// The secondary banners right under the hero slider (doc 5.1/23/25): a
// rectangular row seeded with four different cards, taller on desktop so
// the band carries real visual weight.
export default function HomeBanners({ lang }) {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    Promise.all([apiBanners('secondary_left'), apiBanners('secondary_right')])
      .then(([l, r]) => setBanners([...(l.banners || []), ...(r.banners || [])]))
      .catch(() => {});
  }, []);

  if (!banners.length) return null;

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-5 pb-10 sm:grid-cols-2">
      {banners.slice(0, 4).map((b) => (
        <BannerCard key={b._id} banner={b} lang={lang} className="h-40 md:h-56" />
      ))}
    </section>
  );
}
