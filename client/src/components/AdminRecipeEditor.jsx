import { useState } from 'react';
import { apiSaveRecipe } from '@/api/admin.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';

// Sprint 25: the admin writes the internal recipe (ingredients, steps,
// notes - all bilingual) that the barista sees in the workspace. One
// modal, whole recipe replaced in a single PUT. Steps are edited one per
// line per language; ingredient rows are name-ar/name-en/qty/unit.
const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary';

export default function AdminRecipeEditor({ lang, item, onSaved }) {
  const [open, setOpen] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [stepsAr, setStepsAr] = useState('');
  const [stepsEn, setStepsEn] = useState('');
  const [notesAr, setNotesAr] = useState('');
  const [notesEn, setNotesEn] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const openEditor = () => {
    const recipe = item.recipe || {};
    setIngredients(
      (recipe.ingredients || []).map((ing) => ({ nameAr: ing.name?.ar || '', nameEn: ing.name?.en || '', quantity: ing.quantity, unit: ing.unit || '' }))
    );
    if (!(recipe.ingredients || []).length) setIngredients([{ nameAr: '', nameEn: '', quantity: 1, unit: '' }]);
    setStepsAr((recipe.steps || []).map((s) => s.ar).join('\n'));
    setStepsEn((recipe.steps || []).map((s) => s.en).join('\n'));
    setNotesAr(recipe.notes?.ar || '');
    setNotesEn(recipe.notes?.en || '');
    setIsVisible(recipe.isVisible !== false);
    setError(null);
    setOpen(true);
  };

  const setIng = (i, field, value) => {
    setIngredients((rows) => rows.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);
      const arLines = lines(stepsAr);
      const enLines = lines(stepsEn);
      // Steps must pair up 1:1 so the barista never sees a half-translated recipe.
      if (arLines.length !== enLines.length || !arLines.length) throw new Error('steps');
      const ingredientsBody = ingredients
        .filter((row) => row.nameAr.trim() || row.nameEn.trim())
        .map((row) => ({
          name: { ar: row.nameAr.trim(), en: row.nameEn.trim() },
          quantity: Number(row.quantity),
          unit: row.unit.trim() || '-',
        }));
      if (!ingredientsBody.length) throw new Error('ingredients');
      await apiSaveRecipe(item._id, {
        ingredients: ingredientsBody,
        steps: arLines.map((arLine, i) => ({ ar: arLine, en: enLines[i] })),
        notes: notesAr.trim() && notesEn.trim() ? { ar: notesAr.trim(), en: notesEn.trim() } : undefined,
        isVisible,
      });
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setError(err.message === 'steps' || err.message === 'ingredients' ? t(lang, 'recipeInvalid') : err.message?.[lang] || t(lang, 'orderError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={openEditor}>{t(lang, 'recipeEdit')}</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[88vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-primary">{t(lang, 'recipeEdit')} - {item.name[lang]}</h3>

            <div>
              <p className="mb-2 text-sm font-extrabold text-foreground">{t(lang, 'ingredients')}</p>
              <div className="flex flex-col gap-2">
                {ingredients.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_80px_90px_36px]">
                    <input className={inputCls} placeholder={t(lang, 'recipeNameAr')} value={row.nameAr} onChange={(e) => setIng(i, 'nameAr', e.target.value)} />
                    <input className={inputCls} dir="ltr" placeholder={t(lang, 'recipeNameEn')} value={row.nameEn} onChange={(e) => setIng(i, 'nameEn', e.target.value)} />
                    <input className={inputCls} dir="ltr" type="number" min="0" step="any" placeholder="1" value={row.quantity} onChange={(e) => setIng(i, 'quantity', e.target.value)} />
                    <input className={inputCls} dir="ltr" placeholder={t(lang, 'recipeUnit')} value={row.unit} onChange={(e) => setIng(i, 'unit', e.target.value)} />
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIngredients((rows) => rows.filter((_, j) => j !== i))} aria-label={t(lang, 'remove')}>×</Button>
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" className="w-fit" onClick={() => setIngredients((rows) => [...rows, { nameAr: '', nameEn: '', quantity: 1, unit: '' }])}>
                  + {t(lang, 'recipeAddIngredient')}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
                {t(lang, 'recipeStepsAr')}
                <textarea className={`${inputCls} min-h-28`} value={stepsAr} onChange={(e) => setStepsAr(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
                {t(lang, 'recipeStepsEn')}
                <textarea className={`${inputCls} min-h-28`} dir="ltr" value={stepsEn} onChange={(e) => setStepsEn(e.target.value)} />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
                {t(lang, 'recipeNotesAr')}
                <input className={inputCls} value={notesAr} onChange={(e) => setNotesAr(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-secondary">
                {t(lang, 'recipeNotesEn')}
                <input className={inputCls} dir="ltr" value={notesEn} onChange={(e) => setNotesEn(e.target.value)} />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
              {t(lang, 'recipeVisible')}
            </label>

            {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>{busy ? t(lang, 'authWorking') : t(lang, 'save')}</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t(lang, 'close')}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
