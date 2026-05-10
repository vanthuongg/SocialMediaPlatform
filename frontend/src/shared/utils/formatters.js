import { formatDistanceToNow, format } from 'date-fns';

/**
 * Formats a date as relative time (e.g., "3 minutes ago").
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (err) {
    return '';
  }
}

/**
 * Formats a date as a readable string (e.g., "January 5, 2026").
 */
export function formatDate(date) {
  if (!date) return '';
  try {
    return format(new Date(date), 'MMMM d, yyyy');
  } catch (err) {
    return '';
  }
}

/**
 * Formats a date for chat timestamps (e.g., "2:30 PM").
 */
export function formatTime(date) {
  if (!date) return '';
  try {
    return format(new Date(date), 'HH:mm');
  } catch (err) {
    return '';
  }
}

/**
 * Formats large numbers with K/M abbreviations (e.g., 1500 → "1.5K").
 */
export function formatCount(count) {
  if (count === null || count === undefined) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

/**
 * Extracts a readable error message from an Axios error.
 */
export function extractError(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    'An unexpected error occurred'
  );
}

/**
 * Generates a color from a string (for avatars without photo).
 */
export function stringToColor(str) {
  const colors = [
    '#7C3AED', '#6366F1', '#8B5CF6', '#A78BFA',
    '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Gets initials from a name (max 2 characters).
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
