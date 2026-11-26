import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiReviews, apiWriteReview } from '@/api/reviews.js';
import { useAuthStore } from '@/store/auth.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Stars rendered as text - no icon library needed for five glyphs.
function Stars({ value }) {
  return (
    <span className="text-accent" dir="ltr" aria-label={`${value}/5`}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

// Reviews on the item detail page (doc 12): public list, and a form for
// logged-in customers. One review per customer - submitting again edits it.
export default function ReviewsSection({ lang, slug }) {
  const { user, status } = useAuthStore();
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    apiReviews(slug).then(setData).catch(() => setError(true));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiWriteReview({ targetType: 'product', productSlug: slug, rating, comment });
      setComment('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      load();
    } catch (err) {
      setError(err.message?.[lang] || t(lang, 'orderError'));
    }
  };

  return (
    <section className="mt-10">
      <h3 className="mb-1 text-2xl font-black text-foreground">{t(lang, 'reviewsTitle')}</h3>
      {data && (
        <p className="mb-4 text-sm text-secondary">
          <Stars value={Math.round(data.summary.average)} /> {data.summary.average} ({data.summary.count} {t(lang, 'reviewsCount')})
        </p>
      )}

      {status === 'guest' && (
        <p className="mb-4 text-sm text-secondary">
          <Link to="/login" className="text-primary underline">{t(lang, 'loginToReview')}</Link>
        </p>
      )}

      {user && (
        <form onSubmit={submit} className="mb-6 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? 'text-accent' : 'text-muted-foreground'}`}
                aria-label={`${n}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            className="min-h-20 rounded-xl border border-border bg-background p-2 text-foreground"
            placeholder={t(lang, 'reviewPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-primary">{t(lang, 'reviewSaved')}</p>}
          <Button type="submit" size="sm" className="w-fit">{t(lang, 'submitReview')}</Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {(data?.reviews || []).map((review) => (
          <div key={review.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground">{review.authorName}</span>
              <Stars value={review.rating} />
              {review.isVerifiedPurchase && <Badge className="text-xs">{t(lang, 'verifiedPurchase')}</Badge>}
              <span className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
              </span>
            </div>
            <p className="mt-1 text-sm text-secondary">{review.comment}</p>
          </div>
        ))}
        {data && data.reviews.length === 0 && (
          <p className="text-sm text-secondary">{t(lang, 'noReviews')}</p>
        )}
      </div>
    </section>
  );
}
