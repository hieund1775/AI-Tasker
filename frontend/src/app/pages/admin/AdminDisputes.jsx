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
import { Search, Eye, Filter } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import { getReports } from "../../../services/reportService.js";

// ---------------------------------------------------------------------------
// Report status config for StatusBadge
// ---------------------------------------------------------------------------

const REPORT_STATUS_CONFIG = {
  "Pending Admin": { color: "bg-yellow-100 text-yellow-750 border border-yellow-250", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-amber-100 text-amber-750 border border-amber-250", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-blue-100 text-blue-750 border border-blue-250", label: "Awaiting Client" },
  Resolved: { color: "bg-green-100 text-green-750 border border-green-250", label: "Resolved" },
  Rejected: { color: "bg-red-100 text-red-750 border border-red-250", label: "Rejected" },
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
      setReports(result?.data || []);
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
        <span className="font-semibold text-gray-900 text-sm">{val || row.reportName || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <StatusBadge
          status={val || "Pending Admin"}
          config={REPORT_STATUS_CONFIG}
        />
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (val) => (
        <span className="text-sm font-medium text-gray-900">
          {val != null ? <MoneyDisplay amount={val} /> : "—"}
        </span>
      ),
    },
    {
      key: "reporter",
      label: "Reporter",
      render: (val, row) => {
        const isClientReporter = row.reporterRole === "client";
        return (
          <div>
            <p className="font-semibold text-gray-905 text-sm">
              {isClientReporter ? row.clientName : row.expertName}
            </p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              {isClientReporter ? "Khách hàng (Client)" : "Chuyên gia (Expert)"}
            </p>
            <p className="text-xs text-gray-500 italic mt-0.5 line-clamp-1" title={row.reason || row.description}>
              Lý do: {row.reason || row.description || "—"}
            </p>
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/admin/dashboard" className="mb-4">
        Back to Dashboard
      </BackButton>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Dispute Management</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Review and resolve dispute reports between Clients and Experts.
      </p>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by report name, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm appearance-none bg-white"
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
        emptyMessage="No dispute reports found."
        actions={(row) => (
          <Link
            to={`/admin/disputes/${row.id}`}
            className="px-3 py-1.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover text-xs font-medium inline-flex items-center gap-1.5 transition"
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
