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
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Project status config
// ---------------------------------------------------------------------------

// Project statuses normalized in fetchProjects mapping
export function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Workaround: C# backend has no GetAllProjects endpoint, so we fetch projects for all users
      const usersRes = await api.users.list({ timeout: 5000 }).catch(() => []);
      const users = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);

      const projectPromises = [];
      users.forEach(u => {
        const uId = u.id || u.Id;
        if (uId) {
          projectPromises.push(api.users.getClientProjects(uId).catch(() => []));
          projectPromises.push(api.users.getExpertProjects(uId).catch(() => []));
        }
      });

      const projectsResults = await Promise.all(projectPromises);
      const raw = [];
      const seenIds = new Set();
      projectsResults.forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(p => {
            const pId = String(p.id || p.Id).toLowerCase();
            if (!seenIds.has(pId)) {
              seenIds.add(pId);
              raw.push(p);
            }
          });
        }
      });

      const normalized = raw.map(p => {
        const projId = p.id || p.Id;
        const localStatus = localStorage.getItem(`project_status_${projId}`) || p.status || p.Status || "";
        let statusKey = localStatus.toLowerCase().replace(/[\s_]+/g, "");

        if (statusKey === "inprogress") {
          statusKey = "in_progress";
        } else if (statusKey === "pendingescrow" || statusKey === "open") {
          statusKey = "pending_escrow";
        } else if (statusKey === "completed") {
          statusKey = "completed";
        } else if (statusKey === "cancelled" || statusKey === "stopped") {
          statusKey = "cancelled";
        } else if (statusKey === "disputed") {
          statusKey = "disputed";
        } else if (statusKey === "resolved") {
          statusKey = "completed";
        } else if (!statusKey) {
          statusKey = "in_progress";
        }

        return {
          ...p,
          status: statusKey,
        };
      });
      setProjects(normalized);
    } catch (err) {
      setError(err.message || "Unable to load project list.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const columns = [
    {
      key: "title",
      label: "PROJECT",
      className: "w-[25%] max-w-[220px]",
      render: (val) => (
        <span className="font-medium text-foreground text-sm truncate block" title={val}>{val || "—"}</span>
      ),
    },
    {
      key: "clientName",
      label: "CLIENT",
      className: "w-[15%] max-w-[140px]",
      render: (val, row) => {
        const name = row.clientName || row.ClientName || row.clientId || "—";
        return (
          <span className="text-sm text-muted-foreground truncate block" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: "expert",
      label: "EXPERT",
      className: "w-[15%] max-w-[140px]",
      render: (val, row) => {
        const name = row.expert || row.expertName || row.Expert || row.ExpertName || row.expertId || "None";
        return (
          <span className="text-sm text-muted-foreground truncate block" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: "budget",
      label: "BUDGET",
      className: "w-[12%]",
      render: (val, row) => {
        const amount = row.budget ?? row.Budget ?? 0;
        return (
          <span className="text-sm font-medium">
            <MoneyDisplay amount={amount} />
          </span>
        );
      },
    },
    {
      key: "status",
      label: "STATUS",
      className: "w-[13%]",
      filterOptions: [
        { value: "in_progress", label: "In Progress" },
        { value: "pending_escrow", label: "Pending Payment" },
        { value: "completed", label: "Completed" },
        { value: "disputed", label: "Disputed" },
        { value: "cancelled", label: "Cancelled" },
      ],
      render: (val) => (
        <StatusBadge
          status={val}
          entity="project"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      

      <h1 className="text-2xl font-bold text-foreground mb-2">Project Management</h1>
      <p className="text-muted-foreground mb-6">
        View and manage all platform projects.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={projects}
        loading={loading}
        emptyMessage="No projects found."
        actions={(row) => (
          <div className="flex items-center gap-2">
            <Link
              to={`/client/projects/${row.id}`}
              className="px-2.5 py-1.5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-xs font-medium inline-flex items-center gap-1 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              View Detail
            </Link>
            <Link
              to={`/client/projects/${row.id}/proposals`}
              className="px-2.5 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary-hover text-xs font-medium inline-flex items-center gap-1 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              View Proposal
            </Link>
          </div>
        )}
      />
    </div>
  );
}

export default AdminProjects;
