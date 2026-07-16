import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Lock, CheckCircle, X, ShieldAlert } from "lucide-react";
import { resetPassword } from "../../../services/authService";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token") || searchParams.get("resetToken");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token.trim()) {
      setError("Please enter the verification Token.");
      return;
    }

    if (!password) {
      setError("Please enter your new password.");
      return;
    }

    if (password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token.trim(), password);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. The token may be expired or invalid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 relative">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          aria-label="Close and return to homepage"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-base">AI</span>
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Tasker</span>
          </Link>
          <h2 className="text-xl font-bold text-foreground tracking-tight">Reset Password</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {submitted
              ? "Your password has been changed successfully."
              : "Enter the verification token and a new password to reset."}
          </p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Password has been reset successfully. You can use this new password to log in now.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go to Login Page
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Verification Token (Reset Token)</label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full h-10 px-4 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50"
                  placeholder="Enter token code received in Email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium text-sm transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {loading ? "Processing..." : "Reset Password"}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
