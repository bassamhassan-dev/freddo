import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.js';
import { t } from '@/i18n/index.js';

// Role gate for workspace pages. UX only - the real check is the server's
// requireRole middleware on every /api/admin/* call.
export default function RequireRole({ lang, role, children }) {
  const { user, status } = useAuthStore();
  if (status === 'unknown') {
    return <p className="py-20 text-center text-secondary">{t(lang, 'authChecking')}</p>;
  }
  if (status === 'guest') return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to="/" replace />;
  return children;
}
