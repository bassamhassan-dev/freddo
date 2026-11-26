import { Link } from 'react-router-dom';
import { t } from '@/i18n/index.js';

export default function NotFoundPage({ lang }) {
  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16 text-center">
      <h2 className="mb-3 text-3xl font-black text-primary">404</h2>
      <p className="mb-6 text-secondary">{t(lang, 'pageNotFound')}</p>
      <Link to="/" className="font-bold text-primary underline underline-offset-4">
        {t(lang, 'backHome')}
      </Link>
    </section>
  );
}
