// =============================================================================
// AdminDisputes - Dispute report list page for Admin/Owner.
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
  "Pending Admin": { color: "bg-warning-light text-warning border border-warning/20", label: "Pending Admin" },
  Pending: { color: "bg-warning-light text-warning border border-warning/20", label: "Pending Admin" },
  "Awaiting Expert": { color: "bg-warning-light text-warning border border-warning/20", label: "Awaiting Expert" },
  "Awaiting Client": { color: "bg-secondary text-secondary-foreground border border-border", label: "Awaiting Client" },
  "Awaiting Partner": { color: "bg-warning-light text-warning border border-warning/20", label: "Awaiting Partner" },
  "Awaiting Evidence": { color: "bg-warning-light text-warning border border-warning/20", label: "Awaiting Evidence" },
  "Awaiting Both": { color: "bg-warning-light text-warning border border-warning/20", label: "Awaiting Both" },
  Returned: { color: "bg-destructive-light text-destructive border border-destructive/20", label: "Returned" },
  Resolved: { color: "bg-success-light text-success border border-success/20", label: "Resolved" },
  Accepted: { color: "bg-success-light text-success border border-success/20", label: "Resolved" },
  cancel_done: { color: "bg-success-light text-success border border-success/20", label: "Resolved" },
  Rejected: { color: "bg-destructive-light text-destructive border border-destructive/20", label: "Rejected" },
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Pending", label: "Pending Admin" },
  { value: "Awaiting Expert", label: "Awaiting Expert" },
  { value: "Awaiting Client", label: "Awaiting Client" },
  { value: "Awaiting Partner", label: "Awaiting Partner" },
  { value: "Awaiting Evidence", label: "Awaiting Evidence" },
  { value: "Awaiting Both", label: "Awaiting Both" },
  { value: "Returned", label: "Returned" },
  {
    value: "Resolved",
    label: "Resolved",
    values: ["Resolved", "Accepted", "cancel_done"],
  },
  { value: "Rejected", label: "Rejected" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDisputes() {
  const [allReports, setAllReports] = useState([]);
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
      const result = await getReports();
      const data = result?.data || [];
      const sorted = [...data].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.submittedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.submittedAt || 0).getTime();
        return timeB - timeA;
      });
      setAllReports(sorted);
      setReports(sorted);
    } catch (err) {
      setError(err.message || "Unable to load reports.");
      setAllReports([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    const handleUpdate = () => fetchReports();
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => window.removeEventListener("aitasker_db_update", handleUpdate);
  }, [fetchReports]);

  // Apply filters locally whenever search/status/allReports change
  useEffect(() => {
    let filtered = [...allReports];
    if (statusFilter) {
      filtered = filtered.filter(r => {
        const status = r.status || "";
        if (statusFilter === "Pending") {
          return status === "Pending" || status === "Pending Admin";
        }
        const option = STATUS_OPTIONS.find((opt) => opt.value === statusFilter);
        const acceptedValues = option?.values?.length ? option.values : [statusFilter];
        return acceptedValues.some((value) => status.toLowerCase() === String(value).toLowerCase());
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.projectTitle && r.projectTitle.toLowerCase().includes(term)) ||
        (r.reportName && r.reportName.toLowerCase().includes(term)) ||
        (r.reason && r.reason.toLowerCase().includes(term)) ||
        (r.id && r.id.toLowerCase().includes(term))
      );
    }
    setReports(filtered);
  }, [statusFilter, searchTerm, allReports]);

  const columns = [
    {
      key: "projectTitle",
      label: "Project Name",
      render: (val, row) => (
        <span className="font-semibold text-foreground text-sm">{val || row.reportName || "-"}</span>
      ),
    },
    {
      key: "disputeType",
      label: "Dispute Type",
      filterOptions: [
        { value: "financial", label: "Financial Dispute" },
        { value: "cancellation", label: "Cancellation Request" },
        { value: "quality", label: "Quality Dispute" },
        { value: "deadline", label: "Deadline Delay" },
        { value: "communication", label: "Communication Issue" },
        { value: "other", label: "Other" },
      ],
      render: (val, row) => {
        const reportTypes = {
          financial: "Financial Dispute",
          communication: "Communication Issue",
          quality: "Quality Dispute",
          deadline: "Deadline Delay",
          other: "Other",
          cancellation: "Cancellation Request",
        };
        const disputeKey = row.disputeType || val || "other";
        const label = reportTypes[disputeKey] || disputeKey;
        const colors = {
          financial: "bg-success-light text-success border-success/20 dark:bg-success-light dark:text-success dark:border-success/30",
          communication: "bg-accent-light text-accent border-accent/25 dark:bg-accent-light dark:text-accent dark:border-accent/30",
          quality: "bg-warning-light text-warning border-warning/30 dark:bg-warning-light dark:text-warning dark:border-warning/30",
          deadline: "bg-warning-light text-warning border-warning/20 dark:bg-warning-light dark:text-warning dark:border-warning/30",
          other: "bg-secondary text-foreground border-border dark:bg-secondary dark:text-muted-foreground dark:border-border",
          cancellation: "bg-destructive-light text-destructive border-destructive/20 dark:bg-destructive-light dark:text-destructive dark:border-destructive/30",
        };
        const badgeClass = colors[disputeKey] || colors.other;
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
      key: "amount",
      label: "Escrow Amount",
      render: (val, row) => (
        <span className="font-semibold text-brand-primary text-sm">
          <MoneyDisplay amount={row.escrowAmount || row.amount || 0} />
        </span>
      ),
    },
    {
      key: "actualStatus",
      label: "Status",
      render: (val, row) => (
        <StatusBadge status={row.status} config={REPORT_STATUS_CONFIG} />
      ),
    },
    {
      key: "createdAt",
      label: "Report Time",
      render: (val) => (
        <span className="text-xs font-medium text-muted-foreground">
          {val ? formatDateTime(val) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Progress"
        subtitle="Review and track progress reports between Clients and Experts."
      />

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats summary */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">{allReports.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Reports</p>
          </div>
          <div className="bg-card rounded-xl border border-warning/20 dark:border-warning/30 p-4 text-center">
            <p className="text-2xl font-semibold text-warning dark:text-warning">
              {allReports.filter(r => r.status === "Pending" || r.status === "Pending Admin" || r.status === "Awaiting Expert" || r.status === "Awaiting Client" || r.status === "Awaiting Evidence" || r.status === "Awaiting Both" || r.status === "Awaiting Partner").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </div>
          <div className="bg-card rounded-xl border border-success/20 dark:border-success/30 p-4 text-center">
            <p className="text-2xl font-semibold text-success dark:text-success">
              {allReports.filter(r => r.status === "Resolved" || r.status === "Accepted" || r.status === "cancel_done").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Resolved</p>
          </div>
          <div className="bg-card rounded-xl border border-destructive/20 dark:border-destructive/30 p-4 text-center">
            <p className="text-2xl font-semibold text-destructive dark:text-destructive">
              {allReports.filter(r => r.status === "Rejected").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Rejected</p>
          </div>
        </div>
      )}

      {/* Filter row */}
      <div className="page-filter-toolbar">
        <div className="page-filter-search">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by report name, project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-input-background pl-9 pr-4 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          />
        </div>
        <div className="page-filter-controls">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-xl border border-input bg-card pl-9 pr-4 text-sm appearance-none focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
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
            to={`${window.location.pathname.startsWith("/owner") ? "/owner" : "/admin"}/disputes/${row.id}`}
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
