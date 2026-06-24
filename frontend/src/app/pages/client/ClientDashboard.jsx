import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";

import {
  Briefcase,
  Clock,
  CheckCircle2,
  PlusCircle,
  Calendar,
  DollarSign,
  User,
  Star,
  TrendingUp,
  FileText,
  Wallet,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

import {
  getProjectProgress,
  deriveProjectStatusKey,
  getStatusLabel,
  getStatusBadgeClass,
  getClientButtonConfig,
} from "../../lib/projectTimelineStore.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute average rating for an expert. */
function computeExpertRating(_expertId) {
  // TODO: Replace with API call — api.experts.getReviews(expertId)
  return null;
}

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const getDeadlineDate = (createdAt, deadline) => {
  if (!deadline) return "N/A";
  const num = Number(deadline);
  if (!isNaN(num) && num < 1000) {
    const start = createdAt ? new Date(createdAt) : new Date();
    const end = new Date(start.getTime() + num * 24 * 60 * 60 * 1000);
    return `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  }
  return formatDate(deadline);
};

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const SKILL_VISIBLE_COUNT = {
  project: 4,
  expert: 4,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClientDashboard() {
  const location = useLocation();
  const { user } = useAuth();

  const [clientProjects, setClientProjects] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return;
      setLoading(true);
      
      // Load user projects and wallet balance
      try {
        const [userRes, walletRes] = await Promise.all([
          api.users.getById(user.id),
          api.payments.getWallet(user.id).catch(() => ({ balance: 0 })),
        ]);
        setClientProjects(userRes?.projects || []);
        if (walletRes) {
          setWalletBalance(walletRes.balance || 0);
        }
      } catch (err) {
        console.error("Error loading client projects:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
    };
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
  }, [user?.id]);

  // ---- Stats ---------------------------------------------------------------
  const getProjectsByStatus = (statusList) => {
    return clientProjects.filter((p) => {
      const statusLower = p.status?.toLowerCase() || "";
      return statusList.some((s) => statusLower === s.toLowerCase());
    }).length;
  };

  const dashboardStats = [
    {
      label: "Active Projects",
      value: getProjectsByStatus(["in_progress", "in progress", "active"]),
      icon: Briefcase,
      color: "text-brand-primary bg-brand-primary-light",
    },
    {
      label: "Billing",
      value: <MoneyDisplay amount={walletBalance} />,
      icon: Wallet,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Completed",
      value: getProjectsByStatus(["completed", "complete"]),
      icon: CheckCircle2,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Cancelled",
      value: getProjectsByStatus(["cancelled", "cancel"]),
      icon: Clock,
      color: "text-red-600 bg-red-100",
    },
  ];

  // ---- Render --------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Dashboard</h1>
          <p className="text-gray-500 mt-0.5">
            Manage your AI projects and find experts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/client/my-projects"
            className="h-11 px-5 border border-gray-300 text-gray-700 rounded-[14px] hover:bg-gray-50 font-semibold text-base inline-flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" /> All Projects
          </Link>
          <Link
            to="/client/post-project"
            className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Post New Project
          </Link>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Stats Row                                                          */}
      {/* ================================================================== */}
      <DashboardStats stats={dashboardStats} size="sm" className="mb-6" />

      {/* ================================================================== */}
      {/* Full-Width Dashboard                                               */}
      {/* ================================================================== */}
      <div className="w-full">
        {/* ================================================================ */}
        {/* MY PROJECTS                                                      */}
        {/* ================================================================ */}
        <section
          className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-w-0 w-full"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: "620px",
          }}
        >
          {/* Panel header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center">
            <h2 className="text-[15px] font-semibold text-gray-900 uppercase tracking-wider">
              My Projects
            </h2>
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {(() => {
              const activeProjects = clientProjects.filter((p) => {
                const s = p.status?.toLowerCase() || "";
                return s === "active" || s === "in_progress" || s === "in progress";
              });

              if (activeProjects.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-500 mb-2">
                      No active projects yet
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Confirm escrow deposits on your accepted proposals to activate projects.
                    </p>
                    <Link
                      to="/client/my-projects"
                      className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center"
                    >
                      View My Projects
                    </Link>
                  </div>
                );
              }

              return activeProjects.map((p) => {
                // TODO: Replace with API calls for expert info and proposals
                const assignedExpert = p.assignedExpert;
                const progress = getProjectProgress(p.id);
                const statusKey = deriveProjectStatusKey(p, {
                  proposalCount: 0,
                });
                const displayStatus = getStatusLabel(statusKey);
                const badgeClass = getStatusBadgeClass(statusKey);
                const btnCfg = getClientButtonConfig(statusKey);
                
                const skills = p.jobPostSkills?.map((s) => s.skill?.name) || p.requiredSkills || [];
                const postDateText = p.createdAt ? formatDate(p.createdAt) : "N/A";
                const deadlineDateText = getDeadlineDate(p.createdAt, p.deadline);

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    {/* ── Top row: title + status badge ── */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <h3 className="font-semibold text-gray-900 text-lg leading-snug">
                        {p.title}
                      </h3>
                      <span
                        className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    {/* ── Expert name (if assigned) ── */}
                    <p className="text-base text-gray-500 mb-2">
                      {assignedExpert ? (
                        <>
                          Expert:{" "}
                          <span className="font-semibold text-gray-700">
                            {assignedExpert.fullName}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">
                          No expert assigned yet
                        </span>
                      )}
                    </p>

                    {/* ── Category & Specialization ── */}
                    {(p.aiCategoryDomain?.name || p.category || p.specialization) && (
                      <div className="flex flex-wrap gap-2 mb-3 text-[13px] text-gray-500">
                        {(p.aiCategoryDomain?.name || p.category) && (
                          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                            Category: {p.aiCategoryDomain?.name || p.category}
                          </span>
                        )}
                        {p.specialization && (
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-md">
                            Specialization: {p.specialization}
                          </span>
                        )}
                      </div>
                    )}

                    {/* ── Dates & Money info ── */}
                    <div className="grid grid-cols-3 gap-3 mb-4 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <span className="block text-xs uppercase font-semibold text-gray-400">Ngày đăng</span>
                        <span className="font-semibold text-gray-700">{postDateText}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase font-semibold text-gray-400">Ngày kết thúc</span>
                        <span className="font-semibold text-gray-700">{deadlineDateText}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase font-semibold text-gray-400">Tổng tiền</span>
                        <span className="font-bold text-green-700">
                          <MoneyDisplay amount={p.budget} />
                        </span>
                      </div>
                    </div>

                    {/* ── Skill tags ── */}
                    {skills.length > 0 && (
                      <div className="mb-4">
                        <SkillTags
                          skills={skills}
                          maxVisible={SKILL_VISIBLE_COUNT.project}
                        />
                      </div>
                    )}

                    {/* ── Progress bar (always shown) ── */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-500">
                          Milestone Progress
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* ── Bottom row: action ── */}
                    <div className="flex items-center justify-end pt-1">
                      <Link
                        to={btnCfg.linkTo?.(p) || `/client/projects/${p.id}`}
                        state={{ from: location.pathname }}
                        className={`h-11 px-5 rounded-[14px] text-base font-semibold transition-colors whitespace-nowrap inline-flex items-center ${btnCfg.className}`}
                      >
                        {btnCfg.label}
                      </Link>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>
      </div>
    </div>
  );
}
