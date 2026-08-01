import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "../../hooks/useAuth.js";
import { consumePendingTheme, readAccountTheme, saveAccountTheme } from "../../lib/themePreference.js";

export function AccountThemeSync() {
  const { isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const loadedKeyRef = useRef(null);

  const userKey = user?.id || user?.Id || user?.email || user?.Email || null;

  const accountThemeKey = useMemo(() => {
    if (!isAuthenticated || !userKey) return null;
    return userKey;
  }, [isAuthenticated, userKey]);

  useEffect(() => {
    if (!accountThemeKey || loadedKeyRef.current === accountThemeKey || typeof window === "undefined") return;

    loadedKeyRef.current = accountThemeKey;
    const pendingTheme = consumePendingTheme();

    if (pendingTheme) {
      saveAccountTheme(accountThemeKey, pendingTheme);
      setTheme(pendingTheme);
      return;
    }

    const storedTheme = readAccountTheme(accountThemeKey);
    if (storedTheme) {
      setTheme(storedTheme);
      return;
    }

    if (theme) saveAccountTheme(accountThemeKey, theme);
  }, [accountThemeKey, setTheme, theme]);

  return null;
}

export default AccountThemeSync;
