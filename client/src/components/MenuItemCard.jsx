import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n/index.js';

export function formatPrice(lang, price) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(price);
}

// One menu item. All text comes from the API in both languages; the card
// picks the active one, so nothing needs re-fetching when language flips.
export default function MenuItemCard({ item, lang }) {
  const variantPrices = (item.variants || []).map((v) => v.price);
  const lowestPrice = Math.min(item.basePrice, ...variantPrices);

  return (
    <Card className="flex h-full flex-col transition-colors hover:border-primary/60">
      <Link to={`/item/${item.slug}`} className="flex h-full flex-col" aria-label={item.name[lang]}>
      {item.images?.[0]?.url ? (
        <img
          src={item.images[0].url}
          alt={item.images[0].alt?.[lang] || item.images[0].alt?.en || item.name[lang]}
          className="h-36 w-full rounded-t-xl object-cover"
          loading="lazy"
        />
      ) : null}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{item.name[lang]}</CardTitle>
          <span className="shrink-0 text-lg font-extrabold text-accent [text-shadow:0_0_10px_rgba(255,150,20,.6)]">
            {variantPrices.length > 0 && (
              <span className="me-1 text-xs font-semibold text-muted-foreground">{t(lang, 'from')} </span>
            )}
            {formatPrice(lang, lowestPrice)}
          </span>
        </div>
        <CardDescription>{item.description[lang]}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex-wrap">
        <Badge variant="muted">{item.category.name[lang]}</Badge>
        {item.isBestSeller && <Badge>{t(lang, 'bestSeller')}</Badge>}
        {item.isFeatured && <Badge variant="accent">{t(lang, 'featured')}</Badge>}
      </CardFooter>
      </Link>
    </Card>
  );
}
