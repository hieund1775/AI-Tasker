import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Briefcase,
  TrendingUp,
  CheckCircle,
  Search,
  Calendar,
  DollarSign,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";

import {
  getProjectProgress,
  deriveProjectStatusKey,
  getStatusLabel,
  getStatusBadgeClass,
  getExpertButtonConfig,
} from "../../lib/projectTimelineStore.js";
import { timeAgo } from "../../lib/dateUtils.js";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a project should appear in active contracts (contract accepted/signed) */
function isContractActive(project) {
  const contractStatus = (project.contractStatus || "").toLowerCase();
  const projectStatus = (project.status || "").toLowerCase();
  return (
    contractStatus === "accepted" ||
    contractStatus === "signed" ||
    projectStatus === "in_progress" ||
    projectStatus === "in progress" ||
    projectStatus === "active"
  );
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

// Number of visible skill tags before the "+N" overflow badge
const SKILL_VISIBLE_COUNT = {
  active: 4,
  recommended: 3,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExpertDashboard() {
  const { user } = useAuth();

  const [activeContracts, setActiveContracts] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [expertProposals, setExpertProposals] = useState([]);
  const [recommendedProjects, setRecommendedProjects] = useState([]);
  const [expertDetails, setExpertDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return;
      setLoading(true);
      
      // Load user details (projects, proposals)
      try {
        const userRes = await api.users.getById(user.id);
        setExpertDetails(userRes);
        
        const allUserProjects = userRes.projects || [];
        setActiveContracts(
          allUserProjects.filter(
            (p) => isContractActive(p)
          )
        );
        setCompletedProjects(
          allUserProjects.filter(
            (p) => p.status?.toLowerCase() === "completed" || p.status?.toLowerCase() === "complete"
          )
        );
        
        setExpertProposals(userRes.proposals || []);
      } catch (err) {
        console.error("Error loading expert dashboard details:", err);
      }

      // Load recommended jobs from recommendation API
      try {
        const recs = await api.get("/recommendations/jobs", {
          params: { expertId: user.id, limit: 10 },
        });
        const jobsList = (Array.isArray(recs) ? recs : []).map((r) => ({
          id: r.jobId || r.id,
          title: r.title,
          description: r.description,
          budget: r.budget,
          deadline: r.deadline,
          status: r.status,
          createdAt: r.createdAt,
          client: r.clientName,
          category: r.categoryName || r.matchedCategory,
          matchScore: r.score != null ? Math.round(Number(r.score)) : null,
          jobPostSkills: (r.matchedSkills || []).map((s) => ({
            skill: { name: typeof s === "string" ? s : s.name || s },
          })),
          requiredSkills: [],
        }));
        setRecommendedProjects(jobsList);
      } catch (err) {
        console.error("Error loading recommended jobs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user?.id]);

  // ---- Computed stat values ------------------------------------------------
  const earningsDisplay = expertDetails?.wallet?.balance || 0;
  const totalAssigned = completedProjects.length + activeContracts.length;
  const successRate =
    totalAssigned > 0
      ? Math.round((completedProjects.length / totalAssigned) * 100)
      : 0;

  // ---- Stats ---------------------------------------------------------------
  const dashboardStats = [
    {
      label: "Active Contracts",
      value: activeContracts.length,
      icon: Briefcase,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Total Earned",
      value: <MoneyDisplay amount={earningsDisplay} />,
      icon: TrendingUp,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "My Wallet",
      value: <MoneyDisplay amount={earningsDisplay} />,
      icon: Wallet,
      color: "text-amber-600 bg-amber-100",
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
          <h1 className="text-2xl font-bold text-gray-900">
            Expert Dashboard
          </h1>
          <p className="text-gray-500 mt-0.5">
            Manage your contracts and discover new opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/expert/find-jobs"
            className="px-4 py-2.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 font-medium text-sm inline-flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" /> Browse All Jobs
          </Link>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Stats Row                                                          */}
      {/* ================================================================== */}
      <DashboardStats stats={dashboardStats} size="sm" className="mb-6" />

      {/* ================================================================== */}
      {/* Two-Column Dashboard                                               */}
      {/* ================================================================== */}
      <div className="expert-dashboard-grid grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] gap-6 items-stretch">
        {/* ================================================================ */}
        {/* LEFT PANEL — MY ACTIVE CONTRACTS                                 */}
        {/* ================================================================ */}
        <section
          className="expert-dashboard-panel bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-w-0"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: "620px",
          }}
        >
          {/* Panel header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              My Active Contracts
            </h2>
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex justify-between mb-3">
                    <LoadingSkeleton className="h-5 w-2/3" />
                    <LoadingSkeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <LoadingSkeleton className="h-3 w-1/3 mb-3" />
                  <div className="flex gap-2 mb-3">
                    <LoadingSkeleton className="h-5 w-16 rounded-md" />
                    <LoadingSkeleton className="h-5 w-20 rounded-md" />
                    <LoadingSkeleton className="h-5 w-14 rounded-md" />
                  </div>
                  <LoadingSkeleton className="h-2 w-full rounded-full mb-3" />
                  <div className="flex justify-between">
                    <LoadingSkeleton className="h-4 w-32" />
                    <LoadingSkeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))
            ) : activeContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  No active contracts
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Browse available jobs and submit proposals.
                </p>
                <Link
                  to="/expert/find-jobs"
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-sm font-medium"
                >
                  Find Jobs
                </Link>
              </div>
            ) : (
              activeContracts.map((p) => {
                const clientName = p.client || "Client";
                const progress = getProjectProgress(p.id);
                const statusKey = deriveProjectStatusKey(p);
                const displayStatus = getStatusLabel(statusKey);
                const badgeClass = getStatusBadgeClass(statusKey);
                const btnCfg = getExpertButtonConfig(statusKey);
                const skills = p.jobPostSkills?.map((s) => s.skill?.name) || p.requiredSkills || [];

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    {/* ── Top row: title + status badge ── */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">
                        {p.title}
                      </h3>
                      <span
                        className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    {/* ── Client name ── */}
                    <p className="text-sm text-gray-500 mb-3">
                      with{" "}
                      <span className="font-medium text-gray-700">
                        {clientName}
                      </span>
                    </p>

                    {/* ── Skill tags ── */}
                    <div className="mb-4">
                      <SkillTags
                        skills={skills}
                        maxVisible={SKILL_VISIBLE_COUNT.active}
                      />
                    </div>

                    {/* ── Progress bar ── */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-500">
                          Milestone Progress
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* ── Bottom row: due date, value, action ── */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Due{" "}
                          {p.deadline
                            ? new Date(p.deadline).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )
                            : "N/A"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <MoneyDisplay amount={p.budget} />
                        </span>
                      </div>
                      {btnCfg.disabled ? (
                        <span
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${btnCfg.className}`}
                        >
                          {btnCfg.label}
                        </span>
                      ) : (
                        <Link
                          to={btnCfg.linkTo?.(p) || `/expert/projects/${p.id}`}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${btnCfg.className}`}
                        >
                          {btnCfg.label}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ================================================================ */}
        {/* RIGHT PANEL — RECOMMENDED PROJECTS                               */}
        {/* ================================================================ */}
        <section
          className="expert-dashboard-panel bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-w-0"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: "620px",
          }}
        >
          {/* Panel header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Recommended Projects
              </h2>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            {recommendedProjects.length > 0 && (
              <Link
                to="/expert/find-jobs"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex justify-between mb-3">
                    <LoadingSkeleton className="h-5 w-2/3" />
                    <LoadingSkeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <LoadingSkeleton className="h-3 w-1/2 mb-2" />
                  <LoadingSkeleton className="h-4 w-full mb-3" />
                  <div className="flex gap-2 mb-3">
                    <LoadingSkeleton className="h-5 w-16 rounded-md" />
                    <LoadingSkeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <div className="flex justify-between">
                    <LoadingSkeleton className="h-4 w-20" />
                    <LoadingSkeleton className="h-4 w-16" />
                  </div>
                </div>
              ))
            ) : recommendedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  No recommendations yet
                </h3>
                <p className="text-sm text-gray-400">
                  Complete your profile to get personalized recommendations.
                </p>
              </div>
            ) : (
              recommendedProjects.map((p, idx) => {
                const clientName = p.client || "Client";
                const matchPct = p.matchScore != null ? `${p.matchScore}%` : "—";
                const skills = p.jobPostSkills?.map((s) => s.skill?.name) || p.requiredSkills || [];

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    {/* ── Top: title + match badge ── */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">
                        {p.title}
                      </h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                        {p.matchScore != null ? `${p.matchScore}% match` : "—"}
                      </span>
                    </div>

                    {/* ── Posted by + time ── */}
                    <p className="text-xs text-gray-500 mb-2.5">
                      Posted by{" "}
                      <span className="font-medium text-gray-600">
                        {clientName}
                      </span>
                      {" · "}
                      {timeAgo(p.createdAt)}
                    </p>

                    {/* ── Description ── */}
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* ── Skill tags ── */}
                    <div className="mb-3">
                      <SkillTags
                        skills={skills}
                        maxVisible={SKILL_VISIBLE_COUNT.recommended}
                      />
                    </div>

                    {/* ── Budget + Duration ── */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-semibold text-gray-900 text-sm">
                        <MoneyDisplay amount={p.budget} />
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-500 text-xs">
                        {p.deadline || p.durationValue || 0} {p.durationUnit || "days"}
                      </span>
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to={`/expert/jobs/${p.id}/proposal`}
                        className="px-4 py-2.5 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-sm font-medium text-center transition-colors"
                      >
                        Apply Now
                      </Link>
                      <Link
                        to={`/expert/jobs/${p.id}`}
                        className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium text-center transition-colors"
                      >
                        View Job
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
