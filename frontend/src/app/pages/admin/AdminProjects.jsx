// =============================================================================
// AdminProjects — Project list management for Admin/Owner.
//
// Shows all platform projects with:
//   - Search by title
//   - Status filter
//   - View project detail
//   - Disputed projects clearly marked
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Search, Eye, Filter } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Project status config
// ---------------------------------------------------------------------------

const PROJECT_STATUS_CONFIG = {
  Active: { color: "bg-green-100 text-green-700", label: "Active" },
  Completed: { color: "bg-brand-primary-light text-brand-primary", label: "Completed" },
  Disputed: { color: "bg-red-100 text-red-700", label: "Disputed" },
  Stopped: { color: "bg-gray-100 text-gray-700", label: "Stopped" },
  Resolved: { color: "bg-purple-100 text-purple-700", label: "Resolved" },
  Draft: { color: "bg-yellow-100 text-yellow-700", label: "Draft" },
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Disputed", label: "Disputed" },
  { value: "Stopped", label: "Stopped" },
  { value: "Resolved", label: "Resolved" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const result = await api.projects.list(params);
      setProjects(Array.isArray(result) ? result : result?.data || []);
    } catch (err) {
      setError(err.message || "Unable to load project list.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const columns = [
    {
      key: "title",
      label: "Project",
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{val || "—"}</p>
          <p className="text-xs text-gray-500">
            {row.clientName || row.clientId
              ? `Client: ${row.clientName || row.clientId}`
              : `ID: ${row.id}`}
          </p>
        </div>
      ),
    },
    {
      key: "budget",
      label: "Budget",
      render: (val) => (
        <span className="text-sm font-medium">
          {val != null ? <MoneyDisplay amount={val} /> : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <StatusBadge
          status={val || "Active"}
          config={PROJECT_STATUS_CONFIG}
        />
      ),
    },
    {
      key: "expertName",
      label: "Expert",
      render: (val, row) => (
        <span className="text-sm text-gray-600">
          {val || row.expertId || "None"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (val) => (
        <span className="text-xs text-gray-500">
          {val ? formatDateTime(val) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/admin/dashboard" className="mb-4">
        Back to Dashboard
      </BackButton>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Management</h1>
      <p className="text-gray-600 mb-6">
        View and manage all platform projects.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project name..."
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

      <DataTable
        columns={columns}
        data={projects}
        loading={loading}
        emptyMessage="No projects found."
        actions={(row) => (
          <Link
            to={`/client/projects/${row.id}`}
            className="px-2.5 py-1.5 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover text-xs font-medium inline-flex items-center gap-1 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Link>
        )}
      />
    </div>
  );
}

export default AdminProjects;
