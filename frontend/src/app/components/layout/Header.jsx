import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { ChevronDown, Menu, User, LogOut, Bell, Wallet, X, Sun, Moon, Monitor } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useTheme } from "next-themes";
import { timeAgo } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Header — top navigation bar (modern SaaS style).
 *
 * Reads user & role from AuthContext (JWT), NOT from a prop or the URL.
 * Shows role-specific nav links, notification bell, profile link, and logout.
 */
export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const themeDropdownRef = useRef(null);
  const accountMenuRef = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const { role, isAuthenticated, logout, user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const getThemeIcon = () => {
    if (theme === "system") return <Monitor className="w-4.5 h-4.5 stroke-[1.8]" />;
    return resolvedTheme === "dark" ? (
      <Moon className="w-4.5 h-4.5 stroke-[1.8]" />
    ) : (
      <Sun className="w-4.5 h-4.5 stroke-[1.8]" />
    );
  };

  const getThemeLabel = () => {
    if (theme === "system") return "System";
    return resolvedTheme === "dark" ? "Dark" : "Light";
  };

  // Load notifications from API
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      let stopped = false;
      let retryAfter = 0;
      let loggedFailure = false;

      const loadNotifications = async () => {
        if (stopped || Date.now() < retryAfter) return;

        try {
          const data = await api.notifications.getList({ userId: user.id });
          if (!Array.isArray(data) || stopped) return;

          loggedFailure = false;
          retryAfter = 0;

          const mapped = data
            .filter((n) => n.id !== "8f3b2351-efc8-47bc-9b21-499387a2a014")
            .map((n) => ({
              id: n.id,
              title: n.title,
              description: n.message || n.description || n.content || "",
              time: timeAgo(n.createdAt),
              isUnread: !n.isRead,
              linkTo: n.linkTo || n.linkUrl || n.link || "",
              type: n.type,
            }));

          const pathParts = location.pathname.split("/");
          if (pathParts[1] === "messenger" && pathParts[2]) {
            const activeConvId = pathParts[2];
            setNotifications(mapped.filter((n) => n.linkTo !== `/messenger/${activeConvId}`));
          } else {
            setNotifications(mapped);
          }
        } catch (err) {
          if (stopped) return;
          setNotifications([]);
          retryAfter = Date.now() + 60000;

          if (!loggedFailure) {
            loggedFailure = true;
            console.warn("Notifications are temporarily unavailable. Retrying in 60 seconds.", err);
          }
        }
      };

      loadNotifications();
      const interval = setInterval(loadNotifications, 3000);

      const handleUpdate = () => {
        loadNotifications();
      };
      window.addEventListener("aitasker_db_update", handleUpdate);

      return () => {
        stopped = true;
        clearInterval(interval);
        window.removeEventListener("aitasker_db_update", handleUpdate);
      };
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, location.pathname]);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const roleMeta = {
    client: {
      label: "Client",
      context: "Client workspace",
      tone: "bg-accent-light text-accent border-accent/20",
      dot: "bg-accent",
    },
    expert: {
      label: "Expert",
      context: "Expert workspace",
      tone: "bg-success-light text-success border-success/20",
      dot: "bg-success",
    },
    admin: {
      label: "Admin",
      context: "Admin console",
      tone: "bg-warning-light text-warning border-warning/20",
      dot: "bg-warning",
    },
    staff: {
      label: "Staff",
      context: "Staff console",
      tone: "bg-warning-light text-warning border-warning/20",
      dot: "bg-warning",
    },
    owner: {
      label: "Owner",
      context: "Owner console",
      tone: "bg-primary-light text-primary border-primary/20",
      dot: "bg-primary",
    },
  };

  const currentRoleMeta = roleMeta[role] || null;
  const walletPath = role === "client" ? "/client/billing" : role === "expert" ? "/expert/wallet" : null;

  // Common nav link style
  const navLinkClass = "inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground";
  const activeNavClass = "inline-flex h-10 items-center rounded-xl bg-secondary px-3.5 text-sm font-semibold text-foreground shadow-inner shadow-foreground/[0.025]";

  return (
    <header className="bg-background/82 backdrop-blur-xl border-b border-border/70 sticky top-0 z-50 select-none shadow-sm shadow-foreground/[0.025]">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-sm">AI</span>
            </div>
            <span className="flex flex-col justify-center leading-none">
              <span className="text-lg font-semibold text-foreground tracking-tight">Tasker</span>
              {isAuthenticated && currentRoleMeta && (
                <span className="mt-1 hidden items-center gap-1.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  <span className={`h-1.5 w-1.5 rounded-full ${currentRoleMeta.dot}`} />
                  {currentRoleMeta.context}
                </span>
              )}
            </span>
          </Link>

          {/* Navigation Link Items — desktop only */}
          {isAuthenticated && role && (
            <nav className="hidden items-center gap-3 md:flex">
              {role !== "admin" && role !== "owner" && role !== "staff" && (
                <Link
                  to={`/${role}/dashboard`}
                  className={location.pathname === `/${role}/dashboard` ? activeNavClass : navLinkClass}
                >
                  Dashboard
                </Link>
              )}
              {role === "client" && (
                <Link
                  to="/client/experts"
                  className={location.pathname.startsWith("/client/experts") ? activeNavClass : navLinkClass}
                >
                  Find Experts
                </Link>
              )}
              {role === "expert" && (
                <Link
                  to="/expert/proposals"
                  className={location.pathname.startsWith("/expert/proposals") ? activeNavClass : navLinkClass}
                >
                  My Proposals
                </Link>
              )}
              {role !== "owner" && role !== "admin" && role !== "staff" && (
                <Link
                  to="/messenger"
                  className={location.pathname.startsWith("/messenger") ? activeNavClass : navLinkClass}
                >
                  Messages
                </Link>
              )}
            </nav>
          )}

          {/* Right Side Control Toolbar */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Theme Toggle Dropdown */}
                <div className="relative flex items-center justify-center" ref={themeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className={`p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex items-center justify-center ${
                      showThemeMenu ? "bg-secondary text-foreground" : ""
                    }`}
                    title={`Theme: ${getThemeLabel()}`}
                  >
                    {getThemeIcon()}
                  </button>

                  {showThemeMenu && (
                    <div className="absolute right-0 top-11 w-40 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
                      <div className="px-3 py-2 border-b border-border">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">
                          Theme
                        </span>
                      </div>
                      <div className="p-1">
                        {[
                          { mode: "light", icon: Sun, label: "Light" },
                          { mode: "dark", icon: Moon, label: "Dark" },
                          { mode: "system", icon: Monitor, label: "System" },
                        ].map(({ mode, icon: Icon, label }) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              setTheme(mode);
                              setShowThemeMenu(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                              theme === mode
                                ? "bg-accent-light text-accent font-medium"
                                : "text-foreground hover:bg-secondary"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                            {theme === mode && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notification Bell */}
                <div className="relative flex items-center justify-center" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all relative flex items-center justify-center ${
                      showNotifications ? "bg-secondary text-foreground" : ""
                    }`}
                  >
                    <Bell className="w-4.5 h-4.5 stroke-[1.8]" />

                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-accent text-primary-foreground rounded-full text-[9px] font-semibold flex items-center justify-center border border-background px-[3px]">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 top-11 w-80 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50 text-left animate-fade-in">
                      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-[0.04em]">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-xs text-muted-foreground">
                            No new notifications.
                          </div>
                        ) : (
                          notifications.slice(0, 4).map((noti) => (
                            <div
                              key={noti.id}
                              onClick={async () => {
                                try {
                                  await api.notifications.markRead(noti.id);
                                } catch (err) {
                                  console.error("Failed to mark notification as read:", err);
                                }
                                setShowNotifications(false);
                                if (noti.linkTo) navigate(noti.linkTo);
                              }}
                              className={`px-4 py-2.5 flex items-start gap-3 transition-colors cursor-pointer ${
                                noti.isUnread
                                  ? "bg-accent/[0.04] hover:bg-accent/[0.08]"
                                  : "hover:bg-secondary/50"
                              }`}
                            >
                              {noti.isUnread && (
                                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[13px] font-semibold text-foreground truncate">
                                  {noti.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {noti.description}
                                </p>
                                <span className="text-[10px] text-muted-foreground/60 block mt-1.5">
                                  {noti.time}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* View All link */}
                      <div className="p-3 border-t border-border bg-secondary/30 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-medium text-foreground hover:text-accent transition-colors"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Wallet shortcut */}
                {walletPath && (
                  <Link
                    to={walletPath}
                    className="relative flex items-center justify-center rounded-xl p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                    title={role === "client" ? "Billing & Wallet" : "Wallet"}
                    aria-label={role === "client" ? "Billing & Wallet" : "Wallet"}
                  >
                    <Wallet className="h-4.5 w-4.5 stroke-[1.8]" />
                  </Link>
                )}

                {/* Account Menu */}
                <div className="relative flex items-center justify-center" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className={`flex h-10 items-center gap-2 rounded-xl px-2.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground ${
                      showAccountMenu ? "bg-secondary text-foreground" : ""
                    }`}
                    title={currentRoleMeta ? currentRoleMeta.context : "Account"}
                    aria-label={currentRoleMeta ? currentRoleMeta.context : "Account"}
                    aria-expanded={showAccountMenu}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-card ring-1 ring-border">
                      <User className="h-4 w-4 stroke-[1.8]" />
                    </span>
                    <ChevronDown className={`hidden h-3.5 w-3.5 transition-transform sm:block ${showAccountMenu ? "rotate-180" : ""}`} />
                  </button>

                  {showAccountMenu && (
                    <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-fade-in">
                      <div className="border-b border-border px-4 py-3">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {user?.name || "Account"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {currentRoleMeta?.context || "Profile"}
                        </p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to={`/${role}/profile`}
                          onClick={() => setShowAccountMenu(false)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Profile</span>
                        </Link>
                      </div>
                      <div className="border-t border-border p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAccountMenu(false);
                            handleLogout();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive-light"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium text-sm transition-colors ml-1"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
