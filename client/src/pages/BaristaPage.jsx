import { useCallback, useEffect, useState } from 'react';
import { apiBaristaItems, apiBaristaRecipe } from '@/api/barista.js';
import { t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// The barista workspace (doc 7.1): read-only product cards grouped by
// category, each opening its internal recipe. Built for counter tablets,
// so cards and touch targets stay big.
export default function BaristaPage({ lang }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [openSlug, setOpenSlug] = useState(null);
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    apiBaristaItems()
      .then((data) => setItems(data.items))
      .catch(() => setError(true));
  }, []);

  const openRecipe = useCallback(async (slug) => {
    setOpenSlug(slug);
    setRecipe(null);
    try {
      const data = await apiBaristaRecipe(slug);
      setRecipe(data);
    } catch {
      setRecipe(false); // hidden or missing recipe
    }
  }, []);

  const close = () => {
    setOpenSlug(null);
    setRecipe(null);
  };

  const categories = [];
  for (const item of items || []) {
    let group = categories.find((c) => c.slug === item.category.slug);
    if (!group) {
      group = { slug: item.category.slug, name: item.category.name, items: [] };
      categories.push(group);
    }
    group.items.push(item);
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-5 pb-16">
      <h2 className="mb-6 text-center text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, 'baristaWorkspace')}
      </h2>

      {error && <p className="text-center text-secondary">{t(lang, 'orderError')}</p>}
      {!items && !error && <Skeleton className="h-64 w-full rounded-2xl" />}

      {categories.map((group) => (
        <div key={group.slug} className="mb-8">
          <h3 className="mb-3 text-xl font-extrabold text-foreground">{group.name[lang]}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.items.map((item) => (
              <div key={item.slug} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                {item.images?.[0]?.url && (
                  <img src={item.images[0].url} alt={item.name[lang]} className="mb-3 h-24 w-full rounded-xl object-cover" />
                )}
                <span className="font-bold text-foreground">{item.name[lang]}</span>
                {!item.isAvailable && <Badge className="mt-1 w-fit">{t(lang, 'unavailable')}</Badge>}
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={!item.hasVisibleRecipe}
                  onClick={() => openRecipe(item.slug)}
                >
                  {t(lang, 'openRecipe')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {openSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={close}>
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {!recipe && <Skeleton className="h-40 w-full rounded-xl" />}
            {recipe === false && <p className="text-center text-secondary">{t(lang, 'noRecipe')}</p>}
            {recipe && (
              <>
                <h3 className="mb-4 text-2xl font-black text-primary">{recipe.name[lang]}</h3>
                <h4 className="mb-2 font-extrabold text-foreground">{t(lang, 'ingredients')}</h4>
                <ul className="mb-4 list-disc ps-5 text-secondary">
                  {recipe.recipe.ingredients.map((ing, i) => (
                    <li key={i}>
                      {ing.name[lang]} - {ing.quantity} {ing.unit}
                    </li>
                  ))}
                </ul>
                <h4 className="mb-2 font-extrabold text-foreground">{t(lang, 'steps')}</h4>
                <ol className="mb-4 list-decimal ps-5 text-secondary">
                  {recipe.recipe.steps.map((step, i) => (
                    <li key={i}>{step[lang]}</li>
                  ))}
                </ol>
                {recipe.recipe.notes && (
                  <p className="rounded-xl border border-border bg-background p-3 text-sm text-secondary">
                    {recipe.recipe.notes[lang]}
                  </p>
                )}
              </>
            )}
            <Button variant="ghost" className="mt-4 w-full" onClick={close}>
              {t(lang, 'close')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
