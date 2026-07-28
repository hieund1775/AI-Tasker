import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { router } from "./routes.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ErrorBoundary } from "./components/shared/ErrorBoundary.jsx";
import { Toaster } from "./components/ui/sonner.jsx";
import { AccountThemeSync } from "./components/theme/AccountThemeSync.jsx";
import { AIDecorativeRails } from "./components/layout/AIDecorativeRails.jsx";

const THEME_STORAGE_KEY = (() => {
  if (typeof window === "undefined") return "aitasker_theme_session";
  const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `aitasker_theme_tab_${id}`;
})();

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        storageKey={THEME_STORAGE_KEY}
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AIDecorativeRails />
        <AuthProvider>
          <AccountThemeSync />
          <RouterProvider router={router} />
        </AuthProvider>
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
