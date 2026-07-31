// =============================================================================
// AdminDashboard - Dashboard overview page for Admin/Owner.
//
// Shows platform stats and quick links to all management pages.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { Users, Briefcase, AlertTriangle, TrendingUp, Star, FileText, Tag } from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { getReports } from "../../../services/reportService.js";
import api from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDashboard() {
  const { user } = useAuth();
  const isOwner = (user?.role || user?.Role || "").toLowerCase() === "owner";

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    openDisputes: 0,
    totalRevenue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    const DASHBOARD_TIMEOUT = 3000;

    const results = await Promise.allSettled([
      api.users.list({ timeout: DASHBOARD_TIMEOUT }),
      getReports({ status: "Pending" }),
      isOwner ? api.users.systemDashboard().catch(() => null) : Promise.resolve(null),
      api.payments.getTransactions().catch(() => []),
    ]);

    const [usersSettled, reportsSettled, systemDashboardSettled, transactionsSettled] = results;

    const transactions = transactionsSettled.status === "fulfilled" ? transactionsSettled.value : [];

    const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
    const transactionProjectIds = new Set(
      transactions
        .filter(t => t.projectId || t.ProjectId)
        .map(t => String(t.projectId || t.ProjectId).toLowerCase())
    );

    const usersData = (usersSettled.status === "fulfilled" && usersSettled.value)
      ? (usersSettled.value.data || usersSettled.value)
      : [];
    const totalUsersCount = Array.isArray(usersData) ? usersData.length : Number(usersSettled.value?.total || 0);

    // Fetch projects for all users since backend has no GetAllProjects
    let activeProjectsCount = 0;
    const allFetchedProjects = [];
    try {
      const projectPromises = [];
      usersData.forEach(u => {
        const uId = u.id || u.Id;
        if (uId) {
          projectPromises.push(api.users.getClientProjects(uId).catch(() => []));
          projectPromises.push(api.users.getExpertProjects(uId).catch(() => []));
        }
      });
      const projectsResults = await Promise.all(projectPromises);
      const seenIds = new Set();
      projectsResults.forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(p => {
            const pId = String(p.id || p.Id).toLowerCase();
            if (!seenIds.has(pId)) {
              seenIds.add(pId);
              allFetchedProjects.push(p);
              const dbStatus = (p.status || p.Status || "").toLowerCase().trim();
              const isTerminal = ["completed", "complete", "closed", "resolved", "cancelled", "cancel_done", "stopped"].includes(dbStatus);
              if (isTerminal) {
                try { localStorage.removeItem(`project_status_${pId}`); } catch (e) {}
              }
              const localStatus = localStorage.getItem(`project_status_${pId}`) || p.status || p.Status || "";
              const statusLower = localStatus.toLowerCase().replace(/[\s_]+/g, "");
              if (statusLower === "inprogress" || statusLower === "in_progress") {
                activeProjectsCount++;
              }
            }
          });
        }
      });
    } catch (err) {
      console.warn("fetchStats projects fetch failed:", err);
    }

    // Build project map with budgets to calculate exact platform fee
    const projectMap = new Map();
    allFetchedProjects.forEach(p => {
      const projId = String(p.id || p.Id).toLowerCase();
      const budget = p.budget ?? p.Budget ?? p.escrowBalance ?? p.escrowAmount ?? 0;
      projectMap.set(projId, { budget });
    });

    // Build set of projects that have an explicit PlatformFee transaction
    const projectsWithPlatformFee = new Set();
    transactions.forEach(t => {
      const lType = (t.type || t.Type || "").toLowerCase();
      const projId = t.projectId || t.ProjectId;
      if (projId && (lType === "platformfee" || lType === "platform_fee")) {
        projectsWithPlatformFee.add(String(projId).toLowerCase());
      }
    });

    const getPlatformFee = (t) => {
      const lType = (t.type || t.Type || "").toLowerCase();
      const projId = t.projectId || t.ProjectId;
      const projIdLower = projId ? String(projId).toLowerCase() : null;
      const tAmount = Number(t.amount || t.Amount || 0);

      if (lType === "platformfee" || lType === "platform_fee") {
        return Math.abs(tAmount);
      }

      if (lType === "releasepayment" || lType === "escrow_release" || lType === "escrowrelease") {
        if (projIdLower && projectsWithPlatformFee.has(projIdLower)) {
          return 0;
        }
        const projDetails = projIdLower ? projectMap.get(projIdLower) : null;
        if (projDetails && projDetails.budget > 0) {
          return projDetails.budget * 0.05;
        }
        return tAmount * 5 / 95;
      }

      return 0;
    };

    const systemDash = systemDashboardSettled.status === "fulfilled" ? systemDashboardSettled.value : null;
    let totalRevenue = Math.abs(Number(systemDash?.totalPlatformRevenue ?? systemDash?.TotalPlatformRevenue ?? 0));

    if (totalRevenue === 0) {
      const systemHistories = systemDash?.transactionHistories || systemDash?.TransactionHistories || [];
      systemHistories.forEach(item => {
        totalRevenue += Math.abs(Number(item.fee ?? item.Fee ?? item.amount ?? item.Amount ?? 0));
      });
    }

    if (totalRevenue === 0) {
      transactions.forEach(t => {
        const lType = (t.type || t.Type || "").toLowerCase();
        const tPlatformFee = Math.abs(Number(t.platformFee || t.PlatformFee || 0));
        if (lType === "platformfee" || lType === "platform_fee" || (tPlatformFee > 0 && lType !== "releasepayment" && lType !== "escrow_release")) {
          totalRevenue += tPlatformFee > 0 ? tPlatformFee : Math.abs(Number(t.amount || t.Amount || 0));
        }
      });
    }

    setStats({
      totalUsers: totalUsersCount,
      activeProjects: activeProjectsCount,
      openDisputes:
        (reportsSettled.status === "fulfilled" && reportsSettled.value)
          ? reportsSettled.value.data?.length || reportsSettled.value.total || 0
          : 0,
      totalRevenue: totalRevenue,
    });

    // Only set error if ALL calls failed
    const allFailed = results.every((r) => r.status === "rejected");
    if (allFailed) {
      setError("Unable to load dashboard data. Please try again later.");
    }
  }, []);

  useEffect(() => {
    fetchStats().finally(() => setLoadingStats(false));
  }, [fetchStats]);

  // Static content renders immediately - only metric values show a loading
  // indicator when API data is still being fetched.

  const SkeletonValue = () => (
    <span className="inline-block h-6 w-12 bg-secondary rounded animate-pulse align-middle" />
  );

  const dashboardStats = [
    {
      label: "Total Users",
      value: loadingStats ? <SkeletonValue /> : stats.totalUsers,
      icon: Users,
      color: "text-brand-primary bg-brand-primary-light",
      link: "/admin/users",
    },
    {
      label: "Active Projects",
      value: loadingStats ? <SkeletonValue /> : stats.activeProjects,
      icon: Briefcase,
      color: "text-success bg-success-light",
      link: "/admin/projects",
    },
    {
      label: "Report Progress",
      value: loadingStats ? <SkeletonValue /> : stats.openDisputes,
      icon: FileText,
      color: "text-warning bg-warning-light",
      link: "/admin/disputes",
    },
    {
      label: "Total Revenue",
      value: loadingStats ? <SkeletonValue /> : <MoneyDisplay amount={stats.totalRevenue} />,
      icon: TrendingUp,
      color: "text-accent bg-accent-light",
      link: "/admin/revenue",
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Platform overview and key metrics."
      />

      {/* Error banner (non-blocking) */}
      {error && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <DashboardStats
        stats={dashboardStats}
        columns="grid grid-cols-2 lg:grid-cols-4 gap-4"
      />

      {/* API note */}
      <div className="p-4 bg-primary-light border border-primary/20 rounded-xl text-sm text-primary">
        <strong>Note:</strong> Statistics will update when backend APIs are complete.
        Currently displaying data from available APIs.
      </div>
    </>
  );
}

export default AdminDashboard;
