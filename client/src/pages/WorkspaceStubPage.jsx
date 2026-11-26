import { t } from '@/i18n/index.js';

// Temporary landing pages for the admin and barista workspaces: the role
// redirect map (doc 3.1) already routes there, and the real dashboards
// replace these stubs in their own sprints.
export default function WorkspaceStubPage({ lang, titleKey }) {
  return (
    <section className="mx-auto w-full max-w-md px-5 pb-16 text-center">
      <h2 className="mb-3 text-3xl font-black text-primary [text-shadow:0_0_14px_rgba(255,150,20,.6)]">
        {t(lang, titleKey)}
      </h2>
      <p className="text-secondary">{t(lang, 'workspaceComingSoon')}</p>
    </section>
  );
}
