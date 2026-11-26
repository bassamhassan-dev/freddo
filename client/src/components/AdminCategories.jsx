import { useCallback, useEffect, useState } from 'react';
import { apiAdminCategories, apiCreateCategory, apiUpdateCategory, apiReorderCategories, apiDeleteCategory } from '@/api/admin.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Sprint 35: category management inside the admin menu tab. Create, rename
// (both languages), reorder with up/down, delete (blocked server-side while
// items still use the category - the error message is shown as-is).
export default function AdminCategories({ lang, onChanged }) {
  const [cats, setCats] = useState(null);
  const [ar, setAr] = useState('');
  const [en, setEn] = useState('');
  const [editing, setEditing] = useState(null); // { id, ar, en }
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => apiAdminCategories().then((d) => setCats(d.categories)).catch(() => setCats([])), []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setMsg(null);
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (err) {
      setMsg(err.message?.[lang] || t(lang, 'orderError'));
    }
  };

  const move = (index, dir) => {
    const ids = cats.map((c) => c._id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => apiReorderCategories(ids));
  };

  const input = 'rounded-xl border border-border bg-background p-1.5 text-sm text-foreground';

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 font-bold text-primary">{t(lang, 'admin.categories.title')}</h3>
      <div className="flex flex-col gap-2">
        {(cats || []).map((c, i) => (
          <div key={c._id} className="flex flex-wrap items-center gap-2 text-sm">
            {editing?.id === c._id ? (
              <>
                <input className={input} value={editing.ar} onChange={(e) => setEditing({ ...editing, ar: e.target.value })} />
                <input className={input} dir="ltr" value={editing.en} onChange={(e) => setEditing({ ...editing, en: e.target.value })} />
                <Button size="sm" onClick={() => run(async () => { await apiUpdateCategory(c._id, { ar: editing.ar, en: editing.en }); setEditing(null); })}>{t(lang, 'saveProfile')}</Button>
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">{c.name[lang]}</span>
                <span className="text-xs text-muted-foreground">({c.itemCount})</span>
                <span className="ms-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => move(i, -1)} aria-label="up">↑</Button>
                  <Button size="sm" variant="ghost" onClick={() => move(i, 1)} aria-label="down">↓</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c._id, ar: c.name.ar, en: c.name.en })}>{t(lang, 'admin.menu.edit')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => apiDeleteCategory(c._id))}>{t(lang, 'admin.menu.delete')}</Button>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); run(async () => { await apiCreateCategory({ ar, en }); setAr(''); setEn(''); }); }}
      >
        <input className={input} placeholder={t(lang, 'admin.categories.nameAr')} value={ar} onChange={(e) => setAr(e.target.value)} required />
        <input className={input} dir="ltr" placeholder={t(lang, 'admin.categories.nameEn')} value={en} onChange={(e) => setEn(e.target.value)} required />
        <Button size="sm" type="submit">{t(lang, 'admin.categories.add')}</Button>
      </form>
      {msg && <p className="mt-2 text-sm font-semibold text-red-400">{msg}</p>}
    </div>
  );
}
