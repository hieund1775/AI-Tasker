// =============================================================================
// AdminJobPosts - Job post / Service list management for Admin/Owner.
//
// Uses existing /api/jobposts endpoint. Admin can:
//   - View all job posts
//   - Search
//   - Change job post status
//   - Delete job posts (placeholder if DELETE API unavailable)
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Status config (3 categories: Posted, Accepted, Cancelled)
// ---------------------------------------------------------------------------

const JOB_POST_STATUS_CONFIG = {
  Posted: { color: "bg-brand-primary-light text-brand-primary border border-brand-primary/25 font-semibold", label: "Posted" },
  Accepted: { color: "bg-success-light text-success border border-success/25 font-semibold", label: "Accepted" },
  Cancelled: { color: "bg-destructive-light text-destructive border border-destructive/25 font-semibold", label: "Cancelled" },
};

const JOB_POST_STATUS_ORDER = ["Posted", "Accepted", "Cancelled"];

const normalizeJobPostStatus = (rawStatus) => {
  const key = String(rawStatus || "open").trim().toLowerCase().replace(/[\s_]+/g, "");

  if (["accepted", "assigned", "inprogress", "in_progress", "worksubmitted", "underreview", "completed", "complete"].includes(key)) {
    return "Accepted";
  }
  if (["cancelled", "canceled", "closed", "inactive", "stopped", "canceldone", "contractcancelled"].includes(key)) {
    return "Cancelled";
  }
  return "Posted";
};

const normalizeJobPostRow = (job) => ({
  ...job,
  id: job.id || job.Id,
  title: job.title || job.Title || "Untitled Job Post",
  budget: job.budget ?? job.Budget ?? 0,
  category: job.category || job.Category || job.domainName || job.DomainName || job.domain?.name || job.Domain?.Name || "-",
  clientName: job.clientName || job.ClientName || job.client?.fullName || job.Client?.FullName || "",
  clientId: job.clientId || job.ClientId || "",
  createdAt: job.createdAt || job.CreatedAt || job.postedAt || job.PostedAt || "",
  status: normalizeJobPostStatus(job.status || job.Status),
});

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
      const result = await api.jobPosts.list({ pageSize: 500 });
      const rows = Array.isArray(result) ? result : result?.data || [];
      setJobPosts(rows.map(normalizeJobPostRow));
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
        await api.jobPosts.update(jobPostId, { status: newStatus });
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

  const statusFilterOptions = useMemo(() => {
    return [
      { value: "Posted", label: "Posted" },
      { value: "Accepted", label: "Accepted" },
      { value: "Cancelled", label: "Cancelled" },
    ];
  }, []);

  const columns = [
    {
      key: "title",
      label: "Job Title",
      sortable: false,
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
      label: "Category / Domain",
      sortable: false,
      render: (val) => (
        <span className="text-xs text-muted-foreground">{val || "-"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: false,
      filterOptions: statusFilterOptions,
      render: (val) => renderJobPostStatus(val),
    },
    {
      key: "createdAt",
      label: "Posted Date",
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
        title="Job Post Management"
        subtitle="View and manage all job posts and services on the platform."
      />

      {feedback && (
        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-sm text-success font-medium">
          {feedback}
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={jobPosts}
        loading={loading}
        emptyMessage="No job posts found."
        actions={(row) => {
          const normalizedStatus = normalizeJobPostStatus(row.status);
          const canDeactivate = normalizedStatus === "Posted";

          return (
            <div className="flex gap-1.5">
              {canDeactivate && (
                <button
                  type="button"
                  onClick={() =>
                    setStatusModal({
                      id: row.id,
                      newStatus: "Cancelled",
                    })
                  }
                  disabled={actionLoading}
                  className="rounded-lg text-xs font-medium inline-flex items-center gap-1 transition border bg-warning-light text-warning hover:bg-warning-light border-warning/20 px-2.5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cancel job post"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Cancel Post
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
          );
        }}
      />

      {/* Status change confirmation modal */}
      <ConfirmationModal
        open={statusModal !== null}
        onOpenChange={(open) => !open && setStatusModal(null)}
        title="Change Job Post Status"
        description="Are you sure you want to change this job post status to 'Cancelled'?"
        confirmLabel="Confirm Cancel"
        variant="warning"
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
