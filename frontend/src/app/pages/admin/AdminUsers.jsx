// =============================================================================
// AdminUsers — User management page for Admin/Owner.
//
// Uses existing /api/users endpoint. Admin/Owner can:
//   - View user list with search
//   - Lock/unlock Client and Expert accounts
//   - View user detail
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, ShieldOff, Shield, Filter } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Status & Role configs
// ---------------------------------------------------------------------------

const ROLE_COLORS = {
  client: "bg-blue-100 text-blue-700",
  expert: "bg-purple-100 text-purple-700",
  admin: "bg-red-100 text-red-700",
  owner: "bg-yellow-100 text-yellow-700",
};

const STATUS_CONFIG = {
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  suspended: { color: "bg-red-100 text-red-700", label: "Locked" },
  locked: { color: "bg-red-100 text-red-700", label: "Locked" },
  banned: { color: "bg-red-100 text-red-700", label: "Locked" },
};

const ROLE_FILTER_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "client", label: "Client" },
  { value: "expert", label: "Expert" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminUsers({ excludeRoles = [] }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Frontend filtering — role exclusion + role filter applied on API results
  const filteredUsers = useMemo(() => {
    let result = users;
    // Exclude specified roles (e.g. Owner page excludes admins)
    if (excludeRoles.length > 0) {
      result = result.filter(
        (u) => !excludeRoles.includes((u.role || "").toLowerCase()),
      );
    }
    // Apply role filter
    if (roleFilter) {
      result = result.filter(
        (u) => (u.role || "").toLowerCase() === roleFilter.toLowerCase(),
      );
    }
    return result;
  }, [users, roleFilter, excludeRoles]);

  // Modal state
  const [lockModal, setLockModal] = useState(null); // { userId, userName, currentStatus }

  // -----------------------------------------------------------------------
  // Fetch users
  // -----------------------------------------------------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      const result = await api.users.list(params);
      setUsers(Array.isArray(result) ? result : result?.data || []);
    } catch (err) {
      setError(err.message || "Unable to load user list.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  // -----------------------------------------------------------------------
  // Toggle lock/unlock via /api/users/{id}/set-active
  // -----------------------------------------------------------------------
  const handleToggleLock = useCallback(
    async (userId, currentStatus) => {
      setActionLoading(true);
      const isActive = currentStatus === "active";
      const newStatus = isActive ? "suspended" : "active";
      try {
        await api.put(`/users/${userId}/set-active`, {
          isActive: !isActive,
        });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: newStatus } : u,
          ),
        );
        showToast(
          isActive
            ? "User has been locked."
            : "User has been unlocked.",
        );
      } catch (err) {
        showToast(err.message || "Error changing user status.");
      } finally {
        setActionLoading(false);
        setLockModal(null);
      }
    },
    [showToast],
  );

  // -----------------------------------------------------------------------
  // Table columns
  // -----------------------------------------------------------------------
  const columns = [
    {
      key: "fullName",
      label: "User",
      render: (val, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {val || row.name || "—"}
          </p>
          <p className="text-xs text-gray-500">{row.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (val) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            ROLE_COLORS[val?.toLowerCase()] || "bg-gray-100 text-gray-700"
          }`}
        >
          {val || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <StatusBadge status={val || "active"} config={STATUS_CONFIG} />
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (val) => (
        <span className="text-xs text-gray-500">
          {val ? formatDateTime(val) : "—"}
        </span>
      ),
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/admin/dashboard" className="mb-4">
        Back to Dashboard
      </BackButton>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        User Management
      </h1>
      <p className="text-gray-600 mb-6">
        View and manage platform users.
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
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm appearance-none bg-white"
          >
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyMessage={roleFilter ? `No users found with role "${ROLE_FILTER_OPTIONS.find(o => o.value === roleFilter)?.label || roleFilter}".` : "No users found."}
        actions={(row) => {
          // Don't allow locking owner accounts
          if (row.role?.toLowerCase() === "owner") return null;
          const isLocked =
            row.status === "suspended" ||
            row.status === "locked" ||
            row.status === "banned";
          return (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setLockModal({
                    userId: row.id,
                    userName: row.fullName || row.name || row.email,
                    currentStatus: row.status || "active",
                  })
                }
                disabled={actionLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition ${
                  isLocked
                    ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                }`}
              >
                {isLocked ? (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    Unlock
                  </>
                ) : (
                  <>
                    <ShieldOff className="w-3.5 h-3.5" />
                    Lock
                  </>
                )}
              </button>
            </div>
          );
        }}
      />

      {/* Lock/unlock confirmation modal */}
      <ConfirmationModal
        open={lockModal !== null}
        onOpenChange={(open) => !open && setLockModal(null)}
        title={
          lockModal?.currentStatus === "active"
            ? "Lock Account"
            : "Unlock Account"
        }
        description={
          lockModal?.currentStatus === "active"
            ? `Are you sure you want to lock "${lockModal?.userName}"? They will not be able to log in.`
            : `Are you sure you want to unlock "${lockModal?.userName}"?`
        }
        confirmLabel={
          lockModal?.currentStatus === "active" ? "Lock" : "Unlock"
        }
        variant={lockModal?.currentStatus === "active" ? "danger" : "default"}
        loading={actionLoading}
        onConfirm={() =>
          lockModal &&
          handleToggleLock(lockModal.userId, lockModal.currentStatus)
        }
      />
    </div>
  );
}

export default AdminUsers;
