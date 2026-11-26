import { useEffect, useState } from 'react';
import { apiAdminAnalytics } from '@/api/analytics.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Admin analytics dashboard (doc 15): every number is aggregated
// server-side from real collections - nothing is counted on the client.
const RANGES = ['7d', '30d', 'month', 'prevMonth'];

function fromFor(range) {
  const now = new Date();
  if (range === '7d') return new Date(now.getTime() - 7 * 86400000);
  if (range === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), now.getMonth() - 1, 1); // prevMonth
}
function toFor(range) {
  if (range !== 'prevMonth') return undefined;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-xl font-black text-primary">{value}</p>
      <p className="text-xs text-secondary">{label}</p>
    </div>
  );
}

export default function AdminAnalytics({ lang }) {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    apiAdminAnalytics({ from: fromFor(range).toISOString(), to: toFor(range)?.toISOString() })
      .then(setData)
      .catch(() => setError(true));
  }, [range]);

  if (error) return <p className="text-center text-red-400">{t(lang, 'genericError')}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-2">
        {RANGES.map((r) => (
          <Button key={r} size="sm" variant={range === r ? 'default' : 'ghost'} onClick={() => setRange(r)}>
            {t(lang, `range_${r}`)}
          </Button>
        ))}
      </div>
      {!data ? (
        <p className="text-center text-secondary">{t(lang, 'loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Kpi label={t(lang, 'kpiRevenue')} value={`${data.revenue} ${t(lang, 'egp')}`} />
            <Kpi label={t(lang, 'kpiAov')} value={`${data.averageOrderValue} ${t(lang, 'egp')}`} />
            <Kpi label={t(lang, 'kpiOrders')} value={data.orders} />
            <Kpi label={t(lang, 'kpiCancelled')} value={data.cancelledOrders} />
            <Kpi label={t(lang, 'kpiNewCustomers')} value={data.newCustomers} />
            <Kpi label={t(lang, 'kpiReservations')} value={Object.values(data.reservationsByStatus).reduce((a, b) => a + b, 0)} />
            <Kpi label={t(lang, 'kpiCouponUses')} value={data.coupons.uses} />
            <Kpi label={t(lang, 'kpiDiscounts')} value={`${data.coupons.discountTotal} ${t(lang, 'egp')}`} />
            <Kpi label={t(lang, 'kpiLoyaltyEarned')} value={data.loyalty.earned} />
          </div>

          {data.topProducts.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-bold text-foreground">{t(lang, 'kpiTopProducts')}</p>
              <ul className="flex flex-col gap-1 text-xs text-secondary">
                {data.topProducts.map((p) => (
                  <li key={p._id} className="flex justify-between gap-2">
                    <span>{lang === 'ar' ? p.nameAr : p._id}</span>
                    <span>{p.qty} · {p.revenue} {t(lang, 'egp')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Object.keys(data.ordersByStatus).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-bold text-foreground">{t(lang, 'kpiOrdersByStatus')}</p>
              <ul className="flex flex-wrap gap-2 text-xs text-secondary">
                {Object.entries(data.ordersByStatus).map(([status, count]) => (
                  <li key={status} className="rounded-full border border-border px-3 py-1">
                    {t(lang, `status_${status}`)}: {count}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
