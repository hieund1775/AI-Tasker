import { Link } from "react-router";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "../../hooks/useAuth.js";
import { rememberPendingTheme } from "../../lib/themePreference.js";
import { HeroSection } from "../../components/landing/HeroSection.jsx";
import { HowItWorks } from "../../components/landing/HowItWorks.jsx";
import { ProductShowcase } from "../../components/landing/ProductShowcase.jsx";

export function HomePage() {
  const { setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated, role } = useAuth();

  const handleThemeToggle = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    rememberPendingTheme(nextTheme);
    setTheme(nextTheme);
  };

  const dashboardPath =
    role === "admin" || role === "staff"
      ? "/admin/dashboard"
      : role === "owner"
        ? "/owner/dashboard"
        : role
          ? `/${role}/dashboard`
          : "/login";

  return (
    <div className="page-shell min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-40 h-[4.75rem] overflow-hidden bg-background/92 backdrop-blur-xl border-b border-border/70 shadow-sm shadow-foreground/[0.025] dark:bg-background/94">
        <div className="flex h-full w-full items-center justify-between gap-2 px-3 sm:gap-5 sm:px-4 lg:px-5">
          <Link to="/" className="flex min-w-0 flex-shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
              <span className="text-primary-foreground font-bold text-base relative z-[1]">AI</span>
            </div>
            <span className="hidden text-[1.35rem] font-semibold text-foreground tracking-tight min-[380px]:inline">Tasker</span>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3.5">
            <div className="relative">
              <button
                type="button"
                onClick={handleThemeToggle}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="inline-flex h-10 min-w-24 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-hover"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-10 min-w-20 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex h-10 min-w-24 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-hover"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Product Showcase */}
      <ProductShowcase />

      {/* Footer */}
      <footer className="border-t border-border/70 bg-card/65">
        <div className="mx-auto w-full max-w-[var(--layout-max)] px-[var(--page-gutter)] py-5">
          <div className="grid gap-4 text-center md:grid-cols-3 md:items-center md:text-left">
            <div className="flex justify-center md:justify-start">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold text-xs">AI</span>
                </div>
                <span className="text-sm font-bold text-foreground tracking-tight">Tasker</span>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Structured AI projects, expert proposals and tracked delivery.
            </p>
            <p className="text-xs text-muted-foreground/60 md:text-right">
              &copy; {new Date().getFullYear()} AI Tasker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
