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
          color: "text-primary bg-primary-light",
        },
        {
          label: "Total Projects",
          value: dashboardStats.totalProjects ?? "—",
          icon: Briefcase,
          color: "text-success bg-success-light",
        },
        {
          label: "Total Revenue",
          value: dashboardStats.totalRevenue != null ? (
            <MoneyDisplay amount={dashboardStats.totalRevenue} />
          ) : (
            "—"
          ),
          icon: TrendingUp,
          color: "text-accent bg-accent-light",
        },
        {
          label: "Open Disputes",
          value: dashboardStats.totalDisputes ?? "—",
          icon: AlertTriangle,
          color: "text-warning bg-warning-light",
        },
      ]
    : [];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <>
      {/* Header */}
      <div className="relative bg-gradient-to-r from-warning/6 via-warning/3 to-primary/3 rounded-xl border border-border p-6 overflow-hidden">
        <div className="absolute inset-0 brand-neural opacity-15 pointer-events-none" />
        <div className="relative">
          <h1 className="page-title mb-1">Owner Dashboard</h1>
          <p className="page-subtitle">Platform overview and business metrics.</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Year / Month filters */}
      <div className="flex items-center gap-3">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
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
          className="px-4 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
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
        <DashboardStats stats={statCards} />
      )}

      {/* Charts */}
      <div className="space-y-6">
        {/* Chart 1: Monthly visits */}
        <ChartCard title="Monthly Visits (Client / Expert)">
          {loading ? (
            <div className="h-80 bg-secondary rounded-2xl animate-pulse" />
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
            <div className="h-80 bg-secondary rounded-2xl animate-pulse" />
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
            <div className="h-80 bg-secondary rounded-2xl animate-pulse" />
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
                  dataKey="Revenue"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* API note */}
      <div className="p-4 bg-primary-light border border-primary/20 rounded-xl text-sm text-primary">
        <strong>Note:</strong> Statistics and charts load from the backend
        through functions in <code>ownerService.js</code>.
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function ChartCard({ title, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <h3 className="section-header mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default OwnerDashboard;
