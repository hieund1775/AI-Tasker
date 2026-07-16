// =============================================================================
// safety.js — Runtime safety utilities for crash prevention.
//
// Use these helpers everywhere instead of raw array/object/date/number
// operations to guarantee the app never crashes on undefined, null, or
// invalid data.
// =============================================================================

/**
 * Guard a value so it is always an array.
 * Use before .map(), .filter(), .find(), .reduce(), etc.
 *
 * @param {*} value - The value to guard
 * @returns {Array} The original array, or an empty array
 */
export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Safely access a nested property path on an object.
 * Returns the fallback if any segment of the path is null/undefined.
 *
 * @param {object} obj - The root object
 * @param {string} path - Dot-separated path, e.g. "client.profile.name"
 * @param {*} fallback - Value to return if the path is broken (default "")
 * @returns {*}
 */
export function safeGet(obj, path, fallback = "") {
  if (obj == null) return fallback;
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return fallback;
    current = current[key];
  }
  return current != null ? current : fallback;
}

/**
 * Safely convert a value to a number.
 *
 * @param {*} val - The value to convert
 * @param {number} fallback - Default number if conversion fails (default 0)
 * @returns {number}
 */
export function safeNum(val, fallback = 0) {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Safely format a value as a date string using toLocaleDateString.
 *
 * @param {*} value - Date-compatible value (Date, string, number, timestamp)
 * @param {object} options - Intl.DateTimeFormat options
 * @param {string} fallback - String to return if the date is invalid (default "N/A")
 * @returns {string}
 */
export function safeDateFormat(value, options, fallback = "N/A") {
  if (!value) return fallback;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString("en-US", options);
  } catch {
    return fallback;
  }
}

/**
 * Safely format a value as a date+time string using toLocaleString.
 *
 * @param {*} value - Date-compatible value
 * @param {object} options - Intl.DateTimeFormat options
 * @param {string} fallback - String to return if invalid (default "N/A")
 * @returns {string}
 */
export function safeDateTimeFormat(value, options, fallback = "N/A") {
  if (!value) return fallback;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleString("en-US", options);
  } catch {
    return fallback;
  }
}

/**
 * Safely format a number as a percentage string.
 *
 * @param {*} val - The numeric value
 * @param {number} decimals - Number of decimal places (default 0)
 * @param {string} fallback - Return value if invalid (default "0%")
 * @returns {string}
 */
export function safePercent(val, decimals = 0, fallback = "0%") {
  const num = safeNum(val, null);
  if (num === null) return fallback;
  try {
    return `${num.toFixed(decimals)}%`;
  } catch {
    return fallback;
  }
}

/**
 * Safely parse a JSON string. Returns the fallback on any failure.
 *
 * @param {string} value - The JSON string to parse
 * @param {*} fallback - Default return value (default null)
 * @returns {*}
 */
export function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Safely format a number with toLocaleString.
 *
 * @param {*} val - The numeric value
 * @param {string} locale - BCP 47 locale tag (default "en-US")
 * @param {object} options - Intl.NumberFormat options
 * @param {string} fallback - Return value if invalid (default "0")
 * @returns {string}
 */
export function safeNumberFormat(val, locale = "en-US", options = {}, fallback = "0") {
  const num = safeNum(val, null);
  if (num === null) return fallback;
  try {
    return num.toLocaleString(locale, options);
  } catch {
    return fallback;
  }
}
