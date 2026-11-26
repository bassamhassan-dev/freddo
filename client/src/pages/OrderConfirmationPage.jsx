import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiGetOrder, apiCancelOrder } from '@/api/orders.js';
import { formatPrice } from '@/components/MenuItemCard.jsx';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// One order: the confirmation right after placing it, and the tracking
// view later (doc 9.7). Cancellation is offered only while the server
// still allows it (status pending).
export default function OrderConfirmationPage({ lang }) {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiGetOrder(id)
      .then((data) => {
        setOrder(data.order);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [id]);

  if (status === 'loading') {
    return (
      <section className="mx-auto w-full max-w-md px-5 pb-16">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </section>
    );
  }
  if (status === 'error') {
    return (
      <section className="mx-auto w-full max-w-md px-5 pb-16 text-center">
        <p className="mb-4 text-secondary">{t(lang, 'orderNotFound')}</p>
        <Link to="/orders" className="font-bold text-primary underline underline-offset-4">{t(lang, 'myOrders')}</Link>
      </section>
    );
  }

  const onCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiCancelOrder(id);
      setOrder(data.order);
    } catch (err) {
      setError(err.message?.[lang] || t(lang, 'orderError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16">
      {location.state?.placed && (
        <p className="mb-4 rounded-2xl border border-primary/50 bg-primary/10 p-4 text-center font-bold text-primary">
          {t(lang, 'orderPlaced')}
        </p>
      )}
      <div className="mb-4 text-center">
        <p className="text-sm text-secondary">{t(lang, 'orderNumber')}</p>
        <h2 className="text-3xl font-black tracking-wide text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]" dir="ltr">
          {order.orderNumber}
        </h2>
        <p className="mt-1 text-sm font-bold text-foreground">{t(lang, `status_${order.status}`)}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-foreground">
              {item.name[lang]} {item.variantLabel ? `(${item.variantLabel[lang]})` : ''} × {item.qty}
            </span>
            <span className="font-bold text-accent">{formatPrice(lang, item.lineTotal)}</span>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="font-bold text-foreground">{t(lang, 'total')}</span>
          <span className="font-extrabold text-accent">{formatPrice(lang, order.total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t(lang, 'codNote')}</p>
      </div>

      {error && <p className="mt-3 text-center text-sm font-semibold text-red-400">{error}</p>}

      {order.status === 'pending' && (
        <Button variant="ghost" disabled={busy} onClick={onCancel} className="mt-4 w-full">
          {busy ? t(lang, 'authWorking') : t(lang, 'cancelOrder')}
        </Button>
      )}
      <Link to="/orders" className="mt-4 block text-center text-sm font-bold text-primary underline underline-offset-4">
        {t(lang, 'myOrders')}
      </Link>
    </section>
  );
}
