import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n/index.js';
import { apiSetMenuImage } from '@/api/admin.js';
import { apiUploadStatus, apiUploadImage } from '@/api/uploads.js';
import { Button } from '@/components/ui/button.jsx';

// Sprint 19: compact per-item image control in the admin menu tab. Shows the
// current image, then either a file picker (Cloudinary configured) or a
// plain URL field. Saving calls PATCH /api/admin/menu/:id/image, which also
// deletes the previous Cloudinary asset server-side.
export default function AdminMenuImage({ lang, item, onSaved }) {
  const [open, setOpen] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) apiUploadStatus().then((d) => setCanUpload(!!d.configured)).catch(() => {});
  }, [open]);

  const save = async (finalUrl) => {
    if (!finalUrl) return;
    setBusy(true);
    try {
      await apiSetMenuImage(item._id, finalUrl);
      setSaved(true);
      setOpen(false);
      setUrl('');
      onSaved?.();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { imageUrl } = await apiUploadImage(file);
      await save(imageUrl);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {item.images?.[0]?.url ? (
        <img src={item.images[0].url} alt="" className="h-10 w-14 rounded-lg object-cover" />
      ) : null}
      {saved && <span className="text-xs font-bold text-primary">{t(lang, 'menuImageSaved')}</span>}
      {!open ? (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{t(lang, 'menuImageChange')}</Button>
      ) : (
        <div className="flex items-center gap-2">
          {canUpload ? (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
                {t(lang, 'menuImageChange')}
              </Button>
            </>
          ) : (
            <>
              <input
                className="h-8 w-48 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                dir="ltr"
                placeholder={t(lang, 'menuImageUrlPlaceholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button size="sm" disabled={busy || !url.trim()} onClick={() => save(url.trim())}>
                {t(lang, 'menuImageSave')}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>✕</Button>
        </div>
      )}
    </div>
  );
}
