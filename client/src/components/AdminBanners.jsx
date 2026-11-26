import { useEffect, useState } from 'react';
import { apiAdminBanners, apiCreateBanner, apiUpdateBanner, apiDeleteBanner } from '@/api/banners.js';
import { apiUploadStatus, apiUploadImage } from '@/api/uploads.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Admin banner management (doc 5.3): create, edit, delete, reorder via
// sortOrder, activate/deactivate, and schedule the campaign window.
const PLACEMENTS = ['main', 'secondary_left', 'secondary_right', 'offers'];
const empty = {
  placement: 'main',
  cloudinaryPublicId: '',
  titleAr: '', titleEn: '',
  descAr: '', descEn: '',
  imageUrl: '', ctaAr: '', ctaEn: '', ctaLink: '',
  sortOrder: 0, active: true, startAt: '', endAt: '',
};

const toBody = (f) => ({
  placement: f.placement,
  title: { ar: f.titleAr, en: f.titleEn },
  description: { ar: f.descAr, en: f.descEn },
  imageUrl: f.imageUrl,
  cloudinaryPublicId: f.cloudinaryPublicId || undefined,
  ctaText: { ar: f.ctaAr, en: f.ctaEn },
  ctaLink: f.ctaLink || undefined,
  sortOrder: Number(f.sortOrder) || 0,
  active: !!f.active,
  startAt: f.startAt || undefined,
  endAt: f.endAt || undefined,
});

export default function AdminBanners({ lang }) {
  const [banners, setBanners] = useState(null);
  const [form, setForm] = useState(null); // null = list view
  const [error, setError] = useState(null);
  const [canUpload, setCanUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiUploadStatus().then((d) => setCanUpload(d.configured)).catch(() => {});
  }, []);

  // Upload to Cloudinary, then keep the returned URL + public id on the
  // form exactly like a pasted URL - saving is the same path either way.
  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { imageUrl, publicId } = await apiUploadImage(file);
      setForm((f) => ({ ...f, imageUrl, cloudinaryPublicId: publicId }));
    } catch (err) {
      setError(err?.message?.[lang] || true);
    } finally {
      setUploading(false);
    }
  };

  const load = () => apiAdminBanners().then((d) => setBanners(d.banners)).catch(() => setError(true));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError(null);
    try {
      if (form._id) await apiUpdateBanner(form._id, toBody(form));
      else await apiCreateBanner(toBody(form));
      setForm(null);
      load();
    } catch (e) {
      setError(e?.error?.message?.[lang] || e?.message || true);
    }
  };

  const remove = async (id) => {
    await apiDeleteBanner(id);
    load();
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

  if (form) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
        <select className={inputCls} value={form.placement} onChange={set('placement')}>
          {PLACEMENTS.map((p) => <option key={p} value={p}>{t(lang, `bannerPlacement_${p}`)}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder={t(lang, 'bannerTitleAr')} value={form.titleAr} onChange={set('titleAr')} />
          <input className={inputCls} placeholder={t(lang, 'bannerTitleEn')} value={form.titleEn} onChange={set('titleEn')} />
          <input className={inputCls} placeholder={t(lang, 'bannerDescAr')} value={form.descAr} onChange={set('descAr')} />
          <input className={inputCls} placeholder={t(lang, 'bannerDescEn')} value={form.descEn} onChange={set('descEn')} />
          <input className={inputCls} placeholder={t(lang, 'bannerCtaAr')} value={form.ctaAr} onChange={set('ctaAr')} />
          <input className={inputCls} placeholder={t(lang, 'bannerCtaEn')} value={form.ctaEn} onChange={set('ctaEn')} />
        </div>
        {canUpload && (
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} disabled={uploading} />
            {uploading && <span>{t(lang, 'uploadingImage')}</span>}
          </label>
        )}
        {form.imageUrl && <img src={form.imageUrl} alt="" className="h-16 w-24 rounded-lg object-cover" />}
        <input className={inputCls} dir="ltr" placeholder={t(lang, 'bannerImageUrl')} value={form.imageUrl} onChange={set('imageUrl')} />
        <input className={inputCls} dir="ltr" placeholder={t(lang, 'bannerCtaLink')} value={form.ctaLink} onChange={set('ctaLink')} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-secondary">
            {t(lang, 'bannerStart')}
            <input className={inputCls + ' w-full'} type="datetime-local" value={form.startAt} onChange={set('startAt')} />
          </label>
          <label className="text-xs text-secondary">
            {t(lang, 'bannerEnd')}
            <input className={inputCls + ' w-full'} type="datetime-local" value={form.endAt} onChange={set('endAt')} />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-xs text-secondary">
            {t(lang, 'bannerOrder')}
            <input className={inputCls + ' ms-2 w-20'} type="number" value={form.sortOrder} onChange={set('sortOrder')} />
          </label>
          <label className="flex items-center gap-2 text-xs text-secondary">
            <input type="checkbox" checked={form.active} onChange={set('active')} />
            {t(lang, 'bannerActive')}
          </label>
        </div>
        {error && <p className="text-xs text-red-400">{typeof error === 'string' ? error : t(lang, 'genericError')}</p>}
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={save}>{t(lang, 'save')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setForm(null)}>{t(lang, 'cancel')}</Button>
        </div>
      </div>
    );
  }

  if (error === true) return <p className="text-center text-red-400">{t(lang, 'genericError')}</p>;
  if (!banners) return <p className="text-center text-secondary">{t(lang, 'loading')}</p>;

  return (
    <div className="flex flex-col gap-3">
      <Button size="sm" className="self-start" onClick={() => setForm({ ...empty })}>
        {t(lang, 'bannerNew')}
      </Button>
      {banners.length === 0 && <p className="text-center text-sm text-secondary">{t(lang, 'bannersEmpty')}</p>}
      {banners.map((b) => (
        <div key={b._id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <img src={b.imageUrl} alt="" className="h-12 w-16 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{b.title[lang] || b.title.en}</p>
            <p className="text-xs text-secondary">
              {t(lang, `bannerPlacement_${b.placement}`)} · {t(lang, 'bannerOrder')} {b.sortOrder} ·{' '}
              {b.active ? t(lang, 'bannerActive') : t(lang, 'bannerInactive')}
            </p>
          </div>
          <Button
            size="sm" variant="ghost"
            onClick={() => setForm({
              _id: b._id,
              placement: b.placement,
              titleAr: b.title.ar, titleEn: b.title.en,
              descAr: b.description?.ar || '', descEn: b.description?.en || '',
              imageUrl: b.imageUrl,
              cloudinaryPublicId: b.cloudinaryPublicId || '',
              ctaAr: b.ctaText?.ar || '', ctaEn: b.ctaText?.en || '',
              ctaLink: b.ctaLink || '',
              sortOrder: b.sortOrder, active: b.active,
              startAt: b.startAt ? b.startAt.slice(0, 16) : '',
              endAt: b.endAt ? b.endAt.slice(0, 16) : '',
            })}
          >
            {t(lang, 'edit')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => remove(b._id)}>{t(lang, 'delete')}</Button>
        </div>
      ))}
    </div>
  );
}
