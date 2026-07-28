const ACCOUNT_THEME_PREFIX = "aitasker_theme_user_";
const PENDING_THEME_KEY = "aitasker_theme_pending";

export function getAccountThemeKey(userKey) {
  return userKey ? `${ACCOUNT_THEME_PREFIX}${userKey}` : null;
}

export function rememberPendingTheme(mode) {
  if (!mode || typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_THEME_KEY, mode);
}

export function consumePendingTheme() {
  if (typeof window === "undefined") return null;
  const mode = window.localStorage.getItem(PENDING_THEME_KEY);
  if (mode) window.localStorage.removeItem(PENDING_THEME_KEY);
  return mode;
}

export function saveAccountTheme(userKey, mode) {
  const accountThemeKey = getAccountThemeKey(userKey);
  if (!accountThemeKey || !mode || typeof window === "undefined") return;
  window.localStorage.setItem(accountThemeKey, mode);
}

export function readAccountTheme(userKey) {
  const accountThemeKey = getAccountThemeKey(userKey);
  if (!accountThemeKey || typeof window === "undefined") return null;
  return window.localStorage.getItem(accountThemeKey);
}
