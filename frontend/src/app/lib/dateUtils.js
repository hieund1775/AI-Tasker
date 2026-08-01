// =============================================================================
// Shared date/time formatting helpers (Vietnam Timezone - ICT / UTC+7).
// =============================================================================

/**
 * Safely parse any date input (ISO string, timestamp, or Date) as UTC.
 * Ensures ISO strings without explicit timezone offsets (missing 'Z' or offset) are treated as UTC.
 *
 * @param {string|number|Date} dateInput
 * @returns {Date|null}
 */
export function parseUtcDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === "number") return new Date(dateInput);

  let str = String(dateInput).trim();
  if (!str) return null;

  if (!str.endsWith("Z") && !str.includes("+") && !str.match(/-\d{2}:\d{2}$/)) {
    if (str.includes(" ") && !str.includes("T")) {
      str = str.replace(" ", "T");
    }
    if (str.includes("T")) {
      str = str + "Z";
    }
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? new Date(dateInput) : date;
}

/**
 * Human-readable relative time from an ISO date string or timestamp.
 *
 * @param {string|number|Date} dateInput - ISO string, timestamp (ms), or Date
 * @returns {string} e.g. "Just now", "5 min ago", "2 hr ago", "3d ago", "1 month ago"
 */
export function timeAgo(dateInput) {
  if (!dateInput) return "";

  const parsed = parseUtcDate(dateInput);
  if (!parsed) return "";

  const now = Date.now();
  const then = parsed.getTime();

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
 * Format a date string to a locale date string in Vietnam timezone.
 *
 * @param {string|number|Date} dateInput
 * @param {object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(dateInput, options = { year: "numeric", month: "short", day: "numeric" }) {
  if (!dateInput) return "";
  try {
    const parsed = parseUtcDate(dateInput);
    if (!parsed || Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      ...options,
    });
  } catch {
    return "";
  }
}

/**
 * Format a date input to a full date-time string in Vietnam timezone (ICT / UTC+7).
 *
 * @param {string|number|Date} dateInput
 * @returns {string} e.g. "01/08/2026 09:44"
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return "";
  try {
    const parsed = parseUtcDate(dateInput);
    if (!parsed || Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}
