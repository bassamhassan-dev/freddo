import { useCallback, useEffect, useState } from 'react';
import { apiAdminCoupons, apiCreateCoupon, apiUpdateCoupon } from '@/api/coupons.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Coupon management (doc 13): list/search, create, deactivate. No delete -
// a coupon with usage history stays for the ledger; deactivation is the
// "off" switch.
export default function AdminCoupons({ lang }) {
  const [coupons, setCoupons] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ code: '', discountType: 'percentage', value: '', minOrderAmount: '', usageLimitPerUser: '', expiresAt: '' });
  const [formError, setFormError] = useState(null);

  const load = useCallback(() => {
    apiAdminCoupons({ search: search || undefined })
      .then((data) => setCoupons(data.coupons))
      .catch(() => setError(true));
  }, [search]);

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await apiCreateCoupon({
        code: form.code,
        discountType: form.discountType,
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        usageLimitPerUser: form.usageLimitPerUser ? Number(form.usageLimitPerUser) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setForm({ code: '', discountType: 'percentage', value: '', minOrderAmount: '', usageLimitPerUser: '', expiresAt: '' });
      load();
    } catch (err) {
      setFormError(err.message?.[lang] || t(lang, 'orderError'));
    }
  };

  const toggle = async (coupon) => {
    await apiUpdateCoupon(coupon._id, { isActive: !coupon.isActive });
    load();
  };

  return (
    <div>
      <form onSubmit={submit} className="mb-6 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-extrabold text-foreground">{t(lang, 'createCoupon')}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className="rounded-xl border border-border bg-background p-2 text-foreground" placeholder={t(lang, 'couponCode')} dir="ltr"
            value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <select className="rounded-xl border border-border bg-background p-2 text-foreground"
            value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
            <option value="percentage">{t(lang, 'percentageType')}</option>
            <option value="fixed">{t(lang, 'fixedType')}</option>
          </select>
          <input className="rounded-xl border border-border bg-background p-2 text-foreground" placeholder={t(lang, 'couponValue')} type="number" min="1"
            value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
          <input className="rounded-xl border border-border bg-background p-2 text-foreground" placeholder={t(lang, 'minOrder')} type="number" min="0"
            value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
          <input className="rounded-xl border border-border bg-background p-2 text-foreground" placeholder={t(lang, 'perUserLimit')} type="number" min="1"
            value={form.usageLimitPerUser} onChange={(e) => setForm({ ...form, usageLimitPerUser: e.target.value })} />
          <input className="rounded-xl border border-border bg-background p-2 text-foreground" type="date"
            value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" size="sm" className="w-fit">{t(lang, 'createAccount')}</Button>
      </form>

      <input className="mb-4 w-full rounded-xl border border-border bg-background p-2 text-foreground" placeholder={t(lang, 'searchCoupons')} dir="ltr"
        value={search} onChange={(e) => setSearch(e.target.value)} />

      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {!coupons && !error && <Skeleton className="h-48 w-full rounded-2xl" />}

      <div className="flex flex-col gap-2">
        {(coupons || []).map((coupon) => (
          <div key={coupon._id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
            <div>
              <span className="font-mono font-bold text-accent" dir="ltr">{coupon.code}</span>
              <span className="ms-2 text-sm text-foreground">
                {coupon.discountType === 'percentage' ? `${coupon.value}%` : `${coupon.value} ${t(lang, 'egp')}`}
              </span>
              {!coupon.isActive && <Badge className="ms-2 text-xs">{t(lang, 'disabledCount')}</Badge>}
              <p className="mt-1 text-xs text-muted-foreground">
                {t(lang, 'usedCount')}: {coupon.usedCount}
                {coupon.usageLimitGlobal ? ` / ${coupon.usageLimitGlobal}` : ''}
                {coupon.expiresAt ? ` · ${new Date(coupon.expiresAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')}` : ''}
              </p>
            </div>
            <Button size="sm" variant={coupon.isActive ? 'ghost' : 'default'} onClick={() => toggle(coupon)}>
              {coupon.isActive ? t(lang, 'deactivate') : t(lang, 'activate')}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
