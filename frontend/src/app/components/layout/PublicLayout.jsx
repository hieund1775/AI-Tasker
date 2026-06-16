import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { Link } from "react-router";
import { Search, Briefcase, Users, Award, CheckCircle2 } from "lucide-react";
import { Footer } from "./Footer.jsx";
import api from "../../../services/api.js";

/**
 * PublicLayout — minimal shell for public-facing browse pages.
 *
 * Provides a simple navbar with links to Browse Experts and Browse Jobs,
 * a platform stats banner, plus the shared Footer. Used for routes that
 * should be accessible without authentication.
 */
export function PublicLayout() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.get("/platform/stats", { authenticated: false });
        setStats(data);
      } catch {
        // Graceful fallback — stats banner hidden if API unavailable
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <span className="text-[20px] font-semibold text-blue-900 hidden sm:inline">
                Tasker
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/experts"
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                Browse Experts
              </Link>
              <Link
                to="/jobs"
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                Browse Jobs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
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
          </div>
        </div>

        {/* Platform Stats Banner */}
        {stats && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-blue-100/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-8 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-gray-900">
                  {(stats.totalExperts ?? 0).toLocaleString()}
                </span>{" "}
                Experts
              </span>
              <span className="text-gray-300">|</span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-semibold text-gray-900">
                  {(stats.totalOpenJobs ?? 0).toLocaleString()}
                </span>{" "}
                Open Jobs
              </span>
              <span className="text-gray-300">|</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="font-semibold text-gray-900">
                  {(stats.totalCompletedProjects ?? 0).toLocaleString()}
                </span>{" "}
                Completed
              </span>
            </div>
          </div>
        )}
      </nav>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
