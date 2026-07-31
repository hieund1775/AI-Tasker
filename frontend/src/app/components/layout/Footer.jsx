import { Link } from "react-router";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-[2] border-t border-border bg-card">
      <div className="mx-auto w-full max-w-[var(--layout-max)] px-[var(--page-gutter)] py-5">
        <div className="grid gap-4 text-center md:grid-cols-3 md:items-center md:text-left">
          <div className="flex justify-center md:justify-start">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-xs">AI</span>
              </div>
              <span className="text-sm font-semibold text-foreground tracking-tight">Tasker</span>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            Connecting businesses with AI experts worldwide.
          </p>

          <p className="text-xs text-muted-foreground/60 md:text-right">
            &copy; {year} AI Tasker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
