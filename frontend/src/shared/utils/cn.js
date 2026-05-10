import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes intelligently — resolves conflicts and deduplicates.
 * @param {...(string|undefined|false|null)} inputs
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
