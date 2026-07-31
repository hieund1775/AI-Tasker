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
    <div className="page-shell min-h-screen bg-background flex flex-col pt-[4.25rem]">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-40 bg-background/88 backdrop-blur-xl border-b border-border/70 shadow-sm shadow-foreground/[0.025]">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-[var(--layout-max)] items-center justify-between gap-5 px-[var(--page-gutter)]">
          <Link to="/" className="flex items-center gap-3 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner shadow-white/10">
              <div
                className="absolute inset-0 opacity-30 rounded-xl"
                style={{ background: 'radial-gradient(circle at 40% 30%, white 0%, transparent 60%)' }}
              />
              <span className="text-primary-foreground font-bold text-base relative z-[1]">AI</span>
            </div>
            <span className="text-[1.35rem] font-bold text-foreground tracking-tight">Tasker</span>
          </Link>
          <div className="flex items-center gap-3.5">
            {/* Theme Toggle */}
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
                className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-hover"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-10 min-w-20 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-hover"
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
        <div className="mx-auto w-full max-w-[var(--layout-max)] px-[var(--page-gutter)] py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold text-xs">AI</span>
                </div>
                <span className="text-sm font-bold text-foreground tracking-tight">Tasker</span>
              </Link>
              <span className="hidden sm:inline text-xs text-muted-foreground/40">|</span>
              <p className="text-xs text-muted-foreground">
                Structured AI projects, expert proposals and tracked delivery.
              </p>
            </div>
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} AI Tasker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
