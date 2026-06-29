// =============================================================================
// dateTimeUtils — centralized, safe date/time helpers.
// All date arithmetic flows through these functions so comparisons,
// formatting, and remaining-time calculations are consistent everywhere.
// =============================================================================

// ---------------------------------------------------------------------------
// Now — always returns the real current time at call site.
// ---------------------------------------------------------------------------

/** Current ISO-8601 string at call time. */
export const nowISO = () => new Date().toISOString();

/** Current Date object at call time. */
export const nowDate = () => new Date();

// ---------------------------------------------------------------------------
// Safe parsing
// ---------------------------------------------------------------------------

/**
 * Parse any value into a Date, returning null on failure.
 * Handles strings, numbers (ms timestamps), and Date objects.
 */
export const parseSafeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

/**
 * Add calendar days to a date value.
 * Accepts strings, timestamps, or Date objects.
 */
export const addDays = (dateValue, days) => {
  const date = parseSafeDate(dateValue) || new Date();
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
};

/**
 * Difference in milliseconds between two date values.
 * Returns 0 if either value is unparseable.
 */
export const diffMs = (fromDate, toDate) => {
  const from = parseSafeDate(fromDate);
  const to = parseSafeDate(toDate);
  if (!from || !to) return 0;
  return to.getTime() - from.getTime();
};

// ---------------------------------------------------------------------------
// Remaining time
// ---------------------------------------------------------------------------

/**
 * Compute remaining time from now until endDate.
 *
 * @param {string|number|Date} endDateValue
 * @param {Date} [nowValue] — defaults to real current time
 * @returns {{ remainingMs: number, remainingDays: number, remainingHours: number, isOverdue: boolean }}
 */
export const getRemainingTime = (endDateValue, nowValue) => {
  const endDate = parseSafeDate(endDateValue);
  const now = parseSafeDate(nowValue) || nowDate();

  if (!endDate) {
    return { remainingMs: 0, remainingDays: 0, remainingHours: 0, isOverdue: false };
  }

  const remainingMs = endDate.getTime() - now.getTime();
  const isOverdue = remainingMs < 0;

  const safeMs = Math.max(remainingMs, 0);
  const remainingDays = Math.floor(safeMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.floor((safeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  return { remainingMs, remainingDays, remainingHours, isOverdue };
};

/**
 * Human-readable remaining-time label in Vietnamese.
 *   "4 ngày 2 giờ" / "Quá hạn: 1 ngày 3 giờ" / "N/A"
 */
export const getRemainingText = (endDateValue, nowValue) => {
  const endDate = parseSafeDate(endDateValue);
  if (!endDate) return "N/A";

  const { remainingDays, remainingHours, isOverdue } = getRemainingTime(endDate, nowValue);

  if (isOverdue) {
    const absDays = Math.floor(Math.abs(endDate.getTime() - (parseSafeDate(nowValue) || nowDate()).getTime()) / (24 * 60 * 60 * 1000));
    const absHours = Math.floor((Math.abs(endDate.getTime() - (parseSafeDate(nowValue) || nowDate()).getTime()) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return `Quá hạn: ${absDays} ngày ${absHours} giờ`;
  }

  return `${remainingDays} ngày ${remainingHours} giờ`;
};

// ---------------------------------------------------------------------------
// Formatting (UI-only, never for comparison)
// ---------------------------------------------------------------------------

/**
 * Format a date value for display.
 * Never use the result for arithmetic or comparisons.
 */
export const formatDate = (value, fallback = "N/A") => {
  const date = parseSafeDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format a date as a short numeric string (MM/DD/YYYY).
 */
export const formatDateShort = (value, fallback = "N/A") => {
  const date = parseSafeDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// ---------------------------------------------------------------------------
// Field priority resolvers — single source of truth for fallback chains.
// ---------------------------------------------------------------------------

/** Original client timeline (days). Locked baseline, never overwritten. */
export const resolveOriginalTimelineDays = (project) =>
  Number(project?.totalDurationDays) ||
  Number(project?.originalDurationDays) ||
  0;

/** Active project start date. */
export const resolveStartDate = (project) =>
  parseSafeDate(project?.contractStartedAt) ||
  parseSafeDate(project?.acceptedAt) ||
  parseSafeDate(project?.startDate) ||
  parseSafeDate(project?.createdAt) ||
  nowDate();

/** Implementation duration (from accepted proposal or expert tasks). */
export const resolveImplementationDays = (project, proposal) =>
  Number(project?.implementationDurationDays) ||
  Number(proposal?.estimatedDurationDays) ||
  Number(proposal?.estimatedDays) ||
  Number(project?.totalDurationDays) ||
  0;

/** Active project end date. */
export const resolveEndDate = (project, proposal) => {
  const explicit = parseSafeDate(project?.endDate);
  if (explicit) return explicit;

  const start = resolveStartDate(project);
  const days = resolveImplementationDays(project, proposal);
  if (days > 0) return addDays(start, days);

  // Fallback: start + original timeline
  const originalDays = resolveOriginalTimelineDays(project);
  return addDays(start, originalDays || 0);
};

/** Project posted date. */
export const resolvePostedDate = (project) =>
  parseSafeDate(project?.postedOn) ||
  parseSafeDate(project?.createdAt) ||
  null;
