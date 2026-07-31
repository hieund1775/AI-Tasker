import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { Link } from "react-router";
import { Search, Briefcase, Users, Award, CheckCircle2 } from "lucide-react";
import { Footer } from "./Footer.jsx";
import api from "../../../services/api.js";

/**
 * PublicLayout - minimal shell for public-facing browse pages.
 *
 * Provides a simple navbar with links to Browse Experts and Browse Jobs,
 * a platform stats banner, plus the shared Footer. Used for routes that
 * should be accessible without authentication.
 */
export function PublicLayout() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.get("/platform/stats", { authenticated: false });
        setStats(data);
      } catch {
        // Graceful fallback - stats banner hidden if API unavailable
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="bg-background/82 backdrop-blur-xl border-b border-border/70 sticky top-0 z-40 shadow-sm shadow-foreground/[0.025]">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-[var(--layout-max)] items-center justify-between gap-5 px-3 sm:px-4 lg:px-5">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground font-bold text-base">AI</span>
              </div>
              <span className="text-[1.35rem] font-semibold tracking-[-0.02em] text-foreground hidden sm:inline">
                Tasker
              </span>
            </Link>
            <nav className="hidden items-center gap-5 sm:flex">
              <Link
                to="/experts"
                className="inline-flex h-11 min-w-[9rem] items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Search className="w-4 h-4" />
                Browse Experts
              </Link>
              <Link
                to="/jobs"
                className="inline-flex h-11 min-w-[8rem] items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Briefcase className="w-4 h-4" />
                Browse Jobs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-10 min-w-20 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Platform Stats Banner */}
        {stats && (
          <div className="bg-card/65 border-t border-border/70">
            <div className="mx-auto flex w-full max-w-[var(--layout-max)] items-center justify-center gap-10 px-3 py-2 sm:px-4 lg:px-5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent" />
                <span className="font-semibold text-foreground tabular-nums">
                  {(stats.totalExperts ?? 0).toLocaleString()}
                </span>{" "}
                Experts
              </span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-accent" />
                <span className="font-semibold text-foreground tabular-nums">
                  {(stats.totalOpenJobs ?? 0).toLocaleString()}
                </span>{" "}
                Open Jobs
              </span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span className="font-semibold text-foreground tabular-nums">
                  {(stats.totalCompletedProjects ?? 0).toLocaleString()}
                </span>{" "}
                Completed
              </span>
            </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
