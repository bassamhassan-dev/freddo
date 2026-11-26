import { useEffect, useState } from 'react';
import { DEFAULT_LANG, getDirection, t } from './i18n/index.js';

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
    <main dir={direction}>
      <h1>{t(lang, 'welcome')}</h1>
      <p>{t(lang, 'tagline')}</p>
      <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
        {lang === 'ar' ? 'English' : 'عربي'}
      </button>
    </main>
  );
}
