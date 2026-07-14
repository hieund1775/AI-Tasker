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
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

// ---------------------------------------------------------------------------
// Status & Role configs
// ---------------------------------------------------------------------------

const ROLE_COLORS = {
  client: "bg-brand-primary-light text-brand-primary",
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
  const { role: userRole } = useAuth();
  const rawRole = (userRole || "").toLowerCase();
  const currentUserRole = rawRole === "staff" ? "admin" : rawRole;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Frontend filtering — role exclusion
  const filteredUsers = useMemo(() => {
    let result = users;
    // Exclude specified roles (e.g. Owner page excludes admins)
    if (excludeRoles.length > 0) {
      result = result.filter(
        (u) => !excludeRoles.includes((u.role || "").toLowerCase()),
      );
    }
    // Admin cannot see owner accounts
    if (currentUserRole === "admin") {
      result = result.filter(
        (u) => (u.role || "").toLowerCase() !== "owner"
      );
    }
    return result;
  }, [users, excludeRoles, currentUserRole]);

  // Modal state
  const [lockModal, setLockModal] = useState(null); // { userId, userName, currentStatus }

  // -----------------------------------------------------------------------
  // Fetch users
  // -----------------------------------------------------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.users.list();
      const rawData = Array.isArray(result) ? result : result?.data || [];
      const normalizedData = rawData.map(u => {
        const roleLower = (u.role || u.Role || "").trim().toLowerCase();
        return {
          ...u,
          role: roleLower === "staff" ? "admin" : roleLower
        };
      });
      setUsers(normalizedData);
    } catch (err) {
      setError(err.message || "Unable to load user list.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
          <p className="text-sm font-medium text-foreground">
            {val || row.name || "—"}
          </p>
          <p className="text-xs text-muted-foreground">{row.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      filterOptions: [
        { label: "Client", value: "client" },
        { label: "Expert", value: "expert" },
        { label: "Admin", value: "admin" },
      ],
      render: (val) => {
        if (!val) return "—";
        const normalized = val.trim().toLowerCase();
        const displayLabel = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              ROLE_COLORS[normalized] || "bg-secondary text-foreground/80"
            }`}
          >
            {displayLabel}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Locked", value: "suspended" }, // maps to suspended/locked
      ],
      render: (val) => (
        <StatusBadge status={val || "active"} config={STATUS_CONFIG} />
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (val) => (
        <span className="text-xs text-muted-foreground">
          {val ? formatDateTime(val) : "—"}
        </span>
      ),
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">


      <h1 className="text-2xl font-bold text-foreground mb-2">
        User Management
      </h1>
      <p className="text-muted-foreground mb-6">
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

      <DataTable
        columns={columns}
        data={filteredUsers}
        loading={loading}
        emptyMessage="No users found."
        actions={(row) => {
          const rowRole = (row.role || "").toLowerCase();
          // Don't allow locking owner accounts
          if (rowRole === "owner") return null;
          // Admin cannot lock other admin accounts (but Owner can)
          if (currentUserRole === "admin" && rowRole === "admin") {
            return null;
          }
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition ${isLocked
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
