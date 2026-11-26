import { useEffect, useMemo, useState } from 'react';
import { getMenu } from '@/api/menu.js';
import { t } from '@/i18n/index.js';
import { useContentStore, ct } from '@/store/content.js';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import MenuItemCard from '@/components/MenuItemCard.jsx';

// The public menu page: fetches available items once, filters by category
// on the client for instant switching (the list is small; the API's
// ?category= filter exists for when it grows).
export default function MenuPage({ lang }) {
  const overrides = useContentStore((s) => s.overrides);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [activeCategory, setActiveCategory] = useState(null);
  const [query, setQuery] = useState('');

  const load = () => {
    setStatus('loading');
    getMenu()
      .then((body) => {
        setItems(body.items || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(load, []);

  const categories = useMemo(() => {
    const bySlug = new Map();
    for (const item of items) {
      if (!bySlug.has(item.category.slug)) bySlug.set(item.category.slug, item.category);
    }
    return [...bySlug.values()];
  }, [items]);

  // Search matches the Arabic and English name, on top of the category chip.
  const needle = query.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      (!activeCategory || item.category.slug === activeCategory) &&
      (!needle || item.name.ar.toLowerCase().includes(needle) || item.name.en.toLowerCase().includes(needle))
  );

  return (
    <section id="menu" className="mx-auto w-full max-w-5xl scroll-mt-20 px-5 pb-16">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
          {ct(overrides, lang, 'menuTitle', t)}
        </h2>
        <p className="mt-1 text-secondary">{ct(overrides, lang, 'menuSubtitle', t)}</p>
      </div>

      {status === 'ready' && items.length > 0 && (
        <div className="mx-auto mb-4 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, 'menuSearch')}
            aria-label={t(lang, 'menuSearch')}
            className="w-full rounded-full border border-border bg-card px-5 py-2 text-foreground outline-none focus:border-primary"
          />
        </div>
      )}

      {status === 'ready' && categories.length > 1 && (
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            variant={activeCategory === null ? 'default' : 'ghost'}
            onClick={() => setActiveCategory(null)}
          >
            {t(lang, 'allCategories')}
          </Button>
          {categories.map((category) => (
            <Button
              key={category.slug}
              size="sm"
              variant={activeCategory === category.slug ? 'default' : 'ghost'}
              onClick={() => setActiveCategory(category.slug)}
            >
              {category.name[lang]}
            </Button>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t(lang, 'menuLoading')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-destructive/50 p-6 text-center">
          <p className="mb-4 text-secondary">{t(lang, 'menuError')}</p>
          <Button variant="ghost" onClick={load}>
            {t(lang, 'menuRetry')}
          </Button>
        </div>
      )}

      {status === 'ready' && visible.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">
          {items.length > 0 ? t(lang, 'menuNoMatch') : ct(overrides, lang, 'menuEmpty', t)}
        </p>
      )}

      {status === 'ready' && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <MenuItemCard key={item.slug} item={item} lang={lang} />
          ))}
        </div>
      )}

      {status === 'ready' && items.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">{t(lang, 'menuNote')}</p>
      )}
    </section>
  );
}
