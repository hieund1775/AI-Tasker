import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "../../hooks/useAuth.js";

const THEME_PREFIX = "aitasker_theme_user_";

export function AccountThemeSync() {
  const { isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const loadingStoredTheme = useRef(false);

  const accountThemeKey = useMemo(() => {
    if (!isAuthenticated || !user) return null;
    const userKey = user.id || user.Id || user.email || user.Email;
    return userKey ? `${THEME_PREFIX}${userKey}` : null;
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!accountThemeKey || typeof window === "undefined") return;

    const storedTheme = window.localStorage.getItem(accountThemeKey) || "system";
    loadingStoredTheme.current = true;
    setTheme(storedTheme);

    window.setTimeout(() => {
      loadingStoredTheme.current = false;
    }, 0);
  }, [accountThemeKey, setTheme]);

  useEffect(() => {
    if (!accountThemeKey || !theme || loadingStoredTheme.current || typeof window === "undefined") return;
    window.localStorage.setItem(accountThemeKey, theme);
  }, [accountThemeKey, theme]);

  return null;
}

export default AccountThemeSync;
