import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '@/api/client.js';
import { useContentStore, ct, sectionOn } from '@/store/content.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Sprint 24 extras: two eye-catching homepage bands, both CMS-controlled
// (show/hide + bilingual copy) like every other section.

function Stars({ value }) {
  return (
    <span className="text-accent" dir="ltr" aria-label={`${value}/5`}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

// Real cafe reviews (targetType 'cafe'), best first. Hidden when the admin
// turns the section off or when there is nothing to show yet.
export function TestimonialsSection({ lang }) {
  const { overrides, sections } = useContentStore();
  const [data, setData] = useState(null);
  useEffect(() => {
    request('/api/reviews?target=cafe').then(({ data: d }) => setData(d)).catch(() => setData({ reviews: [] }));
  }, []);
  if (!sectionOn(sections, 'sectionReviews')) return null;
  const top = (data?.reviews || []).filter((r) => r.comment).sort((a, b) => b.rating - a.rating).slice(0, 3);
  if (!top.length) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-14">
      <h2 className="mb-1 text-center text-2xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.5)]">
        {ct(overrides, lang, 'reviewsHomeTitle', t)}
      </h2>
      {data?.summary?.count > 0 && (
        <p className="mb-4 text-center text-sm text-secondary">
          <Stars value={Math.round(data.summary.average)} /> · {data.summary.average}/5 ({data.summary.count})
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {top.map((r) => (
          <figure
            key={r.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-neon-card"
          >
            <Stars value={r.rating} />
            <blockquote className="flex-1 text-sm leading-relaxed text-foreground">"{r.comment}"</blockquote>
            <figcaption className="text-xs font-bold text-secondary">{r.authorName || t(lang, 'reviewsAnonymous')}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// A gold band teasing the loyalty program, pulling visitors to sign up.
export function LoyaltyTeaser({ lang }) {
  const { overrides, sections } = useContentStore();
  if (!sectionOn(sections, 'sectionLoyalty')) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-14">
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-[radial-gradient(100%_120%_at_50%_0%,#3a2108_0%,#0b0806_75%)] px-6 py-10 text-center shadow-neon-card">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" aria-hidden="true" />
        <h2 className="mb-2 text-2xl font-black text-primary [text-shadow:0_0_18px_rgba(255,150,20,.6)] md:text-3xl">
          {ct(overrides, lang, 'loyaltyTitle', t)}
        </h2>
        <p className="mx-auto mb-5 max-w-xl text-sm font-semibold text-foreground md:text-base">
          {ct(overrides, lang, 'loyaltyBody', t)}
        </p>
        <Link to="/account">
          <Button>{ct(overrides, lang, 'loyaltyCta', t)}</Button>
        </Link>
      </div>
    </section>
  );
}
