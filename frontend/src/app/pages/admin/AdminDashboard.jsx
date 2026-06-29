// =============================================================================
// AdminDashboard — Dashboard overview page for Admin/Owner.
//
// Shows platform stats and quick links to all management pages.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Users, Briefcase, AlertTriangle, TrendingUp, Star, FileText, Tag, DollarSign, Ban } from "lucide-react";
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
    <span className="inline-block h-6 w-12 bg-secondary rounded animate-pulse align-middle" />
  );

  const dashboardStats = [
    {
      label: "Total Users",
      value: loadingStats ? <SkeletonValue /> : stats.totalUsers,
      icon: Users,
      color: "text-brand-primary bg-brand-primary-light",
      link: "/admin/users",
    },
    {
      label: "Active Projects",
      value: loadingStats ? <SkeletonValue /> : stats.activeProjects,
      icon: Briefcase,
      color: "text-success bg-success-light",
      link: "/admin/projects",
    },
    {
      label: "Open Disputes",
      value: loadingStats ? <SkeletonValue /> : stats.openDisputes,
      icon: AlertTriangle,
      color: "text-warning bg-warning-light",
      link: "/admin/disputes",
    },
    {
      label: "Total Revenue",
      value: loadingStats ? <SkeletonValue /> : <MoneyDisplay amount={stats.totalRevenue} />,
      icon: TrendingUp,
      color: "text-accent bg-accent-light",
      link: "/admin/revenue",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Branded Header */}
      <div className="relative bg-gradient-to-r from-accent/6 via-accent/3 to-primary/3 rounded-xl border border-border p-6 mb-8 overflow-hidden">
        <div className="absolute inset-0 brand-neural opacity-15 pointer-events-none" />
        <div className="relative">
          <h1 className="page-title mb-1">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and key metrics.</p>
        </div>
      </div>

      {/* Error banner (non-blocking — page still renders) */}
      {error && (
        <div className="mb-6 p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
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
          { label: "User Management", desc: "View, lock, or manage user accounts", to: "/admin/users", icon: Users, accent: "border-l-primary bg-primary-light/30" },
          { label: "Dispute Resolution", desc: "Review and resolve dispute reports", to: "/admin/disputes", icon: AlertTriangle, accent: "border-l-warning bg-warning-light/30" },
          { label: "Project Management", desc: "View and manage all platform projects", to: "/admin/projects", icon: Briefcase, accent: "border-l-success bg-success-light/30" },
          { label: "Review Management", desc: "Hide or delete violating reviews", to: "/admin/reviews", icon: Star, accent: "border-l-accent bg-accent-light/30" },
          { label: "Job Post Management", desc: "Manage violating service posts", to: "/admin/job-posts", icon: FileText, accent: "border-l-destructive bg-destructive-light/30" },
          { label: "Skills & Categories", desc: "Manage platform skills and category tags", to: "/admin/category-tags", icon: Tag, accent: "border-l-primary bg-primary-light/30" },
          { label: "Revenue Report", desc: "Track platform revenue and transactions", to: "/admin/revenue", icon: DollarSign, accent: "border-l-success bg-success-light/30" },
          { label: "Contract Cancellations", desc: "Review and manage contract cancellation requests", to: "/admin/contract-cancellations", icon: Ban, accent: "border-l-destructive bg-destructive-light/30" },
        ].map((link, i) => {
          const Icon = link.icon;
          return (
            <Link
              key={i}
              to={link.to}
              className={`group bg-card rounded-xl border border-border border-l-[3px] ${link.accent} p-5 shadow-sm hover:shadow-md transition-all duration-200 block hover:-translate-y-0.5 card-reveal card-reveal-${i + 1}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{link.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{link.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* API note */}
      <div className="p-4 bg-primary-light border border-primary/20 rounded-xl text-sm text-primary">
        <strong>Note:</strong> Statistics will update when backend APIs are complete.
        Currently displaying data from available APIs.
      </div>
    </div>
  );
}

export default AdminDashboard;
