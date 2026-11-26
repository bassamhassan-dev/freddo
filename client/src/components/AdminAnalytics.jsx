import { useEffect, useMemo, useState } from 'react';
import { apiAdminAnalytics } from '@/api/analytics.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Admin analytics dashboard (docs 15 + 22). Numbers are aggregated
// server-side; the charts are hand-rolled SVG - no chart dependency: the
// shapes are simple, the bundle stays put, and the neon styling is fully
// ours. Every chart is bilingual and hoverable.
const RANGES = ['7d', '30d', 'month', 'prevMonth'];
const STATUS_COLORS = {
  pending: '#ffd27a', confirmed: '#ffb21a', preparing: '#ff9a0a',
  ready: '#f6e7cf', completed: '#8fce6a', cancelled: '#e05555',
};

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

// Zero-fill the daily series so quiet days show as real dips, not gaps.
function fillDays(daily, from, to) {
  const map = new Map(daily.map((d) => [d.date, d]));
  const out = [];
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) {
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, orders: map.get(key)?.orders || 0, revenue: map.get(key)?.revenue || 0 });
  }
  return out;
}

// SVG area+line chart with hover points and a bilingual tooltip.
function RevenueChart({ daily, lang }) {
  const [hover, setHover] = useState(null);
  const W = 640; const H = 180; const PAD = 8;
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  const x = (i) => PAD + (i * (W - 2 * PAD)) / Math.max(1, daily.length - 1);
  const y = (v) => H - PAD - (v / max) * (H - 2 * PAD);
  const points = daily.map((d, i) => `${x(i)},${y(d.revenue)}`).join(' ');
  const area = `${PAD},${H - PAD} ${points} ${W - PAD},${H - PAD}`;
  const label = hover !== null
    ? `${daily[hover].date} · ${daily[hover].revenue} ${t(lang, 'egp')}`
    : '';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{t(lang, 'chartRevenueTitle')}</p>
        <p className="min-h-4 text-xs text-accent" dir="ltr">{label}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" dir="ltr">
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb21a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffb21a" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#rev-fill)" />
        <polyline points={points} fill="none" stroke="#ffb21a" strokeWidth="2.5" strokeLinejoin="round" />
        {daily.map((d, i) => (
          <circle
            key={d.date}
            cx={x(i)} cy={y(d.revenue)}
            r={hover === i ? 5 : 2.5}
            fill={hover === i ? '#ffd27a' : '#ffb21a'}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{`${d.date}: ${d.revenue}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function BarRow({ label, value, max, color, trailing }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 truncate text-secondary">{label}</span>
      <div className="h-2.5 flex-1 rounded-full bg-muted/40">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.max(2, (value / Math.max(1, max)) * 100)}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}55` }}
        />
      </div>
      <span className="w-20 shrink-0 text-end font-bold text-foreground">{trailing}</span>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/60">
      <p className="text-xl font-black text-primary [text-shadow:0_0_12px_rgba(255,150,20,.4)]">{value}</p>
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

  const daily = useMemo(
    () => (data ? fillDays(data.daily || [], fromFor(range), toFor(range) || new Date()) : []),
    [data, range],
  );

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

          {daily.length > 1 && <RevenueChart daily={daily} lang={lang} />}

          <div className="grid gap-4 md:grid-cols-2">
            {Object.keys(data.ordersByStatus).length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-bold text-foreground">{t(lang, 'chartStatusTitle')}</p>
                <div className="flex flex-col gap-2">
                  {Object.entries(data.ordersByStatus).map(([status, count]) => (
                    <BarRow
                      key={status}
                      label={t(lang, `status_${status}`)}
                      value={count}
                      max={Math.max(...Object.values(data.ordersByStatus))}
                      color={STATUS_COLORS[status] || '#b9a78d'}
                      trailing={count}
                    />
                  ))}
                </div>
              </div>
            )}
            {data.topProducts.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-bold text-foreground">{t(lang, 'chartTopTitle')}</p>
                <div className="flex flex-col gap-2">
                  {data.topProducts.map((p) => (
                    <BarRow
                      key={p._id}
                      label={lang === 'ar' ? p.nameAr : p._id}
                      value={p.qty}
                      max={data.topProducts[0].qty}
                      color="#ffb21a"
                      trailing={`${p.qty} · ${p.revenue} ${t(lang, 'egp')}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
