// =============================================================================
// Shared date/time formatting helpers.
// =============================================================================

/**
 * Human-readable relative time from an ISO date string or timestamp.
 *
 * @param {string|number|Date} dateInput - ISO string, timestamp (ms), or Date
 * @returns {string} e.g. "Just now", "5 min ago", "2 hr ago", "3d ago", "1 month ago"
 */
export function timeAgo(dateInput) {
  if (!dateInput) return "";

  const now = Date.now();
  const then = new Date(dateInput).getTime();

  if (Number.isNaN(then)) return "";

  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${diffDay} days ago`;
  if (diffDay < 60) return "1 month ago";
  return `${Math.floor(diffDay / 30)} months ago`;
}

/**
 * Format a date string to a locale date string.
 *
 * @param {string|number|Date} dateInput
 * @param {object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(dateInput, options = { year: "numeric", month: "short", day: "numeric" }) {
  if (!dateInput) return "";
  try {
    return new Date(dateInput).toLocaleDateString("en-US", options);
  } catch {
    return "";
  }
}

/**
 * Format a date input to a full date-time string (locale).
 *
 * @param {string|number|Date} dateInput
 * @returns {string} e.g. "Jun 10, 2026, 3:45 PM"
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return "";
  try {
    return new Date(dateInput).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
