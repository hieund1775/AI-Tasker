import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "../../hooks/useAuth.js";
import { HeroSection } from "../../components/landing/HeroSection.jsx";
import { HowItWorks } from "../../components/landing/HowItWorks.jsx";
import { ProductShowcase } from "../../components/landing/ProductShowcase.jsx";

export function HomePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isAuthenticated, role } = useAuth();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getThemeIcon = () => {
    if (theme === "system") return <Monitor className="w-4 h-4" />;
    return resolvedTheme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
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
      <nav className="bg-background/82 backdrop-blur-xl border-b border-border/70 sticky top-0 z-40 shadow-sm shadow-foreground/[0.025]">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-30 rounded-lg"
                style={{ background: 'radial-gradient(circle at 40% 30%, white 0%, transparent 60%)' }}
              />
              <span className="text-primary-foreground font-semibold text-sm relative z-[1]">AI</span>
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">Tasker</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="relative" ref={themeRef}>
              <button
                type="button"
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                title="Change theme"
              >
                {getThemeIcon()}
              </button>
              {showThemeMenu && (
                <div className="absolute right-0 top-10 w-36 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
                  <div className="p-1">
                    {[
                      { mode: "light", icon: Sun, label: "Light" },
                      { mode: "dark", icon: Moon, label: "Dark" },
                      { mode: "system", icon: Monitor, label: "System" },
                    ].map(({ mode, icon: Icon, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setTheme(mode); setShowThemeMenu(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                          theme === mode
                            ? "bg-accent-light text-accent font-medium"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
      <footer className="border-t border-border/70 bg-card/55">
        <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-xl flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold text-xs">AI</span>
                </div>
                <span className="text-sm font-semibold text-foreground tracking-tight">Tasker</span>
              </Link>
              <span className="hidden sm:inline text-xs text-muted-foreground/40">|</span>
              <p className="text-xs text-muted-foreground">
                Connecting businesses with AI experts worldwide.
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
