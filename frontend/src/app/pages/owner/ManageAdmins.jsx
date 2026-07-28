// =============================================================================
// ManageAdmins - Owner-only page to view and manage Admin accounts.
//
// Owner can:
//   - View list of all Admin accounts
//   - Lock/ban an Admin
//   - Unlock an Admin
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Shield, ShieldOff, Search, CheckCircle } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import { getAdminUsers, banAdminAccount } from "../../../services/ownerService.js";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const ADMIN_STATUS_CONFIG = {
  active: { color: "bg-success-light text-success", label: "Active" },
  banned: { color: "bg-destructive-light text-destructive", label: "Locked" },
  locked: { color: "bg-destructive-light text-destructive", label: "Locked" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManageAdmins() {
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modal state
  const [banModal, setBanModal] = useState(null);

  // -----------------------------------------------------------------------
  // Fetch admins
  // -----------------------------------------------------------------------
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminUsers({ search: searchTerm });
      setAdmins(result?.data || []);
    } catch (err) {
      setError(err.message || "Unable to load Admin list.");
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const showToast = useCallback((msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  // -----------------------------------------------------------------------
  // Toggle ban/lock
  // -----------------------------------------------------------------------
  const handleToggleBan = useCallback(
    async (adminId, currentStatus) => {
      setActionLoading(true);
      const newStatus = currentStatus === "active" ? "banned" : "active";
      try {
        await banAdminAccount(adminId, {
          action: newStatus === "banned" ? "ban" : "unban",
        });
        setAdmins((prev) =>
          prev.map((a) =>
            a.id === adminId ? { ...a, status: newStatus } : a,
          ),
        );
        showToast(
          newStatus === "banned"
            ? "Admin has been locked."
            : "Admin has been unlocked.",
        );
      } catch (err) {
        showToast(err.message || "Error changing Admin status.");
      } finally {
        setActionLoading(false);
        setBanModal(null);
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
      label: "Admin",
      render: (val, row) => (
        <div>
          <p className="font-medium text-foreground text-sm">{val || row.name || "-"}</p>
          <p className="text-xs text-muted-foreground">{row.email || "-"}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: () => (
        <span className="px-2.5 py-0.5 bg-destructive-light text-destructive rounded-full text-xs font-medium">
          Admin
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <StatusBadge
          status={val || "active"}
          config={ADMIN_STATUS_CONFIG}
        />
      ),
    },
    {
      key: "createdAt",
      label: "Created",
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
      <button
        type="button"
        onClick={() => navigate("/owner/dashboard")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/80 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <PageHeader
        title="Manage Admin Accounts"
        subtitle="View and manage Admin accounts on the platform."
      />

      {feedback && (
        <div className="p-3 bg-success-light border border-success/20 rounded-lg text-sm text-success flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {feedback}
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="page-filter-toolbar">
        <div className="page-filter-search sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-input-background pl-9 pr-4 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={admins}
        loading={loading}
        emptyMessage="No Admin accounts found."
        actions={(row) => {
          const isBanned = row.status === "banned" || row.status === "locked";
          return (
            <button
              type="button"
              onClick={() =>
                setBanModal({
                  adminId: row.id,
                  adminName: row.fullName || row.name || row.email,
                  currentStatus: row.status || "active",
                })
              }
              disabled={actionLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition ${
                isBanned
                  ? "bg-success-light text-success hover:bg-success-light border border-success/20"
                  : "bg-destructive-light text-destructive hover:bg-destructive-light border border-destructive/20"
              }`}
            >
              {isBanned ? (
                <>
                  <Shield className="w-4 h-4" />
                  Unlock
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4" />
                  Lock
                </>
              )}
            </button>
          );
        }}
      />

      <ConfirmationModal
        open={banModal !== null}
        onOpenChange={(open) => !open && setBanModal(null)}
        title={
          banModal?.currentStatus === "active"
            ? "Lock Admin Account"
            : "Unlock Admin Account"
        }
        description={
          banModal?.currentStatus === "active"
            ? `Are you sure you want to lock Admin "${banModal?.adminName}"? They will not be able to log in.`
            : `Are you sure you want to unlock Admin "${banModal?.adminName}"?`
        }
        confirmLabel={
          banModal?.currentStatus === "active" ? "Lock" : "Unlock"
        }
        variant={banModal?.currentStatus === "active" ? "danger" : "default"}
        loading={actionLoading}
        onConfirm={() =>
          banModal &&
          handleToggleBan(banModal.adminId, banModal.currentStatus)
        }
      />
    </div>
  );
}

export default ManageAdmins;
