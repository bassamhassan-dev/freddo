import { useCallback, useEffect, useState } from 'react';
import { apiAdminContact, apiUpdateContact } from '@/api/contact.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Admin inbox (doc 11): list/search/filter, mark read, archive, notes.
const STATUS_FILTERS = ['new', 'read', 'archived'];

export default function AdminContact({ lang }) {
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiAdminContact({ status: status || undefined })
      .then((data) => setMessages(data.messages))
      .catch(() => setError(true));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const update = async (id, body) => {
    await apiUpdateContact(id, body);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex justify-center gap-2">
        <Button size="sm" variant={status === '' ? 'default' : 'ghost'} onClick={() => setStatus('')}>
          {t(lang, 'allStatuses')}
        </Button>
        {STATUS_FILTERS.map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'default' : 'ghost'} onClick={() => setStatus(s)}>
            {t(lang, `msg_${s}`)}
          </Button>
        ))}
      </div>

      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {!messages && !error && <Skeleton className="h-48 w-full rounded-2xl" />}

      <div className="flex flex-col gap-2">
        {(messages || []).map((m) => (
          <div key={m._id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-foreground">{m.subject}</span>
                <span className="ms-2 text-xs text-muted-foreground">{m.name} · <span dir="ltr">{m.email}</span></span>
              </div>
              <Badge>{t(lang, `msg_${m.status}`)}</Badge>
            </div>
            <p className="mt-1 text-sm text-secondary">{m.message}</p>
            <div className="mt-2 flex gap-2">
              {m.status === 'new' && (
                <Button size="sm" onClick={() => update(m._id, { status: 'read' })}>{t(lang, 'markRead')}</Button>
              )}
              {m.status !== 'archived' && (
                <Button size="sm" variant="ghost" onClick={() => update(m._id, { status: 'archived' })}>{t(lang, 'archive')}</Button>
              )}
            </div>
          </div>
        ))}
        {messages && messages.length === 0 && <p className="text-center text-secondary">{t(lang, 'noMessages')}</p>}
      </div>
    </div>
  );
}
