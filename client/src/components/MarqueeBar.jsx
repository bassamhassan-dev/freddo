import { useEffect, useState } from 'react';
import { getMarquee } from '@/api/marquee.js';

// Announcement marquee (Sprint 28): a thin strip right after the hero with
// the admin's phrases scrolling continuously. Pure CSS transform animation
// (cheap on the compositor), content duplicated once for a seamless loop,
// direction-aware (Arabic scrolls with its reading direction), and fully
// static when the user prefers reduced motion.
export default function MarqueeBar({ lang }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getMarquee().then(setData).catch(() => {});
  }, []);

  if (!data?.enabled || !data.phrases?.length) return null;

  // Four copies: the track shifts by exactly one copy width, so the loop
  // is seamless on any viewport up to 3x the content width.
  const strip = (key) => (
    <div key={key} className="marquee-half" aria-hidden={key !== 0}>
      {data.phrases.map((p, i) => (
        <span key={i} className="marquee-phrase">
          {p[lang] || p.en}
          <span className="marquee-dot" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="marquee-bar" role="marquee" aria-label={lang === 'ar' ? 'إعلانات' : 'Announcements'}>
      <div className="marquee-track">
        {[0, 1, 2, 3].map(strip)}
      </div>
    </div>
  );
}
