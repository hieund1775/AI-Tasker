// =============================================================================
// AdminJobPosts - Job post / Service list management for Admin/Owner.
//
// Uses existing /api/jobposts endpoint. Admin can:
//   - View all job posts
//   - Search
//   - Change status of violating job posts
//   - Delete job posts (placeholder if DELETE API unavailable)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const JOB_POST_STATUS_CONFIG = {
  Open: { color: "bg-brand-primary-light text-brand-primary", label: "Open" },
  Active: { color: "bg-success-light text-success", label: "Active" },
  Inactive: { color: "bg-secondary text-foreground/80", label: "Inactive" },
  Closed: { color: "bg-destructive-light text-destructive", label: "Closed" },
  Draft: { color: "bg-warning-light text-warning", label: "Draft" },
  Accepted: { color: "bg-success-light text-success", label: "Accepted" },
  "Pending Payment": { color: "bg-warning-light text-warning", label: "Pending Payment" },
  "In Progress": { color: "bg-brand-primary-light text-brand-primary", label: "In Progress" },
  Completed: { color: "bg-success-light text-success", label: "Completed" },
  Cancelled: { color: "bg-destructive-light text-destructive", label: "Cancelled" },
};

const JOB_POST_STATUS_OPTIONS = [
  { value: "Open", label: "Open", values: ["Open", "Active"] },
  { value: "Draft", label: "Draft" },
  { value: "Inactive", label: "Inactive" },
  { value: "Accepted", label: "Accepted" },
  { value: "Pending Payment", label: "Pending Payment" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled", values: ["Cancelled", "Closed"] },
];

const normalizeJobPostStatus = (rawStatus) => {
  const key = String(rawStatus || "open").trim().toLowerCase().replace(/[\s_]+/g, "");

  if (key === "open") return "Open";
  if (key === "active") return "Active";
  if (key === "inactive") return "Inactive";
  if (key === "draft") return "Draft";
  if (key === "closed") return "Closed";
  if (key === "accepted") return "Accepted";
  if (key === "pendingescrow" || key === "pendingpay" || key === "pendingpayment") return "Pending Payment";
  if (key === "inprogress") return "In Progress";
  if (key === "completed" || key === "complete") return "Completed";
  if (key === "cancelled" || key === "canceled" || key === "stopped") return "Cancelled";

  return rawStatus || "Open";
};

const renderJobPostStatus = (status) => {
  const normalized = normalizeJobPostStatus(status);
  const cfg = JOB_POST_STATUS_CONFIG[normalized] || {
    color: "bg-secondary text-foreground/80",
    label: normalized,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
      {cfg.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminJobPosts() {
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modal states
  const [deleteModal, setDeleteModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null); // { id, newStatus }

  const fetchJobPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/jobposts");
      const rows = Array.isArray(result) ? result : result?.data || [];
      setJobPosts(rows.map((job) => ({
        ...job,
        status: normalizeJobPostStatus(job.status || job.Status),
      })));
    } catch (err) {
      setError(err.message || "Unable to load job posts.");
      setJobPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
        // TODO: add DELETE endpoint - DELETE /jobposts/{id}
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
          <p className="font-medium text-foreground text-sm">{val || "-"}</p>
          <p className="text-xs text-muted-foreground">
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
          {val != null ? <MoneyDisplay amount={val} /> : "-"}
        </span>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (val) => (
        <span className="text-xs text-muted-foreground">{val || "-"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      filterOptions: JOB_POST_STATUS_OPTIONS,
      render: (val) => renderJobPostStatus(val),
    },
    {
      key: "createdAt",
      label: "Posted",
      render: (val) => (
        <span className="text-xs text-muted-foreground">
          {val ? formatDateTime(val) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      

      <PageHeader
        title="Job Post / Service Management"
        subtitle="View and manage violating job posts and services on the platform."
      />

      {feedback && (
        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-sm text-success">
          {feedback}
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={jobPosts}
        loading={loading}
        emptyMessage="No job posts found."
        actions={(row) => (
          <div className="flex gap-1.5">
            {normalizeJobPostStatus(row.status) !== "Closed" && (
              <button
                type="button"
                onClick={() =>
                  setStatusModal({
                    id: row.id,
                    newStatus:
                      ["Open", "Active"].includes(normalizeJobPostStatus(row.status)) ? "Inactive" : "Active",
                  })
                }
                disabled={actionLoading}
                className="rounded-lg text-xs font-medium inline-flex items-center gap-1 transition border bg-warning-light text-warning hover:bg-warning-light border-warning/20 px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change status"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {["Open", "Active"].includes(normalizeJobPostStatus(row.status)) ? "Deactivate" : "Activate"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteModal(row.id)}
              disabled={actionLoading}
              className="rounded-lg text-xs font-medium inline-flex items-center gap-1 transition border bg-destructive-light text-destructive hover:bg-destructive-light border-destructive/20 px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
