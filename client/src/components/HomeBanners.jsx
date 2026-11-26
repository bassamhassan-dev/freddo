import { useEffect, useState } from 'react';
import { apiBanners } from '@/api/banners.js';
import BannerCard from '@/components/BannerCard.jsx';

// The two secondary banners right under the hero slider (doc 5.1/23): a
// rectangular 2-up row, taller on desktop so the first screen reads as one
// composed full-screen block.
export default function HomeBanners({ lang }) {
  const [left, setLeft] = useState([]);
  const [right, setRight] = useState([]);

  useEffect(() => {
    apiBanners('secondary_left').then((d) => setLeft(d.banners || [])).catch(() => {});
    apiBanners('secondary_right').then((d) => setRight(d.banners || [])).catch(() => {});
  }, []);

  if (!left.length && !right.length) return null;

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-5 pb-10">
      {left[0] && <BannerCard banner={left[0]} lang={lang} className="h-36 md:h-44" />}
      {right[0] && <BannerCard banner={right[0]} lang={lang} className="h-36 md:h-44" />}
    </section>
  );
}
