import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Users, Briefcase, AlertTriangle, TrendingUp } from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      // TODO: Replace with API call — api.admin.getStats()
      // Raw data is null when backend is unavailable; use zero-fallback to avoid crash.
      const raw = null;
      const r = raw ?? {
        totalUsers: 0,
        openProjects: 0,
        disputesOpen: 0,
        completedProjects: 0,
        escrowHeld: 0,
        inProgressProjects: 0,
        disputesUnderReview: 0,
        platformRevenue: 0,
      };
      // Map recent activity logs (take the 5 most recent)
      const allUsers = [];
      const recentActivity = [...Array(5)]
        .map((_, i) => {
          const activities = [
            {
              id: "a1",
              message: `Total users on platform: ${r.totalUsers}`,
              time: "Now",
            },
            {
              id: "a2",
              message: `${r.openProjects} open projects awaiting experts`,
              time: "Now",
            },
            {
              id: "a3",
              message: `${r.disputesOpen} open disputes require attention`,
              time: "Now",
            },
            {
              id: "a4",
              message: `${r.completedProjects} projects completed successfully`,
              time: "Now",
            },
            {
              id: "a5",
              message: `Platform escrow balance: $${r.escrowHeld.toLocaleString()}`,
              time: "Now",
            },
          ];
          return activities[i] || null;
        })
        .filter(Boolean);

      setStats({
        totalUsers: r.totalUsers,
        activeProjects: r.inProgressProjects,
        openDisputes: r.disputesOpen + r.disputesUnderReview,
        totalRevenue: r.platformRevenue,
        recentActivity,
      });
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dashboardStats = stats
    ? [
        {
          label: "Total Users",
          value: stats.totalUsers,
          icon: Users,
          color: "text-blue-600 bg-blue-100",
          link: "/admin/users",
        },
        {
          label: "Active Projects",
          value: stats.activeProjects,
          icon: Briefcase,
          color: "text-green-600 bg-green-100",
        },
        {
          label: "Open Disputes",
          value: stats.openDisputes,
          icon: AlertTriangle,
          color: "text-orange-600 bg-orange-100",
          link: "/admin/disputes",
        },
        {
          label: "Total Revenue",
          value: <MoneyDisplay amount={stats.totalRevenue} />,
          icon: TrendingUp,
          color: "text-purple-600 bg-purple-100",
          link: "/admin/revenue",
        },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Platform overview and key metrics.</p>

      {/* Stat cards */}
      <DashboardStats
        stats={dashboardStats}
        columns="grid grid-cols-2 lg:grid-cols-4 gap-4"
        className="mb-8"
      />

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "User Management",
            desc: "View, suspend, or manage users",
            to: "/admin/users",
          },
          {
            label: "Dispute Resolution",
            desc: "Review and resolve open disputes",
            to: "/admin/disputes",
          },
          {
            label: "Revenue Report",
            desc: "Track platform revenue and transactions",
            to: "/admin/revenue",
          },
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

      {/* Recent activity */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y">
          {stats.recentActivity.map((a) => (
            <div
              key={a.id}
              className="p-4 px-6 flex items-center justify-between"
            >
              <p className="text-sm text-gray-700">{a.message}</p>
              <span className="text-xs text-gray-400">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
