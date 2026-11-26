import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// cn() merges conditional class names and resolves Tailwind conflicts.
// Every shadcn-style component takes a className prop and merges it here.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
