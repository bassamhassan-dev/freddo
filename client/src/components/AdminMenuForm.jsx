import { useState } from 'react';
import { apiCreateMenuItem, apiUpdateMenuItem } from '@/api/admin.js';
import { apiUploadStatus, apiUploadImage } from '@/api/uploads.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Sprint 35: one form for creating and editing a menu item. Variants and
// add-ons are small repeating rows (bilingual name + price). The image is a
// URL field, or a file upload when Cloudinary is configured.
const blank = { nameAr: '', nameEn: '', descAr: '', descEn: '', categorySlug: '', basePrice: '', imageUrl: '', isAvailable: true, isDrink: false, variants: [], addOns: [] };

function fromItem(item) {
  return {
    nameAr: item.name.ar, nameEn: item.name.en, descAr: item.description.ar, descEn: item.description.en,
    categorySlug: item.category.slug, basePrice: item.basePrice, imageUrl: item.images?.[0]?.url || '',
    isAvailable: item.isAvailable, isDrink: item.isDrink,
    variants: (item.variants || []).map((v) => ({ _id: v._id, ar: v.label.ar, en: v.label.en, price: v.price })),
    addOns: (item.addOns || []).map((a) => ({ _id: a._id, ar: a.name.ar, en: a.name.en, price: a.price })),
  };
}

export default function AdminMenuForm({ lang, item, categories, onDone, onCancel }) {
  const [f, setF] = useState(item ? fromItem(item) : { ...blank, categorySlug: categories[0]?.slug || '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [canUpload, setCanUpload] = useState(null);
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const input = 'w-full rounded-xl border border-border bg-background p-1.5 text-sm text-foreground';
  const row = (list, i, patch) => set({ [list]: f[list].map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const add = (list) => set({ [list]: [...f[list], { ar: '', en: '', price: '' }] });
  const drop = (list, i) => set({ [list]: f[list].filter((_, j) => j !== i) });

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { imageUrl } = await apiUploadImage(file);
      set({ imageUrl });
    } catch (err) {
      setMsg(err.message?.[lang] || t(lang, 'orderError'));
    }
    setBusy(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = {
      name: { ar: f.nameAr, en: f.nameEn },
      description: { ar: f.descAr, en: f.descEn },
      categorySlug: f.categorySlug,
      basePrice: f.basePrice,
      imageUrl: f.imageUrl,
      isAvailable: f.isAvailable,
      isDrink: f.isDrink,
      isFeatured: item?.isFeatured, isBestSeller: item?.isBestSeller,
      variants: f.variants.map((v) => ({ _id: v._id, label: { ar: v.ar, en: v.en }, price: v.price })),
      addOns: f.addOns.map((a) => ({ _id: a._id, name: { ar: a.ar, en: a.en }, price: a.price })),
    };
    try {
      if (item) await apiUpdateMenuItem(item._id, body);
      else await apiCreateMenuItem(body);
      onDone();
    } catch (err) {
      setMsg(err.message?.[lang] || t(lang, 'orderError'));
      setBusy(false);
    }
  };

  const pairRows = (list, label) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-secondary">{label}</span>
      {f[list].map((r, i) => (
        <div key={i} className="flex gap-1">
          <input className={input} placeholder="عربي" value={r.ar} onChange={(e) => row(list, i, { ar: e.target.value })} required />
          <input className={input} dir="ltr" placeholder="English" value={r.en} onChange={(e) => row(list, i, { en: e.target.value })} required />
          <input className={`${input} max-w-[5rem]`} dir="ltr" type="number" min="0" placeholder={t(lang, 'admin.menu.price')} value={r.price} onChange={(e) => row(list, i, { price: e.target.value })} required />
          <Button type="button" size="sm" variant="ghost" onClick={() => drop(list, i)}>×</Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="ghost" onClick={() => add(list)}>+ {label}</Button>
    </div>
  );

  return (
    <form onSubmit={submit} className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent bg-card p-4 text-sm">
      <h3 className="font-bold text-primary">{item ? t(lang, 'admin.menu.edit') : t(lang, 'admin.menu.add')}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="الاسم بالعربي" value={f.nameAr} onChange={(e) => set({ nameAr: e.target.value })} required />
        <input className={input} dir="ltr" placeholder="Name (English)" value={f.nameEn} onChange={(e) => set({ nameEn: e.target.value })} required />
        <textarea className={input} placeholder="الوصف بالعربي" value={f.descAr} onChange={(e) => set({ descAr: e.target.value })} required />
        <textarea className={input} dir="ltr" placeholder="Description (English)" value={f.descEn} onChange={(e) => set({ descEn: e.target.value })} required />
        <select className={input} value={f.categorySlug} onChange={(e) => set({ categorySlug: e.target.value })} required>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name[lang]}</option>)}
        </select>
        <input className={input} dir="ltr" type="number" min="0" placeholder={t(lang, 'admin.menu.price')} value={f.basePrice} onChange={(e) => set({ basePrice: e.target.value })} required />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${input} flex-1`} dir="ltr" placeholder="https://… / /menu/x.svg" value={f.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} onFocus={() => canUpload === null && apiUploadStatus().then((d) => setCanUpload(!!d.configured)).catch(() => setCanUpload(false))} />
        {canUpload && <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} disabled={busy} />}
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.isAvailable} onChange={(e) => set({ isAvailable: e.target.checked })} />{t(lang, 'available')}</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.isDrink} onChange={(e) => set({ isDrink: e.target.checked })} />{t(lang, 'admin.menu.drink')}</label>
      </div>
      {pairRows('variants', t(lang, 'admin.menu.variants'))}
      {pairRows('addOns', t(lang, 'admin.menu.addOns'))}
      {msg && <p className="font-semibold text-red-400">{msg}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{t(lang, 'saveProfile')}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t(lang, 'admin.menu.cancel')}</Button>
      </div>
    </form>
  );
}
