// =============================================================================
// ManageAdmins — Owner-only page to view and manage Admin accounts.
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
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import { getAdminUsers, banAdminAccount } from "../../../services/ownerService.js";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const ADMIN_STATUS_CONFIG = {
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  banned: { color: "bg-red-100 text-red-700", label: "Locked" },
  locked: { color: "bg-red-100 text-red-700", label: "Locked" },
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
          <p className="font-medium text-foreground text-sm">{val || row.name || "—"}</p>
          <p className="text-xs text-muted-foreground">{row.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: () => (
        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
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
          {val ? formatDateTime(val) : "—"}
        </span>
      ),
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => navigate("/owner/dashboard")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/80 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-2">
        Manage Admin Accounts
      </h1>
      <p className="text-muted-foreground mb-6">
        View and manage Admin accounts on the platform.
      </p>

      {feedback && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {feedback}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md pl-9 pr-4 py-2.5 border border-input rounded-lg focus:outline-none focus:border-brand-primary text-sm"
        />
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
                  ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
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
