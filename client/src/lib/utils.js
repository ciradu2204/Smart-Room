/**
 * Merge class names, filtering out falsy values.
 * Lightweight alternative to clsx for conditional classes.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Format a date for display. Uses date-fns under the hood.
 * Import specific formatters from date-fns as needed.
 */
export function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

/**
 * API base URL for the Express server (MQTT bridge & allocation).
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
