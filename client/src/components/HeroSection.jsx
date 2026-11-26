import FreddoMark from '@/components/FreddoMark.jsx';
import { useContentStore, ct } from '@/store/content.js';
import { t } from '@/i18n/index.js';

// The homepage hero: always rendered (it is the identity, not CMS
// content). The tagline itself stays admin-editable through the CMS
// override store. Banners render right below it when the admin adds any.
export default function HeroSection({ lang }) {
  const overrides = useContentStore((s) => s.overrides);
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-5 pb-10 pt-6 text-center">
      <FreddoMark subtitle={t(lang, 'appName')} />
      <p className="max-w-md text-lg font-semibold text-secondary">
        {ct(overrides, lang, 'tagline', t)}
      </p>
    </section>
  );
}
