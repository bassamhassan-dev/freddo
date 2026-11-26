import { useCallback, useEffect, useState } from 'react';
import { apiAdminReviews, apiSetReviewVisibility } from '@/api/reviews.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Moderation tab (doc 12): every review, filterable, hide/restore. Hidden
// reviews leave the public list and the product rating on the spot.
export default function AdminReviews({ lang }) {
  const [filter, setFilter] = useState(''); // '' | 'true' | 'false'
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiAdminReviews(filter === '' ? undefined : filter)
      .then((data) => setReviews(data.reviews))
      .catch(() => setError(true));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setVisibility = async (id, isVisible) => {
    await apiSetReviewVisibility(id, isVisible);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex justify-center gap-2">
        {[['', 'allReviews'], ['true', 'visibleOnly'], ['false', 'hiddenOnly']].map(([value, key]) => (
          <Button key={key} size="sm" variant={filter === value ? 'default' : 'ghost'} onClick={() => setFilter(value)}>
            {t(lang, key)}
          </Button>
        ))}
      </div>

      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {!reviews && !error && <Skeleton className="h-48 w-full rounded-2xl" />}

      <div className="flex flex-col gap-2">
        {(reviews || []).map((review) => (
          <div key={review.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
            <div>
              <span className="font-bold text-foreground">{review.authorName}</span>
              <span className="ms-2 text-accent" dir="ltr">{'★'.repeat(review.rating)}</span>
              <span className="ms-2 text-xs text-muted-foreground">
                {review.targetType === 'product' ? (review.productName?.[lang] || review.productSlug) : t(lang, 'cafeTarget')}
              </span>
              {!review.isVisible && <Badge className="ms-2 text-xs">{t(lang, 'hiddenBadge')}</Badge>}
              <p className="mt-1 text-sm text-secondary">{review.comment}</p>
            </div>
            <Button size="sm" variant={review.isVisible ? 'ghost' : 'default'} onClick={() => setVisibility(review.id, !review.isVisible)}>
              {review.isVisible ? t(lang, 'hideReview') : t(lang, 'restoreReview')}
            </Button>
          </div>
        ))}
        {reviews && reviews.length === 0 && <p className="text-center text-secondary">{t(lang, 'noReviews')}</p>}
      </div>
    </div>
  );
}
