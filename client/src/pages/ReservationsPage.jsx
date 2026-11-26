import { useCallback, useEffect, useState } from 'react';
import { apiBookReservation, apiMyReservations, apiCancelReservation } from '@/api/reservations.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Customer reservations (doc 10.4): book a date/time + party size, see your
// bookings, cancel while pending. The table itself is assigned by staff
// when they confirm.
export default function ReservationsPage({ lang }) {
  const [reservations, setReservations] = useState(null);
  const [form, setForm] = useState({ date: '', time: '19:00', guestCount: 2, notes: '' });
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiMyReservations()
      .then((data) => setReservations(data.reservations))
      .catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await apiBookReservation({ ...form, guestCount: Number(form.guestCount) });
      setForm({ date: '', time: '19:00', guestCount: 2, notes: '' });
      load();
    } catch (err) {
      setFormError(err.message?.[lang] || t(lang, 'orderError'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    await apiCancelReservation(id);
    load();
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'reservationsTitle')}
      </h2>

      <form onSubmit={submit} className="mb-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-extrabold text-foreground">{t(lang, 'bookTable')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm text-secondary">
            {t(lang, 'date')}
            <input type="date" required className="rounded-xl border border-border bg-background p-2 text-foreground"
              value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-secondary">
            {t(lang, 'time')}
            <input type="time" required min="08:00" max="21:00" className="rounded-xl border border-border bg-background p-2 text-foreground"
              value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm text-secondary">
          {t(lang, 'guests')}
          <input type="number" min="1" max="12" required className="rounded-xl border border-border bg-background p-2 text-foreground"
            value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} />
        </label>
        <input className="rounded-xl border border-border bg-background p-2 text-foreground" placeholder={t(lang, 'reservationNotes')}
          value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" disabled={busy} className="w-fit">{busy ? t(lang, 'authWorking') : t(lang, 'bookNow')}</Button>
        <p className="text-xs text-muted-foreground">{t(lang, 'reservationPolicy')}</p>
      </form>

      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {!reservations && !error && <Skeleton className="h-40 w-full rounded-2xl" />}

      <div className="flex flex-col gap-3">
        {(reservations || []).map((r) => (
          <div key={r._id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-foreground" dir="ltr">{r.reservationNumber}</span>
              <Badge>{t(lang, `status_${r.status}`)}</Badge>
            </div>
            <p className="mt-1 text-sm text-secondary">
              {r.date} · {r.time} · {r.guestCount} {t(lang, 'guests')}
              {r.table ? ` · ${t(lang, 'table')} ${r.table.number}` : ''}
            </p>
            {r.customerNotes && <p className="mt-1 text-xs text-muted-foreground">{r.customerNotes}</p>}
            {r.status === 'pending' && (
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => cancel(r._id)}>
                {t(lang, 'cancelReservation')}
              </Button>
            )}
          </div>
        ))}
        {reservations && reservations.length === 0 && (
          <p className="text-center text-secondary">{t(lang, 'noReservations')}</p>
        )}
      </div>
    </section>
  );
}
