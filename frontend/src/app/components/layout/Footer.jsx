import { Link } from "react-router";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo + Description */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">AI</span>
              </div>
              <span className="text-sm font-semibold text-foreground tracking-tight">Tasker</span>
            </Link>
            <span className="hidden sm:inline text-xs text-muted-foreground/40">|</span>
            <p className="text-xs text-muted-foreground">
              Connecting businesses with AI experts worldwide.
            </p>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/60">
            &copy; {year} AI Tasker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
