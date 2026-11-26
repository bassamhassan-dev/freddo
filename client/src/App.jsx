import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DEFAULT_LANG, getDirection, t } from '@/i18n/index.js';
import { useAuthStore } from '@/store/auth.js';
import SiteHeader from '@/components/SiteHeader.jsx';
import RequireAuth from '@/components/RequireAuth.jsx';
import MenuPage from '@/components/MenuPage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import RegisterPage from '@/pages/RegisterPage.jsx';
import AccountPage from '@/pages/AccountPage.jsx';
import WorkspaceStubPage from '@/pages/WorkspaceStubPage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';

export default function App() {
  const [lang, setLang] = useState(DEFAULT_LANG);
  const direction = getDirection(lang);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Keep the document itself in sync with the active language so the
  // browser handles RTL layout, scrollbars and text alignment natively.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = direction;
  }, [lang, direction]);

  return (
    <BrowserRouter>
      <div dir={direction} className="min-h-screen">
        <SiteHeader lang={lang} onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')} />
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <p className="mb-8 text-center text-lg font-semibold text-secondary">{t(lang, 'tagline')}</p>
                  <MenuPage lang={lang} />
                </>
              }
            />
            <Route path="/login" element={<LoginPage lang={lang} />} />
            <Route path="/register" element={<RegisterPage lang={lang} />} />
            <Route
              path="/account"
              element={
                <RequireAuth lang={lang}>
                  <AccountPage lang={lang} />
                </RequireAuth>
              }
            />
            {/* Role homes (doc 3.1); real dashboards land in their sprints. */}
            <Route path="/admin" element={<WorkspaceStubPage lang={lang} titleKey="adminWorkspace" />} />
            <Route path="/barista" element={<WorkspaceStubPage lang={lang} titleKey="baristaWorkspace" />} />
            <Route path="*" element={<NotFoundPage lang={lang} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
