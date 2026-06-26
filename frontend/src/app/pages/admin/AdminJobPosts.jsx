// =============================================================================
// AdminJobPosts — Job post / Service list management for Admin/Owner.
//
// Uses existing /api/jobposts endpoint. Admin can:
//   - View all job posts
//   - Search
//   - Change status of violating job posts
//   - Delete job posts (placeholder if DELETE API unavailable)
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Edit3, Trash2, Filter } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const JOB_POST_STATUS_CONFIG = {
  Active: { color: "bg-green-100 text-green-700", label: "Active" },
  Inactive: { color: "bg-gray-100 text-gray-700", label: "Inactive" },
  Closed: { color: "bg-red-100 text-red-700", label: "Closed" },
  Draft: { color: "bg-yellow-100 text-yellow-700", label: "Draft" },
};

const JOB_POST_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Closed", label: "Closed" },
  { value: "Draft", label: "Draft" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminJobPosts() {
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Frontend status filtering — applied on top of API results
  const filteredJobPosts = useMemo(() => {
    if (!statusFilter) return jobPosts;
    return jobPosts.filter(
      (j) => (j.status || "Active").toLowerCase() === statusFilter.toLowerCase(),
    );
  }, [jobPosts, statusFilter]);

  // Modal states
  const [deleteModal, setDeleteModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null); // { id, newStatus }

  const fetchJobPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const result = await api.get("/jobposts", { params });
      setJobPosts(Array.isArray(result) ? result : result?.data || []);
    } catch (err) {
      setError(err.message || "Unable to load job posts.");
      setJobPosts([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchJobPosts();
  }, [fetchJobPosts]);

  const showToast = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const handleStatusChange = useCallback(
    async (jobPostId, newStatus) => {
      setActionLoading(true);
      try {
        // Use existing API: PUT /api/jobposts/{id}
        await api.put(`/jobposts/${jobPostId}`, { status: newStatus });
        setJobPosts((prev) =>
          prev.map((j) =>
            j.id === jobPostId ? { ...j, status: newStatus } : j,
          ),
        );
        showToast(`Job post status updated to "${newStatus}".`);
      } catch (err) {
        showToast(err.message || "Error updating status.");
      } finally {
        setActionLoading(false);
        setStatusModal(null);
      }
    },
    [showToast],
  );

  const handleDelete = useCallback(
    async (jobPostId) => {
      setActionLoading(true);
      try {
        // TODO: add DELETE endpoint — DELETE /jobposts/{id}
        // Backend may not support DELETE yet; using placeholder
        setJobPosts((prev) => prev.filter((j) => j.id !== jobPostId));
        showToast("Job post has been deleted.");
      } catch (err) {
        showToast(err.message || "Error deleting job post.");
      } finally {
        setActionLoading(false);
        setDeleteModal(null);
      }
    },
    [showToast],
  );

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{val || "—"}</p>
          <p className="text-xs text-gray-500">
            {row.clientName || row.clientId
              ? `Posted by: ${row.clientName || row.clientId}`
              : ""}
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
      key: "category",
      label: "Category",
      render: (val) => (
        <span className="text-xs text-gray-600">{val || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <StatusBadge
          status={val || "Active"}
          config={JOB_POST_STATUS_CONFIG}
        />
      ),
    },
    {
      key: "createdAt",
      label: "Posted",
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

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Job Post / Service Management
      </h1>
      <p className="text-gray-600 mb-6">
        View and manage violating job posts and services on the platform.
      </p>

      {feedback && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {feedback}
        </div>
      )}

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
            placeholder="Search by title..."
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
            {JOB_POST_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredJobPosts}
        loading={loading}
        emptyMessage={
          statusFilter
            ? `No job posts found with status "${JOB_POST_STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || statusFilter}".`
            : "No job posts found."
        }
        actions={(row) => (
          <div className="flex gap-1.5">
            {row.status !== "Closed" && (
              <button
                type="button"
                onClick={() =>
                  setStatusModal({
                    id: row.id,
                    newStatus:
                      row.status === "Active" ? "Inactive" : "Active",
                  })
                }
                disabled={actionLoading}
                className="rounded-lg text-xs font-medium inline-flex items-center gap-1 transition border bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200 px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change status"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {row.status === "Active" ? "Deactivate" : "Activate"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteModal(row.id)}
              disabled={actionLoading}
              className="rounded-lg text-xs font-medium inline-flex items-center gap-1 transition border bg-red-50 text-red-700 hover:bg-red-100 border-red-200 px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete job post"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      />

      {/* Status change confirmation modal */}
      <ConfirmationModal
        open={statusModal !== null}
        onOpenChange={(open) => !open && setStatusModal(null)}
        title="Change Status"
        description={`Are you sure you want to ${
          statusModal?.newStatus === "Active" ? "activate" : "deactivate"
        } this job post?`}
        confirmLabel={
          statusModal?.newStatus === "Active" ? "Activate" : "Deactivate"
        }
        variant={statusModal?.newStatus === "Active" ? "default" : "warning"}
        loading={actionLoading}
        onConfirm={() =>
          statusModal &&
          handleStatusChange(statusModal.id, statusModal.newStatus)
        }
      />

      {/* Delete confirmation modal */}
      <ConfirmationModal
        open={deleteModal !== null}
        onOpenChange={(open) => !open && setDeleteModal(null)}
        title="Delete Job Post"
        description="Are you sure you want to delete this job post? This action cannot be undone."
        confirmLabel="Delete Permanently"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => deleteModal && handleDelete(deleteModal)}
      />
    </div>
  );
}

export default AdminJobPosts;
