import { useCallback, useEffect, useState } from 'react';
import { apiAdminReservations, apiSetReservationStatus, apiAdminTables } from '@/api/reservations.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Admin reservation management (doc 10.5): filter by date/status, confirm
// with a table assignment (overlap is re-checked server-side), cancel,
// complete, no-show, internal notes.
const STATUS_FILTERS = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];

export default function AdminReservations({ lang }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [reservations, setReservations] = useState(null);
  const [tables, setTables] = useState([]);
  const [picked, setPicked] = useState({}); // reservationId -> tableId
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(() => {
    apiAdminReservations({ date: date || undefined, status: status || undefined })
      .then((data) => setReservations(data.reservations))
      .catch(() => setError(true));
  }, [date, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiAdminTables().then((data) => setTables(data.tables)).catch(() => {});
  }, []);

  const act = async (id, to, extra = {}) => {
    setActionError(null);
    try {
      await apiSetReservationStatus(id, to, extra);
      load();
    } catch (err) {
      setActionError(err.message?.[lang] || t(lang, 'orderError'));
    }
  };

  const fittingTables = (guests) => tables.filter((table) => table.capacity >= guests);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <input type="date" className="rounded-xl border border-border bg-background p-1.5 text-sm text-foreground"
          value={date} onChange={(e) => setDate(e.target.value)} />
        <Button size="sm" variant={status === '' ? 'default' : 'ghost'} onClick={() => setStatus('')}>
          {t(lang, 'allStatuses')}
        </Button>
        {STATUS_FILTERS.map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'default' : 'ghost'} onClick={() => setStatus(s)}>
            {t(lang, `status_${s}`)}
          </Button>
        ))}
      </div>

      {actionError && <p className="mb-2 text-center text-sm text-destructive">{actionError}</p>}
      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {!reservations && !error && <Skeleton className="h-48 w-full rounded-2xl" />}

      <div className="flex flex-col gap-2">
        {(reservations || []).map((r) => (
          <div key={r._id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-foreground" dir="ltr">{r.reservationNumber}</span>
                <span className="ms-2 text-sm text-secondary">{r.date} · {r.time} · {r.guestCount} {t(lang, 'guests')}</span>
              </div>
              <Badge>{t(lang, `status_${r.status}`)}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.user?.name} <span dir="ltr">{r.user?.phone || r.user?.email}</span>
              {r.table ? ` · ${t(lang, 'table')} ${r.table.number} (${r.table.zone === 'indoor' ? t(lang, 'indoor') : t(lang, 'outdoor')})` : ''}
            </p>
            {r.customerNotes && <p className="mt-1 text-xs text-secondary">{r.customerNotes}</p>}

            {r.status === 'pending' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  className="rounded-xl border border-border bg-background p-1.5 text-sm text-foreground"
                  value={picked[r._id] || ''}
                  onChange={(e) => setPicked({ ...picked, [r._id]: e.target.value })}
                >
                  <option value="">{t(lang, 'chooseTable')}</option>
                  {fittingTables(r.guestCount).map((table) => (
                    <option key={table._id} value={table._id}>
                      {table.number} ({table.capacity}) · {table.zone === 'indoor' ? t(lang, 'indoor') : t(lang, 'outdoor')}
                    </option>
                  ))}
                </select>
                <Button size="sm" disabled={!picked[r._id]} onClick={() => act(r._id, 'confirmed', { tableId: picked[r._id] })}>
                  {t(lang, 'confirmReservation')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act(r._id, 'cancelled')}>
                  {t(lang, 'cancelReservation')}
                </Button>
              </div>
            )}
            {r.status === 'confirmed' && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => act(r._id, 'completed')}>{t(lang, 'markCompleted')}</Button>
                <Button size="sm" variant="ghost" onClick={() => act(r._id, 'no_show')}>{t(lang, 'markNoShow')}</Button>
                <Button size="sm" variant="ghost" onClick={() => act(r._id, 'cancelled')}>{t(lang, 'cancelReservation')}</Button>
              </div>
            )}
          </div>
        ))}
        {reservations && reservations.length === 0 && (
          <p className="text-center text-secondary">{t(lang, 'noReservations')}</p>
        )}
      </div>
    </div>
  );
}
