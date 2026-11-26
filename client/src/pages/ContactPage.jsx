import { useState } from 'react';
import { apiSendContact } from '@/api/contact.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Public contact form (doc 11): guests and customers alike. The response
// only acknowledges - nothing about the stored record comes back.
export default function ContactPage({ lang }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiSendContact(form);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err.message?.[lang] || t(lang, 'orderError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'contactTitle')}
      </h2>
      {sent && <p className="mb-4 rounded-2xl border border-primary bg-card p-3 text-center text-primary">{t(lang, 'contactSent')}</p>}
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <input className="rounded-xl border border-border bg-background p-3 text-foreground" placeholder={t(lang, 'namePlaceholder')}
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        <input className="rounded-xl border border-border bg-background p-3 text-foreground" placeholder={t(lang, 'emailPlaceholder')}
          type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="rounded-xl border border-border bg-background p-3 text-foreground" placeholder={t(lang, 'subjectPlaceholder')}
          value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required minLength={3} />
        <textarea className="min-h-32 rounded-xl border border-border bg-background p-3 text-foreground" placeholder={t(lang, 'messagePlaceholder')}
          value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required minLength={10} maxLength={2000} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="w-fit">{busy ? t(lang, 'authWorking') : t(lang, 'sendMessage')}</Button>
      </form>
    </section>
  );
}
