import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, ArrowLeft, Mail, CheckCircle, X, Sun, Moon, Monitor } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "next-themes";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [view, setView] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetError, setResetError] = useState("");

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

      if (user.role === "expert" && user.hasProfile === false) {
        navigate("/expert/profile/edit", { replace: true });
      } else {
        const dashboardPath =
          user.role === "owner"
            ? "/owner/dashboard"
            : user.role === "admin"
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

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setResetError("");
    if (!resetEmail.trim()) {
      setResetError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      setResetError("Please enter a valid email address.");
      return;
    }
    setResetSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Ambient background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.015] blur-[150px]" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative max-w-md w-full bg-card rounded-xl border border-border p-8"
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
                setTheme(modes[(idx + 1) % modes.length]);
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
                <span className="text-primary-foreground font-bold text-base relative z-[1]">AI</span>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">Tasker</span>
            </Link>
          </div>

          {view === "forgotPassword" ? (
            <div>
              <h2 className="text-xl font-bold text-foreground text-center tracking-tight">
                Forgot Password
              </h2>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {resetSubmitted
                  ? "Check your email for reset instructions."
                  : "Enter your email to receive a password reset link."}
              </p>
              {resetSubmitted ? (
                <div className="text-center mt-8">
                  <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7 text-success" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    If an account with{" "}
                    <span className="font-medium text-foreground">
                      {resetEmail}
                    </span>{" "}
                    exists, password reset instructions will be sent.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setResetSubmitted(false);
                      setResetEmail("");
                      setResetError("");
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-5 mt-8">
                  {resetError && (
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {resetError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium text-sm transition-colors"
                  >
                    Send Reset Link
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setView("login");
                        setResetError("");
                      }}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-foreground text-center tracking-tight">
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
                      placeholder="••••••••"
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
                  <button
                    type="button"
                    onClick={() => setView("forgotPassword")}
                    className="text-sm text-accent hover:text-accent-hover bg-transparent border-none p-0 cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
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
          )}
        </div>
      </motion.div>
    </div>
  );
}