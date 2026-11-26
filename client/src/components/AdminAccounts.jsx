import { useCallback, useEffect, useState } from 'react';
import { apiAdminAccounts, apiCreateAccount, apiSetAccountStatus, apiSetAccountRole, apiAdminAdjustPoints } from '@/api/admin.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ChatAvatar from './ChatAvatar.jsx';
import { apiLoyaltySettings, apiSaveLoyaltySettings } from '@/api/loyalty.js';

// Sprint 36: the two loyalty rules, editable. Defaults: 10% of the order
// total becomes points, 100 points buy one free drink.
function LoyaltyRules({ lang }) {
  const [rules, setRules] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => { apiLoyaltySettings().then(setRules).catch(() => {}); }, []);
  if (!rules) return null;
  const save = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      setRules(await apiSaveLoyaltySettings({ earnPercent: rules.earnPercent, redeemPoints: rules.redeemPoints }));
      setMsg({ ok: true, text: t(lang, 'profileSaved') });
    } catch (err) {
      setMsg({ ok: false, text: err.message?.[lang] || t(lang, 'orderError') });
    }
  };
  const input = 'w-24 rounded-xl border border-border bg-background p-1.5 text-sm text-foreground';
  return (
    <form onSubmit={save} className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
      <h3 className="w-full font-bold text-primary">{t(lang, 'admin.loyalty.title')}</h3>
      <label className="flex flex-col gap-1 text-secondary">{t(lang, 'admin.loyalty.earnPercent')}
        <input className={input} dir="ltr" type="number" min="1" max="100" value={rules.earnPercent} onChange={(e) => setRules({ ...rules, earnPercent: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-secondary">{t(lang, 'admin.loyalty.redeemPoints')}
        <input className={input} dir="ltr" type="number" min="10" max="10000" value={rules.redeemPoints} onChange={(e) => setRules({ ...rules, redeemPoints: e.target.value })} />
      </label>
      <Button size="sm" type="submit">{t(lang, 'saveProfile')}</Button>
      {msg && <p className={`w-full font-semibold ${msg.ok ? 'text-accent' : 'text-red-400'}`}>{msg.text}</p>}
    </form>
  );
}

// Account management tab (doc 3.7): overview totals, search/filter, create
// staff accounts, activate/deactivate and role changes. Every action is
// re-validated server-side - this panel is only a view.
const ROLE_FILTERS = ['admin', 'barista', 'customer'];

export default function AdminAccounts({ lang }) {
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'barista' });
  const [created, setCreated] = useState(null); // { account, temporaryPassword }
  // Loyalty adjust (Sprint 30): the endpoint existed without a UI; the
  // ledger requires a reason, so the mini form asks for one.
  const [adjustFor, setAdjustFor] = useState(null); // account id
  const [adjustForm, setAdjustForm] = useState({ points: '', description: '' });
  const [adjustMsg, setAdjustMsg] = useState(null);
  const [formError, setFormError] = useState(null);

  const load = useCallback(() => {
    apiAdminAccounts({ role: roleFilter || undefined, search: search || undefined })
      .then(setData)
      .catch(() => setError(true));
  }, [roleFilter, search]);

  useEffect(() => {
    const id = setTimeout(load, search ? 300 : 0); // debounce typing
    return () => clearTimeout(id);
  }, [load, search]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const result = await apiCreateAccount(form);
      setCreated(result);
      setForm({ name: '', email: '', phone: '', role: 'barista' });
      load();
    } catch (err) {
      setFormError(err.message?.[lang] || t(lang, 'orderError'));
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    setAdjustMsg(null);
    try {
      await apiAdminAdjustPoints(adjustFor, Number(adjustForm.points), adjustForm.description.trim());
      setAdjustFor(null);
      setAdjustForm({ points: '', description: '' });
      load();
    } catch (err) {
      setAdjustMsg(err.message?.[lang] || t(lang, 'orderError'));
    }
  };

  const toggle = async (account) => {
    await apiSetAccountStatus(account.id, !account.isActive);
    load();
  };

  const changeRole = async (account, role) => {
    await apiSetAccountRole(account.id, role);
    load();
  };

  return (
    <div>
      <LoyaltyRules lang={lang} />
      {/* Overview totals by role */}
      {data && (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {ROLE_FILTERS.map((role) => (
            <Badge key={role} className="text-xs">
              {t(lang, `role_${role}`)}: {data.overview[role].active} {t(lang, 'activeCount')} · {data.overview[role].disabled} {t(lang, 'disabledCount')}
            </Badge>
          ))}
        </div>
      )}

      {/* Create staff account */}
      <form onSubmit={submit} className="mb-6 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-extrabold text-foreground">{t(lang, 'createStaff')}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            className="rounded-xl border border-border bg-background p-2 text-foreground"
            placeholder={t(lang, 'namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="rounded-xl border border-border bg-background p-2 text-foreground"
            placeholder={t(lang, 'emailPlaceholder')}
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="rounded-xl border border-border bg-background p-2 text-foreground"
            placeholder={t(lang, 'phoneOptional')}
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <select
            className="rounded-xl border border-border bg-background p-2 text-foreground"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="barista">{t(lang, 'role_barista')}</option>
            <option value="admin">{t(lang, 'role_admin')}</option>
          </select>
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" size="sm" className="w-fit">
          {t(lang, 'createAccount')}
        </Button>
        {created && (
          <p className="rounded-xl border border-primary bg-background p-3 text-sm text-foreground" dir="ltr">
            {created.account.email} → <span className="font-mono font-bold text-accent">{created.temporaryPassword}</span>
          </p>
        )}
        {created && <p className="text-xs text-muted-foreground">{t(lang, 'tempPasswordNote')}</p>}
      </form>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <Button size="sm" variant={roleFilter === '' ? 'default' : 'ghost'} onClick={() => setRoleFilter('')}>
          {t(lang, 'allRoles')}
        </Button>
        {ROLE_FILTERS.map((role) => (
          <Button key={role} size="sm" variant={roleFilter === role ? 'default' : 'ghost'} onClick={() => setRoleFilter(role)}>
            {t(lang, `role_${role}`)}
          </Button>
        ))}
        <input
          className="rounded-xl border border-border bg-background p-1.5 px-3 text-sm text-foreground"
          placeholder={t(lang, 'searchAccounts')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {!data && !error && <Skeleton className="h-48 w-full rounded-2xl" />}

      <div className="flex flex-col gap-2">
        {(data?.accounts || []).map((account) => (
          <div key={account.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start gap-3">
              <ChatAvatar name={account.name} src={account.avatarUrl} />
              <div>
              <span className="font-bold text-foreground">{account.name}</span>
              <span className="ms-2 text-xs text-muted-foreground" dir="ltr">{account.email}</span>
              <div className="mt-1 flex gap-2">
                <Badge className="text-xs">{t(lang, `role_${account.role}`)}</Badge>
                <Badge className="text-xs">{account.isActive ? t(lang, 'activeCount') : t(lang, 'disabledCount')}</Badge>
                {account.role === 'customer' && (
                  <Badge className="text-xs">{t(lang, 'admin.accounts.points')}: {account.loyaltyBalance || 0}</Badge>
                )}
                {account.lastLoginAt && (
                  <span className="text-xs text-muted-foreground">
                    {t(lang, 'lastLogin')}: {new Date(account.lastLoginAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
                  </span>
                )}
              </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-border bg-background p-1.5 text-sm text-foreground"
                value={account.role}
                onChange={(e) => changeRole(account, e.target.value)}
              >
                {ROLE_FILTERS.map((role) => (
                  <option key={role} value={role}>{t(lang, `role_${role}`)}</option>
                ))}
              </select>
              {account.role === 'customer' && (
                <Button size="sm" variant="ghost" onClick={() => { setAdjustFor(adjustFor === account.id ? null : account.id); setAdjustMsg(null); }}>
                  {t(lang, 'admin.accounts.adjust')}
                </Button>
              )}
              <Button size="sm" variant={account.isActive ? 'ghost' : 'default'} onClick={() => toggle(account)}>
                {account.isActive ? t(lang, 'deactivate') : t(lang, 'activate')}
              </Button>
            </div>
            {adjustFor === account.id && (
              <form className="flex w-full flex-wrap items-center gap-2 border-t border-border/40 pt-2" onSubmit={submitAdjust}>
                <input
                  type="number"
                  required
                  className="w-28 rounded-xl border border-border bg-background p-1.5 px-3 text-sm text-foreground"
                  placeholder={t(lang, 'admin.accounts.adjustPoints')}
                  value={adjustForm.points}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, points: e.target.value }))}
                />
                <input
                  required
                  className="min-w-40 flex-1 rounded-xl border border-border bg-background p-1.5 px-3 text-sm text-foreground"
                  placeholder={t(lang, 'admin.accounts.adjustReason')}
                  value={adjustForm.description}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, description: e.target.value }))}
                />
                <Button type="submit" size="sm">{t(lang, 'admin.accounts.adjustApply')}</Button>
                {adjustMsg && <span className="text-xs text-red-400">{adjustMsg}</span>}
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
