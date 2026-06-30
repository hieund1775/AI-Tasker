import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, X, Sun, Moon, Monitor } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "next-themes";

export function SignUpPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [role, setRole] = useState("client");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      setError("All fields are required.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const isSuccess = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role,
      });

      if (isSuccess) {
        alert(
          "Đăng ký thành công! Hệ thống sẽ chuyển bạn đến trang Đăng nhập.",
        );
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Ambient background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
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
              aria-label="Close and return to homepage"
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
            <h2 className="text-xl font-bold text-foreground tracking-tight">Create Account</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Join our platform today</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole("client");
                    setError("");
                  }}
                  className={`h-10 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                    role === "client"
                      ? "border-accent bg-accent/[0.06] text-accent shadow-sm"
                      : "border-border text-muted-foreground hover:border-accent/30 hover:text-foreground"
                  }`}
                >
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole("expert");
                    setError("");
                  }}
                  className={`h-10 rounded-lg border-2 font-medium text-sm transition-all duration-200 ${
                    role === "expert"
                      ? "border-accent bg-accent/[0.06] text-accent shadow-sm"
                      : "border-border text-muted-foreground hover:border-accent/30 hover:text-foreground"
                  }`}
                >
                  Expert
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setError("");
                }}
                className="w-full h-10 px-3.5 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50 transition-shadow"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
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
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    setError("");
                  }}
                  className="w-full h-10 px-3.5 pr-10 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50 transition-shadow"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-accent hover:text-accent-hover font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Demo hint — remove in production */}
          <div className="mt-4 p-3 bg-secondary/30 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-semibold">Demo:</span> Choose Client or Expert
              role above. Password must be 6+ characters.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}