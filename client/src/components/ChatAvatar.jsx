// Small initials avatar for the chat (Sprint 29). No photo storage on
// users, so identity is the first letter of the display name in a brand
// circle - amber for "you", dark for the other side.
export default function ChatAvatar({ name, variant = 'dark', size = 'md' }) {
  const initial = (name || '؟').trim().charAt(0) || '؟';
  const sizing = size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-8 w-8 text-sm';
  const colors =
    variant === 'amber'
      ? 'bg-[#ffb21a] text-black'
      : 'bg-[#241a10] text-[#f6e7cf] border border-amber-900/40';
  return (
    <span
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-bold ${sizing} ${colors}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
