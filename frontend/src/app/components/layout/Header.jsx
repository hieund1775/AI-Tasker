import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Menu, User, LogOut, Bell, Wallet, Search, Users, Briefcase } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { timeAgo } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Notifications — loaded from API when backend is connected.
// ---------------------------------------------------------------------------

async function getHeaderNotifications(_role) {
  try {
    const list = await api.notifications.getList();
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Header — top navigation bar for authenticated users.
 *
 * Provides marketplace-focused navigation with role-specific links:
 * - Client: Dashboard | Find Experts | My Projects | Messages
 * - Expert: Dashboard | Browse Jobs | My Proposals | Messages
 * - Admin/Owner: Dashboard | Manage
 *
 * Reads user & role from AuthContext (JWT), NOT from a prop or the URL.
 */
export function Header() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { role, isAuthenticated, logout } = useAuth();

  // Load notifications from API
  useEffect(() => {
    if (isAuthenticated) {
      getHeaderNotifications(role).then(setNotifications);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, role]);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // ── Role-specific nav links ──
  const navLinks = [];
  if (role === "client") {
    navLinks.push(
      { to: "/client/dashboard", label: "Dashboard" },
      { to: "/client/experts", label: "Find Experts", icon: Search },
      { to: "/client/my-projects", label: "My Projects", icon: Briefcase },
      { to: "/messenger", label: "Messages" },
    );
  } else if (role === "expert") {
    navLinks.push(
      { to: "/expert/dashboard", label: "Dashboard" },
      { to: "/expert/find-jobs", label: "Browse Jobs", icon: Briefcase },
      { to: "/expert/proposals", label: "My Proposals" },
      { to: "/messenger", label: "Messages" },
    );
  } else if (role === "admin" || role === "owner") {
    navLinks.push(
      { to: `/${role}/dashboard`, label: "Dashboard" },
      { to: `/${role}/users`, label: "Users", icon: Users },
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <span className="text-[20px] font-semibold text-blue-900 hidden sm:inline">
              Tasker
            </span>
          </Link>

          {/* ── Desktop Navigation ── */}
          {isAuthenticated && role && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* ── Right Side Controls ── */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <div className="relative flex items-center justify-center" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all relative ${
                      showNotifications ? "bg-gray-100 text-gray-900" : ""
                    }`}
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[8px] font-extrabold flex items-center justify-center border border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50">
                      <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 bg-white">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-xs font-medium text-slate-400">
                            No new notifications.
                          </div>
                        ) : (
                          notifications.map((noti) => {
                            const notifContent = (
                              <div
                                className={`p-4 flex items-start gap-3 transition-colors cursor-pointer relative ${
                                  noti.isUnread
                                    ? "bg-blue-50/30 hover:bg-blue-50/60"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                {noti.isUnread && (
                                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-gray-900 truncate">
                                    {noti.title}
                                  </h4>
                                  <p className="text-[11px] text-gray-500 font-medium leading-normal mt-0.5 break-words">
                                    {noti.description || noti.message}
                                  </p>
                                  <span className="text-[9px] font-bold text-gray-400 block mt-1">
                                    {noti.time || noti.createdAt || ""}
                                  </span>
                                </div>
                              </div>
                            );
                            const targetUrl = noti.targetUrl || noti.actionUrl;
                            if (targetUrl) {
                              return (
                                <Link
                                  key={noti.id}
                                  to={targetUrl}
                                  onClick={() => setShowNotifications(false)}
                                >
                                  {notifContent}
                                </Link>
                              );
                            }
                            return <div key={noti.id}>{notifContent}</div>;
                          })
                        )}
                      </div>

                      <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-semibold text-blue-900 hover:text-blue-700 transition-colors"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Wallet */}
                <Link
                  to={role === "client" ? "/client/billing" : `/${role}/wallet`}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  title="Wallet"
                >
                  <Wallet className="w-5 h-5" />
                </Link>

                {/* Profile */}
                <Link
                  to={`/${role}/profile`}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-900 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-5 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-semibold text-sm shadow-sm transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* ── Mobile Navigation ── */}
        {mobileMenuOpen && isAuthenticated && role && (
          <nav className="md:hidden border-t border-gray-100 py-3 pb-4">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-gray-100" />
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
