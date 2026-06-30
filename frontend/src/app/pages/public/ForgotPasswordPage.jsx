import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Mail, CheckCircle, X } from "lucide-react";

/**
 * ForgotPasswordPage — password reset request screen.
 * TODO: Connect to backend API for email sending.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    // TODO: POST /api/auth/forgot-password
    setSubmitted(true);
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
          <h2 className="text-xl font-bold text-foreground tracking-tight">Forgot Password</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {submitted
              ? "Check your email for reset instructions."
              : "Enter your email to receive a password reset link."}
          </p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              If an account with <span className="font-medium text-foreground">{email}</span> exists,
              password reset instructions will be sent.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
