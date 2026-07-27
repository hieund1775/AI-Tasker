import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { router } from "./routes.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ErrorBoundary } from "./components/shared/ErrorBoundary.jsx";
import { Toaster } from "./components/ui/sonner.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
