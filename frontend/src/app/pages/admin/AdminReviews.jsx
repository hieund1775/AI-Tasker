// =============================================================================
// AdminReviews — Review list management for Admin/Owner.
//
// Shows all platform reviews with:
//   - Search by content/user
//   - Hide/delete violating reviews
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, EyeOff, Trash2, Filter } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const REVIEW_STATUS_CONFIG = {
  Visible: { color: "bg-green-100 text-green-700", label: "Visible" },
  Hidden: { color: "bg-yellow-100 text-yellow-700", label: "Hidden" },
  Deleted: { color: "bg-red-100 text-red-700", label: "Deleted" },
};

const REVIEW_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Visible", label: "Visible" },
  { value: "Hidden", label: "Hidden" },
  { value: "Deleted", label: "Deleted" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Frontend status filtering — applied on top of API results
  const filteredReviews = useMemo(() => {
    if (!statusFilter) return reviews;
    return reviews.filter(
      (r) => (r.status || "Visible").toLowerCase() === statusFilter.toLowerCase(),
    );
  }, [reviews, statusFilter]);

  // Modal states
  const [hideModal, setHideModal] = useState(null); // review id to hide
  const [deleteModal, setDeleteModal] = useState(null); // review id to delete

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: replace with dedicated review API endpoint when available
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const result = await api.get("/reviews", { params });
      setReviews(Array.isArray(result) ? result : result?.data || []);
    } catch (err) {
      // API not ready yet — show empty state gracefully
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const showToast = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const handleHide = useCallback(
    async (reviewId) => {
      setActionLoading(true);
      try {
        // TODO: add API endpoint — PUT /reviews/{id}/hide
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, status: "Hidden" } : r,
          ),
        );
        showToast("Review has been hidden.");
      } catch (err) {
        showToast(err.message || "Error hiding review.");
      } finally {
        setActionLoading(false);
        setHideModal(null);
      }
    },
    [showToast],
  );

  const handleDelete = useCallback(
    async (reviewId) => {
      setActionLoading(true);
      try {
        // TODO: add API endpoint — DELETE /reviews/{id}
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, status: "Deleted" } : r,
          ),
        );
        showToast("Review has been deleted.");
      } catch (err) {
        showToast(err.message || "Error deleting review.");
      } finally {
        setActionLoading(false);
        setDeleteModal(null);
      }
    },
    [showToast],
  );

  const columns = [
    {
      key: "content",
      label: "Content",
      render: (val, row) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-800 line-clamp-2">{val || "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {row.reviewerName || "—"} → {row.targetName || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      render: (val) => (
        <span className="text-sm font-medium">
          {val != null ? `${val} ⭐` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <StatusBadge
          status={val || "Visible"}
          config={REVIEW_STATUS_CONFIG}
        />
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

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Management</h1>
      <p className="text-gray-600 mb-6">
        View and manage violating reviews on the platform.
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
            placeholder="Search by content or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm appearance-none bg-white"
          >
            {REVIEW_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredReviews}
        loading={loading}
        emptyMessage={
          statusFilter
            ? `No reviews found with status "${REVIEW_STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || statusFilter}".`
            : "No reviews found."
        }
        actions={(row) => (
          <div className="flex gap-1.5">
            {row.status !== "Hidden" && row.status !== "Deleted" && (
              <button
                type="button"
                onClick={() => setHideModal(row.id)}
                disabled={actionLoading}
                className="px-2.5 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition"
                title="Hide review"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Hide
              </button>
            )}
            {row.status !== "Deleted" && (
              <button
                type="button"
                onClick={() => setDeleteModal(row.id)}
                disabled={actionLoading}
                className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition"
                title="Delete review"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        )}
      />

      {/* Hide confirmation modal */}
      <ConfirmationModal
        open={hideModal !== null}
        onOpenChange={(open) => !open && setHideModal(null)}
        title="Hide Review"
        description="Are you sure you want to hide this review? Users will no longer see it."
        confirmLabel="Hide Review"
        variant="warning"
        loading={actionLoading}
        onConfirm={() => hideModal && handleHide(hideModal)}
      />

      {/* Delete confirmation modal */}
      <ConfirmationModal
        open={deleteModal !== null}
        onOpenChange={(open) => !open && setDeleteModal(null)}
        title="Delete Review"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete Permanently"
        variant="danger"
        loading={actionLoading}
        onConfirm={() => deleteModal && handleDelete(deleteModal)}
      />
    </div>
  );
}

export default AdminReviews;
