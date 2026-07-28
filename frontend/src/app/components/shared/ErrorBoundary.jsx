import { Component } from "react";
import { AlertTriangle, RefreshCw, Home, LayoutDashboard } from "lucide-react";

// =============================================================================
// ErrorBoundary — global error boundary that catches render errors and shows
// a professional fallback UI instead of a white screen or stack trace.
//
// In development mode (import.meta.env.DEV), the error message is shown.
// In production, only a generic message is displayed.
// =============================================================================

/**
 * Try to determine the user's dashboard path from stored auth data.
 * Falls back to "/" if no role can be determined.
 */
function getDashboardPath() {
  try {
    const stored = sessionStorage.getItem("authUser") || localStorage.getItem("authUser");
    if (stored) {
      const user = JSON.parse(stored);
      const role = user?.role;
      if (role === "client") return "/client/dashboard";
      if (role === "expert") return "/expert/dashboard";
      if (role === "admin") return "/admin/dashboard";
      if (role === "owner") return "/owner/dashboard";
    }
  } catch {
    // Ignore parse errors
  }
  return "/";
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught render error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = getDashboardPath();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-card rounded-xl border border-border shadow-sm p-8 text-center animate-fade-in">
            {/* Icon */}
            <div className="w-16 h-16 bg-destructive-light rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-2 max-w-sm mx-auto">
              An unexpected error occurred while rendering this page. This is
              likely a temporary issue.
            </p>
            <p className="text-xs text-muted-foreground/70 mb-6">
              Your data and account are safe. You can try again or return home.
            </p>

            {/* Dev-only error detail */}
            {isDev && this.state.error && (
              <div className="mb-6 p-3 bg-muted rounded-lg border border-border text-left max-h-32 overflow-y-auto">
                <p className="text-xs font-mono text-destructive break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={this.handleRetry}
                className="h-10 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover text-sm font-medium inline-flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="h-10 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover text-sm font-medium inline-flex items-center gap-2 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="h-10 px-4 border border-border text-foreground rounded-lg hover:bg-secondary text-sm font-medium inline-flex items-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
