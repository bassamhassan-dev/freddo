import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, cartSubtotal } from '@/store/cart.js';
import { formatPrice } from '@/components/MenuItemCard.jsx';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// The guest cart page. Prices here are display-only (doc 8.5): the server
// re-prices every line from the catalog at checkout, so a tampered
// localStorage cannot change what anyone pays.
export default function CartPage({ lang }) {
  const { lines, setQty, removeLine } = useCartStore();
  const navigate = useNavigate();
  const subtotal = useCartStore(cartSubtotal);

  if (lines.length === 0) {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 pb-16 text-center">
        <h2 className="mb-3 text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
          {t(lang, 'cartTitle')}
        </h2>
        <p className="mb-6 text-secondary">{t(lang, 'cartEmpty')}</p>
        <Link to="/" className="font-bold text-primary underline underline-offset-4">
          {t(lang, 'backHome')}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'cartTitle')}
      </h2>
      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <div key={line.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <p className="font-bold text-foreground">{line.name[lang]}</p>
              <p className="text-xs text-muted-foreground">
                {line.variantLabel ? line.variantLabel[lang] : t(lang, 'baseItem')}
                {line.addOns.length > 0 && ' · ' + line.addOns.map((a) => a.name[lang]).join('، ')}
                {line.notes && ` · ${line.notes}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setQty(line.key, line.qty - 1)} aria-label={t(lang, 'decrease')}>-</Button>
                <span className="min-w-6 text-center font-bold text-foreground">{line.qty}</span>
                <Button size="sm" variant="ghost" onClick={() => setQty(line.key, line.qty + 1)} aria-label={t(lang, 'increase')}>+</Button>
              </div>
              <span className="min-w-16 text-end font-extrabold text-accent">
                {formatPrice(lang, line.unitPrice * line.qty)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => removeLine(line.key)} aria-label={t(lang, 'remove')}>
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-primary/40 bg-card p-4">
        <span className="text-lg font-bold text-foreground">{t(lang, 'subtotal')}</span>
        <span className="text-xl font-extrabold text-accent [text-shadow:0_0_10px_rgba(255,150,20,.6)]">
          {formatPrice(lang, subtotal)}
        </span>
      </div>
      {/* The gate (doc 9.1): guests are bounced to login and come back here. */}
      <Button className="mt-4 w-full" onClick={() => navigate('/checkout')}>
        {t(lang, 'checkout')}
      </Button>
    </section>
  );
}
