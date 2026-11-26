import ReviewsSection from '@/components/ReviewsSection.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMenuItem } from '@/api/menu.js';
import { useCartStore, lineKey } from '@/store/cart.js';
import { formatPrice } from '@/components/MenuItemCard.jsx';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// The product detail page (doc 6.6): variant choice, add-ons, quantity,
// notes - then into the cart as one line identified by that exact
// configuration.
export default function ItemDetailPage({ lang }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addLine = useCartStore((s) => s.addLine);

  const [item, setItem] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [variantIdx, setVariantIdx] = useState(null); // null = base item
  const [selectedAddOns, setSelectedAddOns] = useState(() => new Set());
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setStatus('loading');
    getMenuItem(slug)
      .then((data) => {
        setItem(data.item);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [slug]);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const variantPrice = variantIdx === null ? item.basePrice : item.variants[variantIdx].price;
    const addOnsPrice = (item.addOns || [])
      .filter((_, i) => selectedAddOns.has(i))
      .reduce((sum, a) => sum + a.price, 0);
    return variantPrice + addOnsPrice;
  }, [item, variantIdx, selectedAddOns]);

  if (status === 'loading') {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 pb-16">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </section>
    );
  }
  if (status === 'error') {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 pb-16 text-center">
        <p className="mb-4 text-secondary">{t(lang, 'itemError')}</p>
        <Button variant="ghost" onClick={() => navigate('/')}>{t(lang, 'backHome')}</Button>
      </section>
    );
  }

  const toggleAddOn = (i) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const onAdd = () => {
    const variant = variantIdx === null ? null : item.variants[variantIdx];
    const addOns = (item.addOns || []).filter((_, i) => selectedAddOns.has(i));
    addLine({
      key: lineKey({
        slug: item.slug,
        variantId: variant?._id,
        addOnIds: addOns.map((a) => a._id),
      }),
      slug: item.slug,
      name: item.name,
      image: item.images?.[0]?.url || null,
      // Ids are what the server re-prices from at checkout (doc 8.5);
      // labels are display-only.
      variantId: variant?._id || null,
      addOnIds: addOns.map((a) => a._id),
      variantLabel: variant?.label || null,
      addOns: addOns.map((a) => ({ name: a.name, price: a.price })),
      notes: notes.trim(),
      qty,
      unitPrice,
    });
    navigate('/cart');
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-16">
      <h2 className="mb-1 text-3xl font-black text-foreground">{item.name[lang]}</h2>
      <p className="mb-6 text-secondary">{item.description[lang]}</p>

      {(item.variants || []).length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-bold text-secondary">{t(lang, 'chooseSize')}</h3>
          <div className="flex flex-wrap gap-2">
            {item.variants.map((variant, i) => (
              <Button
                key={variant._id || i}
                size="sm"
                variant={variantIdx === i ? 'default' : 'ghost'}
                onClick={() => setVariantIdx(i)}
              >
                {variant.label[lang]} · {formatPrice(lang, variant.price)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {(item.addOns || []).length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-bold text-secondary">{t(lang, 'chooseAddOns')}</h3>
          <div className="flex flex-wrap gap-2">
            {item.addOns.map((addOn, i) => (
              <Button
                key={addOn._id || i}
                size="sm"
                variant={selectedAddOns.has(i) ? 'default' : 'ghost'}
                onClick={() => toggleAddOn(i)}
              >
                {addOn.name[lang]} · +{formatPrice(lang, addOn.price)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-4">
        <h3 className="text-sm font-bold text-secondary">{t(lang, 'quantity')}</h3>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t(lang, 'decrease')}>-</Button>
          <span className="min-w-6 text-center text-lg font-bold text-foreground">{qty}</span>
          <Button size="sm" variant="ghost" onClick={() => setQty(qty + 1)} aria-label={t(lang, 'increase')}>+</Button>
        </div>
      </div>

      <label className="mb-6 flex flex-col gap-1 text-sm font-semibold text-secondary">
        {t(lang, 'notes')}
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t(lang, 'notesPlaceholder')}
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
        />
      </label>

      <Button onClick={onAdd} className="w-full">
        {t(lang, 'addToCart')} · {formatPrice(lang, unitPrice * qty)}
      </Button>
          <ReviewsSection lang={lang} slug={slug} />
</section>
  );
}
