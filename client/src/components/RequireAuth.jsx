import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { t } from '@/i18n/index.js';

// UX gate for customer pages that need an account (checkout, orders).
// Security lives in the server's requireAuth middleware; this only decides
// what the visitor sees.
export default function RequireAuth({ lang, children }) {
  const { status } = useAuthStore();
  const location = useLocation();

  if (status === 'unknown') {
    return <p className="py-20 text-center text-secondary">{t(lang, 'authChecking')}</p>;
  }
  if (status === 'guest') {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
