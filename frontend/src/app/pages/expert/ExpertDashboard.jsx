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
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";

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
import { getRecommendedProjects } from "../../lib/recommendationHelper.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a display-only match percentage from the index. */
/** Derive a display-only match percentage from the index. */
function getMatchPct(index) {
  return [96, 89, 84, 78, 92, 88, 81][index % 7];
}

/** Compute a real matching score percentage based on Category, Specialization, and Skills */
function calculateMatchPct(job, expertProfile, allSkills) {
  if (!expertProfile) return 75;
  
  let matchScore = 0;
  
  // Category match (40%)
  const expertCategory = expertProfile.category || "";
  const jobCat = job.category || job.aiCategoryDomain?.name || "";
  if (jobCat && expertCategory && jobCat.toLowerCase() === expertCategory.toLowerCase()) {
    matchScore += 40;
  }
  
  // Specialization match (30%)
  const expertSpecialization = expertProfile.specialization || expertProfile.major || "";
  const jobSpec = job.specialization || "";
  if (jobSpec && expertSpecialization && jobSpec.toLowerCase() === expertSpecialization.toLowerCase()) {
    matchScore += 30;
  }
  
  // Skills match (30%)
  const expertSkills = expertProfile.skills || [];
  const expertSkillsResolved = expertSkills.map(sk => {
    if (typeof sk === "string" && sk.startsWith("skill-") && Array.isArray(allSkills)) {
      const match = allSkills.find(s => s.id === sk);
      return match ? match.name : sk;
    }
    return typeof sk === "string" ? sk : sk?.name || "";
  });
  
  const jobSkills = job.jobPostSkills?.map((s) => s.skill?.name) || job.requiredSkills || [];
  if (jobSkills.length === 0) {
    matchScore += 30;
  } else {
    let matches = 0;
    jobSkills.forEach(js => {
      const hasSkill = expertSkillsResolved.some(es => es.toLowerCase() === js.toLowerCase());
      if (hasSkill) matches++;
    });
    matchScore += Math.round((matches / jobSkills.length) * 30);
  }
  
  return Math.min(100, Math.max(0, matchScore));
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
      
      let expertProfile = null;
      // Load user details (projects, proposals)
      try {
        const userRes = await api.users.getById(user.id);
        setExpertDetails(userRes);
        expertProfile = userRes?.expertProfile;
        
        const allUserProjects = userRes.projects || [];
        setActiveContracts(
          allUserProjects.filter(
            (p) => p.status?.toLowerCase() === "in_progress" || p.status?.toLowerCase() === "in progress" || p.status?.toLowerCase() === "active"
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

      // Load skills mapping to resolve IDs
      let allSkills = [];
      try {
        const skillsRes = await api.get("/category-tags/skills");
        if (Array.isArray(skillsRes)) {
          allSkills = skillsRes;
        }
      } catch (e) {
        console.error("Error fetching skills list for matching:", e);
      }

      // Load recommended/open jobs
      try {
        const jobsList = await api.jobPosts.list();
        const openJobs = (jobsList || []).filter(
          (j) => j.status?.toLowerCase() === "open" || j.status?.toLowerCase() === "published"
        );
        
        // Lọc và sắp xếp theo thuật toán gợi ý mới từ helper
        const recommendedJobs = getRecommendedProjects(expertProfile, openJobs, allSkills);
        setRecommendedProjects(recommendedJobs.slice(0, 5));
      } catch (err) {
        console.error("Error loading open jobs:", err);
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
      color: "text-brand-primary bg-brand-primary-light",
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
            className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover font-semibold text-base inline-flex items-center gap-2 transition-colors"
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
            <h2 className="text-[15px] font-semibold text-gray-900 uppercase tracking-wider">
              My Active Contracts
            </h2>
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {activeContracts.length === 0 ? (
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
                  className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center"
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
                      <h3 className="font-semibold text-gray-900 text-lg leading-snug">
                        {p.title}
                      </h3>
                      <span
                        className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    {/* ── Client name ── */}
                    <p className="text-base text-gray-500 mb-3">
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

                    {/* ── Bottom row: due date, value, action ── */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
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
                          className={`h-11 px-5 rounded-[14px] text-base font-semibold transition-colors whitespace-nowrap inline-flex items-center ${btnCfg.className}`}
                        >
                          {btnCfg.label}
                        </span>
                      ) : (
                        <Link
                          to={btnCfg.linkTo?.(p) || `/expert/projects/${p.id}`}
                          className={`h-11 px-5 rounded-[14px] text-base font-semibold transition-colors whitespace-nowrap inline-flex items-center ${btnCfg.className}`}
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
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-gray-900 uppercase tracking-wider">
              Recommended Projects
            </h2>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {recommendedProjects.length === 0 ? (
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
                const matchPct = p.matchPct !== undefined ? p.matchPct : getMatchPct(idx);
                const skills = p.jobPostSkills?.map((s) => s.skill?.name) || p.requiredSkills || [];

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    {/* ── Top: title + match badge ── */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg leading-snug">
                        {p.title}
                      </h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                        {matchPct}% match
                      </span>
                    </div>

                    {/* ── Posted by + time ── */}
                    <p className="text-[13px] text-gray-500 mb-2.5">
                      Posted by{" "}
                      <span className="font-medium text-gray-600">
                        {clientName}
                      </span>
                      {" · "}
                      {timeAgo(p.createdAt)}
                    </p>

                    {/* ── Description ── */}
                    <p className="text-base text-gray-500 mb-3 line-clamp-2 leading-relaxed">
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
                      <span className="font-semibold text-gray-900 text-base">
                        <MoneyDisplay amount={p.budget} />
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-500 text-[13px]">
                        {p.deadline || p.durationValue || 0} {p.durationUnit || "days"}
                      </span>
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to={`/expert/jobs/${p.id}/proposal`}
                        className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold text-center transition-colors inline-flex items-center justify-center"
                      >
                        Apply Now
                      </Link>
                      <Link
                        to={`/expert/jobs/${p.id}`}
                        className="h-11 px-5 border border-gray-300 text-gray-700 rounded-[14px] hover:bg-gray-50 text-base font-semibold text-center transition-colors inline-flex items-center justify-center"
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
