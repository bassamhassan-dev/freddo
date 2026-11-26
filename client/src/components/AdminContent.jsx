import { useEffect, useState } from 'react';
import { apiAdminContent, apiPutContent } from '@/api/content.js';
import { useContentStore } from '@/store/content.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Admin content CMS: edit the homepage copy that would otherwise be
// hardcoded. Both languages are saved together; clearing both reverts that
// spot to the built-in copy (the server deletes the override).
export default function AdminContent({ lang }) {
  const [keys, setKeys] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState(null);
  const [savedKey, setSavedKey] = useState(null);
  const setOverride = useContentStore((s) => s.setOverride);

  useEffect(() => {
    apiAdminContent()
      .then((d) => {
        setKeys(d.keys);
        setValues(Object.fromEntries(d.keys.map((k) => [k, {
          ar: d.contents[k]?.ar || '', en: d.contents[k]?.en || '',
        }])));
      })
      .catch(() => setError(true));
  }, []);

  const save = async (key) => {
    setError(null);
    try {
      const res = await apiPutContent(key, values[key]);
      setOverride(key, res.reverted ? null : res.value);
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch (e) {
      setError(e?.error?.message?.[lang] || true);
    }
  };

  if (error === true) return <p className="text-center text-red-400">{t(lang, 'genericError')}</p>;
  if (!keys) return <p className="text-center text-secondary">{t(lang, 'loading')}</p>;

  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-xs text-secondary">{t(lang, 'contentCmsHint')}</p>
      {keys.map((key) => (
        <div key={key} className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-bold text-foreground">{t(lang, `contentKey_${key}`)}</p>
          <div className="flex flex-col gap-2">
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
          </div>
          <div className="mt-2 flex items-center gap-3">
            <Button size="sm" onClick={() => save(key)}>{t(lang, 'save')}</Button>
            {savedKey === key && <span className="text-xs text-primary">{t(lang, 'contentSaved')}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
