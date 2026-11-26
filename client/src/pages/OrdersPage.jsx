import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiMyOrders } from '@/api/orders.js';
import { formatPrice } from '@/components/MenuItemCard.jsx';
import { t } from '@/i18n/index.js';
import { Skeleton } from '@/components/ui/skeleton';

// The customer's order history (doc 9.7), newest first.
export default function OrdersPage({ lang }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiMyOrders()
      .then((data) => setOrders(data.orders))
      .catch(() => setError(true));
  }, []);

  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'myOrders')}
      </h2>
      {!orders && !error && <Skeleton className="h-40 w-full rounded-2xl" />}
      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {orders && orders.length === 0 && (
        <p className="text-center text-secondary">{t(lang, 'noOrders')}</p>
      )}
      <div className="flex flex-col gap-3">
        {(orders || []).map((order) => (
          <Link
            key={order._id}
            to={`/orders/${order._id}`}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
          >
            <div>
              <p className="font-bold text-foreground" dir="ltr">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
              </p>
            </div>
            <div className="text-end">
              <p className="font-extrabold text-accent">{formatPrice(lang, order.total)}</p>
              <p className="text-xs font-bold text-secondary">
                {t(lang, `status_${order.status}`)} · {t(lang, `fulfillment_${order.fulfillmentType || 'pickup'}`)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
