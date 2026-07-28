import { Outlet, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { AlertTriangle, LogOut } from "lucide-react";
import { Header } from "./Header.jsx";
import { Footer } from "./Footer.jsx";
import { useAuth } from "../../hooks/useAuth.js";

/**
 * RootLayout — shell that wraps authenticated routes with Header + Footer.
 *
 * Real-time Ban Event Engine (Lightweight & Event-Driven):
 *   - Listens to ban events via localStorage / custom window events (NO background polling).
 *   - Displays a 10-second countdown modal before auto-logging out.
 */
export function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const [bannedNotification, setBannedNotification] = useState(null);
  const countdownTimerRef = useRef(null);
  const isEvictingRef = useRef(false);

  const executeImmediateLogout = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setBannedNotification(null);
    isEvictingRef.current = false;
    try {
      localStorage.removeItem("aitasker_user_banned");
    } catch (e) {}
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const triggerBanCountdown = useCallback(() => {
    if (isEvictingRef.current) return;
    isEvictingRef.current = true;

    let timeLeft = 10;
    setBannedNotification({ countdown: timeLeft });

    countdownTimerRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        executeImmediateLogout();
      } else {
        setBannedNotification({ countdown: timeLeft });
      }
    }, 1000);
  }, [executeImmediateLogout]);

  // Event-driven ban listener (No background API polling)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const checkBanStatus = () => {
      if (isEvictingRef.current) return;

      try {
        const bannedDataStr = localStorage.getItem("aitasker_user_banned");
        if (bannedDataStr) {
          const bannedObj = JSON.parse(bannedDataStr);
          const bannedId = String(bannedObj.userId || bannedObj.id || "").toLowerCase();
          const currentId = String(user.id || user.Id || "").toLowerCase();
          if (bannedId === currentId) {
            triggerBanCountdown();
          }
        }
      } catch (e) {}
    };

    checkBanStatus();

    const handleSync = () => checkBanStatus();
    const handleUnauthorized = () => {
      if (!isEvictingRef.current) {
        triggerBanCountdown();
      }
    };

    window.addEventListener("aitasker_db_update", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("aitasker_db_update", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [user, isAuthenticated, triggerBanCountdown]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // Hide header/footer on standalone auth pages
  const hideHeaderFooter = ["/login", "/signup"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col relative w-full max-w-[100vw] overflow-x-hidden">
      {/* Sleek Minimalist 10-Second Banned Notification Modal */}
      {bannedNotification && (
        <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full shadow-xl text-center space-y-4"
          >
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Account Suspended</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your account has been locked by an administrator. You will be logged out in:
              </p>
            </div>

            {/* Countdown timer & progress bar */}
            <div className="space-y-1.5 py-1">
              <span className="text-2xl font-bold text-red-600 tracking-wider">
                {bannedNotification.countdown}s
              </span>
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-600 h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(bannedNotification.countdown / 10) * 100}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={executeImmediateLogout}
              className="w-full py-2 px-3 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out Now
            </button>
          </motion.div>
        </div>
      )}

      {!hideHeaderFooter && <Header />}
      <main className="flex-1 w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

export default RootLayout;
