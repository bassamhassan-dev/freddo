// The centered Freddo mark used on the auth pages and the hero: steam
// wisps over the glowing wordmark. Pure CSS animation (no libraries),
// paused for users who prefer reduced motion.
export default function FreddoMark({ subtitle }) {
  return (
    <div className="flex flex-col items-center leading-none">
      <div className="mb-1 flex items-end gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="steam-wisp block h-4 w-1 rounded-full bg-primary/70 blur-[2px]"
            style={{ animationDelay: `${i * 0.55}s` }}
          />
        ))}
      </div>
      <span className="animate-freddo-glow font-brand text-5xl font-black tracking-wide text-[#fff6e6]">
        FREDDO
      </span>
      {subtitle && <span className="mt-2 text-[11px] font-bold tracking-[0.34em] text-primary">{subtitle}</span>}
    </div>
  );
}
