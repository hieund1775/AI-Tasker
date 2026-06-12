// =============================================================================
// OwnerDashboard — Statistics dashboard for Owner role.
//
// Charts:
//   - Monthly Client/Expert visits (bar chart)
//   - Total posts in the year (bar chart)
//   - Total money transferred from Clients to Experts (bar chart)
//
// Filters:
//   - Month selector
//   - Year selector
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, Briefcase, TrendingUp, AlertTriangle, Shield, ShieldCheck, FileText, Star, Tag } from "lucide-react";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import {
  getOwnerDashboardStats,
  getMonthlyTrafficStats,
  getYearlyPostStats,
  getTotalPaymentStats,
} from "../../../services/ownerService.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Data state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [trafficData, setTrafficData] = useState([]);
  const [postData, setPostData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);

  // -----------------------------------------------------------------------
  // Fetch all data — uses Promise.allSettled so one failing API doesn't
  // block the others, and the page always renders with fallback values.
  // -----------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getOwnerDashboardStats({ year: selectedYear, month: selectedMonth }),
      getMonthlyTrafficStats({ year: selectedYear }),
      getYearlyPostStats({ year: selectedYear }),
      getTotalPaymentStats({ year: selectedYear }),
    ]);

    const [statsResult, trafficResult, postsResult, paymentsResult] = results;

    // Stats
    const stats =
      statsResult.status === "fulfilled" ? statsResult.value : null;
    setDashboardStats(stats);

    // Traffic chart data
    const traffic =
      trafficResult.status === "fulfilled" ? trafficResult.value : null;
    if (traffic?.months?.length) {
      setTrafficData(
        traffic.months.map((m, i) => ({
          month: m,
          Client: traffic.clientVisits?.[i] || 0,
          Expert: traffic.expertVisits?.[i] || 0,
        })),
      );
    } else {
      setTrafficData(MONTHS.map((m) => ({ month: m, Client: 0, Expert: 0 })));
    }

    // Post chart data
    const posts =
      postsResult.status === "fulfilled" ? postsResult.value : null;
    if (posts?.years?.length) {
      setPostData(
        posts.years.map((y, i) => ({
          year: String(y),
          Posts: posts.postCounts?.[i] || 0,
        })),
      );
    } else {
      setPostData(YEAR_OPTIONS.map((y) => ({ year: String(y), Posts: 0 })));
    }

    // Payment chart data
    const payments =
      paymentsResult.status === "fulfilled" ? paymentsResult.value : null;
    if (payments?.labels?.length) {
      setPaymentData(
        payments.labels.map((l, i) => ({
          month: l,
          Amount: payments.amounts?.[i] || 0,
        })),
      );
    } else {
      setPaymentData(MONTHS.map((m) => ({ month: m, Amount: 0 })));
    }

    // Only show error if ALL calls failed
    const allFailed = results.every((r) => r.status === "rejected");
    if (allFailed) {
      setError("Unable to load statistics data. Please try again later.");
    }
    setLoading(false);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Stat cards
  // -----------------------------------------------------------------------
  const statCards = dashboardStats
    ? [
        {
          label: "Total Users",
          value: dashboardStats.totalUsers ?? "—",
          icon: Users,
          color: "text-blue-600 bg-blue-100",
        },
        {
          label: "Total Projects",
          value: dashboardStats.totalProjects ?? "—",
          icon: Briefcase,
          color: "text-green-600 bg-green-100",
        },
        {
          label: "Total Revenue",
          value: dashboardStats.totalRevenue != null ? (
            <MoneyDisplay amount={dashboardStats.totalRevenue} />
          ) : (
            "—"
          ),
          icon: TrendingUp,
          color: "text-purple-600 bg-purple-100",
        },
        {
          label: "Open Disputes",
          value: dashboardStats.totalDisputes ?? "—",
          icon: AlertTriangle,
          color: "text-orange-600 bg-orange-100",
        },
      ]
    : [];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
          Owner
        </span>
      </div>
      <p className="text-gray-600 mb-6">
        Platform overview statistics for Owner.
      </p>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Create Admin",
            desc: "Add a new Admin account",
            to: "/owner/create-admin",
            icon: Shield,
            color: "bg-red-100 text-red-600",
          },
          {
            label: "Manage Admins",
            desc: "View, lock, or unlock Admins",
            to: "/owner/manage-admins",
            icon: ShieldCheck,
            color: "bg-amber-100 text-amber-600",
          },
          {
            label: "Manage Users",
            desc: "View and manage all platform users",
            to: "/owner/users",
            icon: Users,
            color: "bg-blue-100 text-blue-600",
          },
          {
            label: "Manage Reports",
            desc: "Review and resolve dispute reports",
            to: "/owner/reports",
            icon: AlertTriangle,
            color: "bg-orange-100 text-orange-600",
          },
          {
            label: "Manage Projects",
            desc: "View and control all projects",
            to: "/owner/projects",
            icon: Briefcase,
            color: "bg-green-100 text-green-600",
          },
          {
            label: "Manage Reviews",
            desc: "Hide or delete violating reviews",
            to: "/owner/reviews",
            icon: Star,
            color: "bg-purple-100 text-purple-600",
          },
          {
            label: "Manage Job Posts",
            desc: "Manage platform job posts/services",
            to: "/owner/job-posts",
            icon: FileText,
            color: "bg-teal-100 text-teal-600",
          },
          {
            label: "Categories/Skills",
            desc: "Manage platform skills and categories",
            to: "/owner/category-tags",
            icon: Tag,
            color: "bg-indigo-100 text-indigo-600",
          },
        ].map((card, i) => (
          <Link
            key={i}
            to={card.to}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition flex items-start gap-4 group"
          >
            <div
              className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center flex-shrink-0`}
            >
              <card.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-900 transition-colors">
                {card.label}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Year / Month filters */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-900 bg-white"
          disabled={loading}
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-900 bg-white"
          disabled={loading}
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      {statCards.length > 0 && (
        <DashboardStats stats={statCards} className="mb-8" />
      )}

      {/* Charts — always render cards; show inline skeleton while loading */}
      <div className="space-y-6">
        {/* Chart 1: Monthly visits */}
        <ChartCard title="Monthly Visits (Client / Expert)">
          {loading ? (
            <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Client" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expert" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 2: Total posts in year */}
        <ChartCard title={`Total Posts in ${selectedYear}`}>
          {loading ? (
            <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={postData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="Posts"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Chart 3: Total money transferred */}
        <ChartCard title="Total Money Clients Transferred to Experts">
          {loading ? (
            <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "VND",
                    }).format(value),
                    "Amount",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="Amount"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Note about API readiness */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <strong>Note:</strong> Chart data currently displays default values (0).
        When backend APIs are complete, real data will automatically display
        through functions in <code>ownerService.js</code>.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default OwnerDashboard;
