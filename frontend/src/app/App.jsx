import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { router } from "./routes.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ErrorBoundary } from "./components/shared/ErrorBoundary.jsx";
import { Toaster } from "./components/ui/sonner.jsx";
import { AccountThemeSync } from "./components/theme/AccountThemeSync.jsx";

const THEME_STORAGE_KEY = "aitasker_theme_session";

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
        <AuthProvider>
          <AccountThemeSync />
          <RouterProvider router={router} />
        </AuthProvider>
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
