import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../hooks/useAuth.js";

function getDashboardPath(role) {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "owner") return "/owner/dashboard";
  if (normalizedRole === "admin" || normalizedRole === "staff") return "/admin/dashboard";
  if (normalizedRole === "expert") return "/expert/dashboard";
  if (normalizedRole === "client" || normalizedRole === "user") return "/client/dashboard";
  return "/client/dashboard";
}

export function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, role, user } = useAuth();
  const resolvedRole = role || user?.role || user?.Role;
  const targetPath = isAuthenticated ? getDashboardPath(resolvedRole) : "/login";
  const buttonLabel = isAuthenticated ? "Back to Dashboard" : "Log In";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "404 Not Found";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const handleNavigate = () => {
    navigate(targetPath, { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex w-full max-w-4xl flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-10"
      >
        <div className="flex w-full items-center justify-center">
          <img
            src="/404NotFound.jpg"
            alt="Page not found illustration"
            className="h-auto max-h-[26rem] w-full max-w-xl object-contain"
          />
        </div>

        <div className="mt-8 flex w-full flex-col items-center">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Navigation Error
          </p>
          <h1 className="mt-2 text-center text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Page Not Found
          </h1>
          <p className="mt-5 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">
            The page you are trying to access does not exist or has been moved.
            Please check the URL or return to your dashboard.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleNavigate}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <ArrowLeft className="h-4 w-4" />
              {loading ? "Checking..." : buttonLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
