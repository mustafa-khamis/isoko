// Derive the static-files root from the API base URL.
// e.g. "http://localhost:5000/api/v1" → "http://localhost:5000"
const API_STATIC_ROOT = (() => {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  try {
    const url = new URL(base);
    return url.origin;
  } catch {
    return '';
  }
})();

/**
 * Turns a backend image path into a fully-qualified URL.
 * - Already-absolute URLs (http/https) are returned as-is.
 * - Relative paths like "avatars/userId/file.png" get the static root prepended.
 * - null/undefined returns null.
 */
export function resolveImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_STATIC_ROOT}/${path.replace(/^\/+/, '')}`;
}

export function formatRWF(amount) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  
  return 'Just now';
}

export function formatJoinedDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}
