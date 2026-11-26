import { useEffect, useState } from 'react';
import { DEFAULT_LANG, getDirection, t } from '@/i18n/index.js';
import { Button } from '@/components/ui/button';
import MenuPage from '@/components/MenuPage.jsx';

export default function App() {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const direction = getDirection(lang);

  // Keep the document itself in sync with the active language so the
  // browser handles RTL layout, scrollbars and text alignment natively.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = direction;
  }, [lang, direction]);

  return (
    <div dir={direction} className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
        <div className="flex flex-col leading-none">
          <span className="font-brand text-3xl font-black tracking-wide text-[#fff6e6] [text-shadow:0_0_10px_rgba(255,170,30,.8)]">
            FREDDO
          </span>
          <span className="mt-1 text-[11px] font-bold tracking-[0.34em] text-primary">
            {t(lang, 'appName')}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          {t(lang, 'languageSwitch')}
        </Button>
      </header>

      <main>
        <p className="mb-8 text-center text-lg font-semibold text-secondary">{t(lang, 'tagline')}</p>
        <MenuPage lang={lang} />
      </main>
    </div>
  );
}
