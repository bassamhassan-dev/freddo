import FreddoMark from '@/components/FreddoMark.jsx';
import { t } from '@/i18n/index.js';

// Sprint 24: the creative frame that sits beside the auth forms (same
// size as the form column). The Freddo mark glows with its steam wisps
// over a slow-pulsing neon ring - all CSS, reduced-motion safe.
export default function AuthArtFrame({ lang }) {
  return (
    <div className="relative hidden h-full min-h-[440px] flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border border-primary/30 bg-[radial-gradient(90%_70%_at_50%_30%,#2a1707_0%,#0b0806_70%)] p-6 md:flex">
      {/* Ambient neon ring behind the mark. */}
      <div className="absolute h-64 w-64 rounded-full border border-primary/25 shadow-neon motion-safe:animate-[freddo-ring_4s_ease-in-out_infinite]" aria-hidden="true" />
      <div className="absolute h-80 w-80 rounded-full border border-primary/10" aria-hidden="true" />
      <FreddoMark subtitle={t(lang, 'appName')} />
      <p className="relative text-sm font-bold tracking-wide text-primary/90">{t(lang, 'authArtTagline')}</p>
    </div>
  );
}
