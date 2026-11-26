import { useEffect, useState } from 'react';
import { apiAdminContent, apiPutContent } from '@/api/content.js';
import { getMarquee, apiPutMarquee } from '@/api/marquee.js';
import { useContentStore } from '@/store/content.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Admin content CMS (docs 15 + 23): three kinds of keys. Copy keys take a
// bilingual pair (clearing both reverts to the built-in copy). URL keys
// take one https link. Section keys are show/hide toggles for the homepage
// sections and the footer.
export default function AdminContent({ lang }) {
  const [meta, setMeta] = useState(null);
  const [values, setValues] = useState({});
  const [sections, setSections] = useState({});
  const [error, setError] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const { setOverride, setSection } = useContentStore();
  // Announcement marquee (Sprint 28): on/off + the ordered bilingual
  // phrases, edited here with the rest of the homepage copy.
  const [marquee, setMarquee] = useState(null); // { enabled, phrases: [{ar,en}] }
  const [marqueeSaved, setMarqueeSaved] = useState(false);

  useEffect(() => {
    apiAdminContent()
      .then((d) => {
        setMeta(d);
        const editable = [...(d.copyKeys || []), ...(d.urlKeys || [])];
        setValues(Object.fromEntries(editable.map((k) => [k, {
          ar: d.contents[k]?.ar || '', en: d.contents[k]?.en || '',
        }])));
        setSections(d.sections || {});
      })
      .catch(() => setError(true));
    getMarquee()
      .then((d) => setMarquee({ enabled: d.enabled, phrases: d.phrases.map((p) => ({ ar: p.ar, en: p.en })) }))
      .catch(() => setMarquee({ enabled: false, phrases: [] }));
  }, []);

  const flash = (key) => { setSavedKey(key); setTimeout(() => setSavedKey(null), 2000); };

  const save = async (key) => {
    setError(null);
    try {
      const isUrl = meta.urlKeys.includes(key);
      const body = isUrl ? { url: values[key].ar } : values[key];
      const res = await apiPutContent(key, body);
      setOverride(key, res.reverted ? null : res.value);
      flash(key);
    } catch (e) {
      setError(e?.error?.message?.[lang] || true);
    }
  };

  const toggle = async (key) => {
    setError(null);
    const next = sections[key] === false; // default visible -> hide on first toggle
    try {
      const res = await apiPutContent(key, { enabled: next });
      setSections((s) => ({ ...s, [key]: res.enabled }));
      setSection(key, res.enabled);
      flash(key);
    } catch (e) {
      setError(e?.error?.message?.[lang] || true);
    }
  };

  if (error === true) return <p className="text-center text-red-400">{t(lang, 'genericError')}</p>;
  if (!meta) return <p className="text-center text-secondary">{t(lang, 'loading')}</p>;

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

  const copyRow = (key, isUrl) => (
    <div key={key} className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-sm font-bold text-foreground">{t(lang, `contentKey_${key}`)}</p>
      <div className="flex flex-col gap-2">
        {isUrl ? (
          <input
            className={inputCls} dir="ltr" placeholder="https://..."
            value={values[key].ar}
            onChange={(e) => setValues({ ...values, [key]: { ar: e.target.value, en: e.target.value } })}
          />
        ) : (
          <>
            <textarea
              className={inputCls} rows={2} dir="rtl" placeholder={t(lang, 'contentArPh')}
              value={values[key].ar}
              onChange={(e) => setValues({ ...values, [key]: { ...values[key], ar: e.target.value } })}
            />
            <textarea
              className={inputCls} rows={2} dir="ltr" placeholder={t(lang, 'contentEnPh')}
              value={values[key].en}
              onChange={(e) => setValues({ ...values, [key]: { ...values[key], en: e.target.value } })}
            />
          </>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Button size="sm" onClick={() => save(key)}>{t(lang, 'save')}</Button>
        {savedKey === key && <span className="text-xs text-primary">{t(lang, 'contentSaved')}</span>}
        {error !== true && error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );

  const movePhrase = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= marquee.phrases.length) return;
    const next = [...marquee.phrases];
    [next[i], next[j]] = [next[j], next[i]];
    setMarquee({ ...marquee, phrases: next });
  };

  const saveMarquee = async () => {
    setError(null);
    try {
      const res = await apiPutMarquee({ isEnabled: marquee.enabled, phrases: marquee.phrases });
      setMarquee({ enabled: res.enabled, phrases: res.phrases });
      setMarqueeSaved(true);
      setTimeout(() => setMarqueeSaved(false), 2000);
    } catch (e) {
      setError(e?.error?.message?.[lang] || true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-xs text-secondary">{t(lang, 'contentCmsHint')}</p>

      {marquee && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{t(lang, 'marquee.title')}</p>
            <Button size="sm" variant={marquee.enabled ? 'default' : 'ghost'}
              onClick={() => setMarquee({ ...marquee, enabled: !marquee.enabled })}>
              {marquee.enabled ? t(lang, 'sectionShown') : t(lang, 'sectionHidden')}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {marquee.phrases.map((phrase, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inputCls} dir="rtl" placeholder={t(lang, 'contentArPh')}
                  value={phrase.ar}
                  onChange={(e) => setMarquee({ ...marquee, phrases: marquee.phrases.map((p, j) => (j === i ? { ...p, ar: e.target.value } : p)) })} />
                <input className={inputCls} dir="ltr" placeholder={t(lang, 'contentEnPh')}
                  value={phrase.en}
                  onChange={(e) => setMarquee({ ...marquee, phrases: marquee.phrases.map((p, j) => (j === i ? { ...p, en: e.target.value } : p)) })} />
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => movePhrase(i, -1)}>↑</Button>
                  <Button size="sm" variant="ghost" disabled={i === marquee.phrases.length - 1} onClick={() => movePhrase(i, 1)}>↓</Button>
                  <Button size="sm" variant="ghost" onClick={() => setMarquee({ ...marquee, phrases: marquee.phrases.filter((_, j) => j !== i) })}>✕</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" variant="ghost" disabled={marquee.phrases.length >= 8}
              onClick={() => setMarquee({ ...marquee, phrases: [...marquee.phrases, { ar: '', en: '' }] })}>
              {t(lang, 'marquee.add')}
            </Button>
            <Button size="sm" onClick={saveMarquee}>{t(lang, 'save')}</Button>
            {marqueeSaved && <span className="text-xs text-primary">{t(lang, 'contentSaved')}</span>}
          </div>
        </div>
      )}

      {meta.sectionKeys.map((key) => {
        const on = sections[key] !== false;
        return (
          <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-bold text-foreground">{t(lang, `contentKey_${key}`)}</p>
            <div className="flex items-center gap-3">
              {savedKey === key && <span className="text-xs text-primary">{t(lang, 'contentSaved')}</span>}
              <Button size="sm" variant={on ? 'default' : 'ghost'} onClick={() => toggle(key)}>
                {on ? t(lang, 'sectionShown') : t(lang, 'sectionHidden')}
              </Button>
            </div>
          </div>
        );
      })}

      {meta.copyKeys.map((key) => copyRow(key, false))}
      {meta.urlKeys.map((key) => copyRow(key, true))}
    </div>
  );
}
