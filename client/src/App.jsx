import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DEFAULT_LANG, getDirection, t } from '@/i18n/index.js';
import { useAuthStore } from '@/store/auth.js';
import SiteHeader from '@/components/SiteHeader.jsx';
import RequireAuth from '@/components/RequireAuth.jsx';
import MenuPage from '@/components/MenuPage.jsx';
import ItemDetailPage from '@/pages/ItemDetailPage.jsx';
import CartPage from '@/pages/CartPage.jsx';
import CheckoutPage from '@/pages/CheckoutPage.jsx';
import OrdersPage from '@/pages/OrdersPage.jsx';
import OrderConfirmationPage from '@/pages/OrderConfirmationPage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage.jsx';
import RegisterPage from '@/pages/RegisterPage.jsx';
import AccountPage from '@/pages/AccountPage.jsx';
import WorkspaceStubPage from '@/pages/WorkspaceStubPage.jsx';
import AdminPage from '@/pages/AdminPage.jsx';
import BaristaPage from '@/pages/BaristaPage.jsx';
import ReservationsPage from '@/pages/ReservationsPage.jsx';
import ContactPage from '@/pages/ContactPage.jsx';
import RequireRole from '@/components/RequireRole.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';
import HomeBanners from '@/components/HomeBanners.jsx';
import { useContentStore, ct } from '@/store/content.js';

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

  const { overrides, load } = useContentStore();
  useEffect(() => { load(); }, [load]);

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
                  <p className="mb-8 text-center text-lg font-semibold text-secondary">{ct(overrides, lang, 'tagline', t)}</p>
                  <HomeBanners lang={lang} />
                  <MenuPage lang={lang} />
                </>
              }
            />
            <Route path="/item/:slug" element={<ItemDetailPage lang={lang} />} />
            <Route path="/cart" element={<CartPage lang={lang} />} />
            <Route path="/contact" element={<ContactPage lang={lang} />} />
            <Route
              path="/reservations"
              element={
                <RequireAuth lang={lang}>
                  <ReservationsPage lang={lang} />
                </RequireAuth>
              }
            />
            <Route
              path="/checkout"
              element={
                <RequireAuth lang={lang}>
                  <CheckoutPage lang={lang} />
                </RequireAuth>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireAuth lang={lang}>
                  <OrdersPage lang={lang} />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequireAuth lang={lang}>
                  <OrderConfirmationPage lang={lang} />
                </RequireAuth>
              }
            />
            <Route path="/login" element={<LoginPage lang={lang} />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage lang={lang} />} />
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
            <Route
              path="/admin"
              element={
                <RequireRole lang={lang} role="admin">
                  <AdminPage lang={lang} />
                </RequireRole>
              }
            />
            <Route
              path="/barista"
              element={
                <RequireRole lang={lang} role={['barista', 'admin']}>
                  <BaristaPage lang={lang} />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFoundPage lang={lang} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
