// =============================================================================
// AdminUsers - User management page for Admin/Owner.
//
// Uses existing /api/users endpoint. Admin/Owner can:
//   - View user list with search
//   - Lock/unlock Client and Expert accounts
//   - View user detail
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, ShieldOff, Shield, Filter, Eye, X } from "lucide-react";
import { useNavigate } from "react-router";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

// ---------------------------------------------------------------------------
// Status & Role configs
// ---------------------------------------------------------------------------

const ROLE_COLORS = {
  client: "bg-brand-primary-light text-brand-primary",
  expert: "bg-warning-light text-warning",
  admin: "bg-destructive-light text-destructive",
  owner: "bg-warning-light text-warning",
};

const STATUS_CONFIG = {
  active: { color: "bg-success-light text-success", label: "Active" },
  inactive: { color: "bg-destructive-light text-destructive", label: "Inactive" },
  suspended: { color: "bg-destructive-light text-destructive", label: "Inactive" },
  locked: { color: "bg-destructive-light text-destructive", label: "Inactive" },
  banned: { color: "bg-destructive-light text-destructive", label: "Inactive" },
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
  const navigate = useNavigate();
  const { role: userRole } = useAuth();
  const rawRole = (userRole || "").toLowerCase();
  const currentUserRole = rawRole === "staff" ? "admin" : rawRole;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Frontend filtering - role exclusion
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

  // Modal states
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
      const isActive = (currentStatus || "").toLowerCase() === "active";
      const newStatus = isActive ? "Inactive" : "Active";
      try {
        await api.put(`/users/${userId}/set-active`, {
          isActive: !isActive,
        });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, status: newStatus } : u,
          ),
        );
        if (isActive) {
          localStorage.setItem("aitasker_user_banned", JSON.stringify({ userId, timestamp: Date.now() }));
        } else {
          localStorage.removeItem("aitasker_user_banned");
        }
        window.dispatchEvent(new CustomEvent("aitasker_db_update"));
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
            {val || row.name || "-"}
          </p>
          <p className="text-xs text-muted-foreground">{row.email || "-"}</p>
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
        if (!val) return "-";
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
        {
          label: "Inactive",
          value: "inactive",
          values: ["inactive", "suspended", "locked", "banned"],
        },
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
          {val ? formatDateTime(val) : "-"}
        </span>
      ),
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">


      <PageHeader
        title="User Management"
        subtitle="View and manage platform users."
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
          const statusLower = (row.status || "").toLowerCase();
          const isLocked =
            statusLower === "inactive" ||
            statusLower === "suspended" ||
            statusLower === "locked" ||
            statusLower === "banned";
          return (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const basePath = currentUserRole === "owner" ? "/owner" : "/admin";
                  const profileType = rowRole === "expert" ? "profile-expert" : "profile-client";
                  const url = `${basePath}/${profileType}/${row.id}`;
                  navigate(url);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition bg-accent-light text-accent hover:bg-accent-light border border-accent/25"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
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
                  ? "bg-success-light text-success hover:bg-success-light border border-success/20"
                  : "bg-destructive-light text-destructive hover:bg-destructive-light border border-destructive/20"
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
