import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, X, Sun, Moon, Monitor } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "next-themes";
import { rememberPendingTheme } from "../../lib/themePreference.js";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);

      // Track login event for Owner traffic stats
      try {
        const logins = JSON.parse(localStorage.getItem("aitasker_user_logins") || "[]");
        logins.push({
          userId: user.id || user.Id,
          role: user.role || user.Role,
          date: new Date().toISOString().split("T")[0],
          timestamp: new Date().getTime()
        });
        localStorage.setItem("aitasker_user_logins", JSON.stringify(logins));
        try {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        } catch (e) {}
      } catch (e) {
        console.warn("Failed to record login event:", e);
      }

      if (user.role === "expert" && user.hasProfile === false) {
        navigate("/expert/profile/edit", { replace: true });
      } else {
        const dashboardPath =
          user.role === "owner"
            ? "/owner/dashboard"
            : (user.role === "admin" || user.role === "staff")
              ? "/admin/dashboard"
              : user.role === "expert"
                ? "/expert/dashboard"
                : "/client/dashboard";
        navigate(dashboardPath, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="auth-card relative max-w-md w-full rounded-xl border border-border p-8"
      >
        {/* Subtle border glow */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent/[0.04] via-transparent to-primary/[0.03] pointer-events-none" />

        <div className="relative">
          <div className="absolute -top-1 -right-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                const modes = ["light", "dark", "system"];
                const idx = modes.indexOf(theme ?? "system");
                const nextTheme = modes[(idx + 1) % modes.length];
                rememberPendingTheme(nextTheme);
                setTheme(nextTheme);
              }}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title={`Theme: ${theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"}`}
            >
              {theme === "system" ? (
                <Monitor className="w-4 h-4" />
              ) : resolvedTheme === "dark" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-30 rounded-lg"
                  style={{ background: 'radial-gradient(circle at 40% 30%, white 0%, transparent 60%)' }}
                />
                <span className="text-primary-foreground font-semibold text-base relative z-[1]">AI</span>
              </div>
              <span className="text-xl font-semibold text-foreground tracking-tight">Tasker</span>
            </Link>
          </div>

          <div>
              <h2 className="text-xl font-semibold text-foreground text-center tracking-tight">
                Welcome Back
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground text-center">
                Sign in to your account
              </p>
              {error && (
                <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}
              <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="w-full h-10 px-3.5 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50 transition-shadow"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="w-full h-10 px-3.5 pr-10 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50 transition-shadow"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-border accent-accent" />
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-accent hover:text-accent-hover bg-transparent border-none p-0 cursor-pointer font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Signing in..." : "Sign In"}
                </button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-accent hover:text-accent-hover font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
