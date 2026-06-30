// =============================================================================
// AdminDisputes — Dispute report list page for Admin/Owner.
//
// Shows all dispute reports with:
//   - Status filter (Pending, Accepted, Rejected, Under Review, Resolved, Closed)
//   - Search
//   - View detail button -> /admin/disputes/:id
//   - Status badge per report
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Search, Eye, Filter, AlertTriangle, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import { getReports } from "../../../services/reportService.js";
import { PageHeader } from "../../components/shared/PageHeader.jsx";

// ---------------------------------------------------------------------------
// Report status config for StatusBadge
// ---------------------------------------------------------------------------

const REPORT_STATUS_CONFIG = {
  "Pending Admin": { color: "bg-yellow-100 text-yellow-700 border border-yellow-200", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-amber-100 text-amber-700 border border-amber-200", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-secondary text-secondary-foreground border border-border", label: "Awaiting Client" },
  Resolved: { color: "bg-green-100 text-green-700 border border-green-200", label: "Resolved" },
  Rejected: { color: "bg-red-100 text-red-700 border border-red-200", label: "Rejected" },
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Pending Admin", label: "Pending Admin" },
  { value: "Awaiting Expert", label: "Awaiting Expert" },
  { value: "Awaiting Client", label: "Awaiting Client" },
  { value: "Resolved", label: "Resolved" },
  { value: "Rejected", label: "Rejected" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDisputes() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const result = await getReports(params);
      const data = result?.data || [];
      const sorted = [...data].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.submittedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      setReports(sorted);
    } catch (err) {
      setError(err.message || "Unable to load reports.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const columns = [
    {
      key: "projectTitle",
      label: "Project Name",
      render: (val, row) => (
        <span className="font-semibold text-foreground text-sm">{val || row.reportName || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Loại báo cáo",
      render: (val, row) => {
        const reportTypes = {
          financial: "Báo cáo tài chính",
          communication: "Báo cáo trao đổi",
          quality: "Báo cáo chất lượng",
          deadline: "Báo cáo tiến độ",
          other: "Báo cáo khác",
          cancellation: "Báo cáo hủy dự án",
        };
        const label = reportTypes[row.disputeType] || "Báo cáo tiến độ";
        const colors = {
          financial: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
          communication: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
          quality: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800",
          deadline: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
          other: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
          cancellation: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800",
        };
        const badgeClass = colors[row.disputeType] || colors.other;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: "reporter",
      label: "Reporter",
      render: (val, row) => {
        const isClientReporter = row.reporterRole === "client";
        return (
          <span className="font-semibold text-foreground text-sm">
            {isClientReporter ? row.clientName : row.expertName}
          </span>
        );
      },
    },
    {
      key: "accused",
      label: "Accused",
      render: (val, row) => {
        const isClientReporter = row.reporterRole === "client";
        return (
          <span className="font-semibold text-foreground text-sm">
            {isClientReporter ? row.expertName : row.clientName}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Thời gian gửi báo cáo",
      render: (val) => (
        <span className="text-xs font-medium text-muted-foreground">
          {val ? formatDateTime(val) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Report Progress"
        subtitle="Review and track progress reports between Clients and Experts."
      />

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats summary */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{reports.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Reports</p>
          </div>
          <div className="bg-card rounded-xl border border-yellow-200 dark:border-yellow-800 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {reports.filter(r => r.status === "Pending Admin" || r.status === "Awaiting Expert" || r.status === "Awaiting Client").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </div>
          <div className="bg-card rounded-xl border border-green-200 dark:border-green-800 p-4 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {reports.filter(r => r.status === "Resolved").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Resolved</p>
          </div>
          <div className="bg-card rounded-xl border border-red-200 dark:border-red-800 p-4 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {reports.filter(r => r.status === "Rejected").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Rejected</p>
          </div>
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by report name, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm appearance-none bg-card"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        emptyMessage="No progress reports found."
        actions={(row) => (
          <Link
            to={`/admin/disputes/${row.id}`}
            className="px-3 py-1.5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-xs font-medium inline-flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            View Detail
          </Link>
        )}
      />
    </div>
  );
}

export default AdminDisputes;
