// =============================================================================
// AdminDashboard — Dashboard overview page for Admin/Owner.
//
// Shows platform stats and quick links to all management pages.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Users, Briefcase, AlertTriangle, TrendingUp } from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";
import { getReports } from "../../../services/reportService.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    openDisputes: 0,
    totalRevenue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    // Use a shorter timeout for dashboard stats so we don't wait too long
    // for endpoints that may not exist yet.
    const DASHBOARD_TIMEOUT = 3000;

    const results = await Promise.allSettled([
      api.users.list({ limit: "1", timeout: DASHBOARD_TIMEOUT }),
      api.projects.list({ limit: "1", timeout: DASHBOARD_TIMEOUT }),
      getReports({ status: "Pending" }),
    ]);

    const [usersSettled, projectsSettled, reportsSettled] = results;

    setStats({
      totalUsers:
        (usersSettled.status === "fulfilled" && usersSettled.value)
          ? usersSettled.value.total || usersSettled.value.data?.length || 0
          : 0,
      activeProjects:
        (projectsSettled.status === "fulfilled" && projectsSettled.value)
          ? projectsSettled.value.total || projectsSettled.value.data?.length || 0
          : 0,
      openDisputes:
        (reportsSettled.status === "fulfilled" && reportsSettled.value)
          ? reportsSettled.value.data?.length || reportsSettled.value.total || 0
          : 0,
      totalRevenue: 0, // TODO: add revenue API endpoint
    });

    // Only set error if ALL calls failed
    const allFailed = results.every((r) => r.status === "rejected");
    if (allFailed) {
      setError("Unable to load dashboard data. Please try again later.");
    }
  }, []);

  useEffect(() => {
    fetchStats().finally(() => setLoadingStats(false));
  }, [fetchStats]);

  // Static content renders immediately — only metric values show a loading
  // indicator when API data is still being fetched.

  const SkeletonValue = () => (
    <span className="inline-block h-6 w-12 bg-gray-200 rounded animate-pulse align-middle" />
  );

  const dashboardStats = [
    {
      label: "Total Users",
      value: loadingStats ? <SkeletonValue /> : stats.totalUsers,
      icon: Users,
      color: "text-blue-600 bg-blue-100",
      link: "/admin/users",
    },
    {
      label: "Active Projects",
      value: loadingStats ? <SkeletonValue /> : stats.activeProjects,
      icon: Briefcase,
      color: "text-green-600 bg-green-100",
      link: "/admin/projects",
    },
    {
      label: "Open Disputes",
      value: loadingStats ? <SkeletonValue /> : stats.openDisputes,
      icon: AlertTriangle,
      color: "text-orange-600 bg-orange-100",
      link: "/admin/disputes",
    },
    {
      label: "Total Revenue",
      value: loadingStats ? <SkeletonValue /> : <MoneyDisplay amount={stats.totalRevenue} />,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-100",
      link: "/admin/revenue",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Platform overview and key metrics.</p>

      {/* Error banner (non-blocking — page still renders) */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stat cards — show immediately with inline skeleton values while loading */}
      <DashboardStats
        stats={dashboardStats}
        columns="grid grid-cols-2 lg:grid-cols-4 gap-4"
        className="mb-8"
      />

      {/* Quick links — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "User Management", desc: "View, lock, or manage users", to: "/admin/users" },
          { label: "Dispute Resolution", desc: "Review and resolve dispute reports", to: "/admin/disputes" },
          { label: "Project Management", desc: "View all platform projects", to: "/admin/projects" },
          { label: "Review Management", desc: "Hide or delete violating reviews", to: "/admin/reviews" },
          { label: "Job Post Management", desc: "Manage violating service posts", to: "/admin/job-posts" },
          { label: "Skills & Categories", desc: "Manage platform skills and category tags", to: "/admin/category-tags" },
          { label: "Revenue Report", desc: "Track platform revenue and transactions", to: "/admin/revenue" },
        ].map((link, i) => (
          <Link
            key={i}
            to={link.to}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition block"
          >
            <h3 className="font-semibold text-gray-900">{link.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* API note */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <strong>Note:</strong> Statistics will update when backend APIs are complete.
        Currently displaying data from available APIs.
      </div>
    </div>
  );
}

export default AdminDashboard;
