import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, cartSubtotal } from '@/store/cart.js';
import { apiCreateOrder } from '@/api/orders.js';
import { apiValidateCoupon } from '@/api/coupons.js';
import { apiMyLoyalty } from '@/api/loyalty.js';
import { formatPrice } from '@/components/MenuItemCard.jsx';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Checkout (doc 9.2): pickup + cash on delivery is v1, so the only data
// needed is a phone and optional notes. The cart lines are sent as
// slugs/ids/qty; the server re-prices every line from the catalog.
export default function CheckoutPage({ lang }) {
  const { lines, clear } = useCartStore();
  const subtotal = useCartStore(cartSubtotal);
  // Applied coupon: { code, discount }. The server recomputes everything at
  // submit; this is only the live preview (doc 13.3).
  const [coupon, setCoupon] = useState(null);
  // Loyalty redemption (100 points = one free drink, drinks only). Balance
  // comes from the server; the comped amount preview mirrors the server
  // rule (cheapest drink unit). The server re-decides everything at submit.
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [redeem, setRedeem] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState(null);

  useEffect(() => {
    apiMyLoyalty().then(({ balance }) => setLoyaltyBalance(balance || 0)).catch(() => {});
  }, []);
  const drinkUnitPrices = lines.filter((l) => l.isDrink).map((l) => l.unitPrice);
  const freeDrinkValue = drinkUnitPrices.length > 0 ? Math.min(...drinkUnitPrices) : 0;
  const canRedeem = loyaltyBalance >= 100 && freeDrinkValue > 0;
  const loyaltyDiscount = redeem && canRedeem ? freeDrinkValue : 0;
  const total = subtotal - (coupon?.discount || 0) - loyaltyDiscount;
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // One key per checkout attempt: a double-click or retry replays safely
  // instead of placing the order twice (doc 9.4 idempotency).
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const payloadLines = useMemo(
    () =>
      lines.map((line) => ({
        slug: line.slug,
        variantId: line.variantId,
        addOnIds: line.addOnIds,
        qty: line.qty,
        notes: line.notes,
      })),
    [lines]
  );

  if (lines.length === 0) {
    return (
      <section className="mx-auto w-full max-w-md px-5 pb-16 text-center">
        <p className="mb-6 text-secondary">{t(lang, 'cartEmpty')}</p>
        <Button variant="ghost" onClick={() => navigate('/')}>{t(lang, 'backHome')}</Button>
      </section>
    );
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { order } = await apiCreateOrder({ phone, notes, lines: payloadLines, idempotencyKey, couponCode: coupon?.code, redeemPoints: redeem && canRedeem });
      clear();
      setIdempotencyKey(crypto.randomUUID());
      navigate(`/orders/${order._id}`, { replace: true, state: { placed: true } });
    } catch (err) {
      setError(err.message?.[lang] || t(lang, 'orderError'));
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'checkoutTitle')}
      </h2>

      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-foreground">
              {line.name[lang]} {line.variantLabel ? `(${line.variantLabel[lang]})` : ''} × {line.qty}
            </span>
            <span className="font-bold text-accent">{formatPrice(lang, line.unitPrice * line.qty)}</span>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="font-bold text-foreground">{t(lang, 'subtotal')}</span>
          <span className="font-bold text-foreground">{formatPrice(lang, subtotal)}</span>
        </div>
        {coupon && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary">{t(lang, 'discount')} ({coupon.code})</span>
            <span className="text-primary">-{formatPrice(lang, coupon.discount)}</span>
          </div>
        )}
        {canRedeem && (
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground">
            <input type="checkbox" checked={redeem} onChange={(e) => setRedeem(e.target.checked)} />
            {t(lang, 'redeemFreeDrink')} ({loyaltyBalance} {t(lang, 'pointsUnit')})
          </label>
        )}
        {loyaltyDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-primary">{t(lang, 'freeDrinkDiscount')}</span>
            <span className="text-primary">-{formatPrice(lang, loyaltyDiscount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-accent">{t(lang, 'total')}</span>
          <span className="font-extrabold text-accent">{formatPrice(lang, total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t(lang, 'codNote')}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
          {t(lang, 'phone')}
          <input
            type="tel"
            required
            dir="ltr"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
          {t(lang, 'orderNotes')}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(lang, 'orderNotesPlaceholder')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
        {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
                  <div className="mb-4 flex gap-2">
            <input
              className="w-full rounded-xl border border-border bg-background p-3 text-foreground"
              placeholder={t(lang, 'couponPlaceholder')}
              dir="ltr"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            {coupon ? (
              <Button type="button" variant="ghost" onClick={() => { setCoupon(null); setCouponInput(''); }}>
                {t(lang, 'removeCoupon')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  setCouponError(null);
                  try {
                    const applied = await apiValidateCoupon(couponInput, subtotal);
                    setCoupon({ code: applied.code, discount: applied.discount });
                  } catch (err) {
                    setCouponError(err.message?.[lang] || t(lang, 'orderError'));
                  }
                }}
              >
                {t(lang, 'applyCoupon')}
              </Button>
            )}
          </div>
          {couponError && <p className="mb-2 text-sm text-destructive">{couponError}</p>}
<Button type="submit" disabled={busy}>
          {busy ? t(lang, 'authWorking') : `${t(lang, 'placeOrder')} · ${formatPrice(lang, total)}`}
        </Button>
      </form>
    </section>
  );
}
