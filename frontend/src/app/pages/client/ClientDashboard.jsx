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

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

/** Statuses that should NOT appear in My Projects */
const HIDDEN_FROM_MY_PROJECTS = [
  "draft",
  "posted",
  "waiting_proposal",
  "proposal_received",
  "contract_draft",
  "contract_sent",
  "contract_rejected",
  "cancelled",
];

/** Check if a project should appear in My Projects (contract signed/accepted) */
function canShowInMyProjects(project) {
  const contractStatus = (project.contractStatus || "").toLowerCase();
  const projectStatus = (project.status || "").toLowerCase();
  // Show if contract is accepted/signed OR project is in progress/active
  if (
    contractStatus === "accepted" ||
    contractStatus === "signed" ||
    projectStatus === "in_progress" ||
    projectStatus === "in progress" ||
    projectStatus === "active"
  ) {
    return true;
  }
  // Explicitly hide these statuses
  if (HIDDEN_FROM_MY_PROJECTS.some((s) => projectStatus === s || contractStatus === s)) {
    return false;
  }
  // For backward compatibility: if status is not hidden and not explicitly accepted,
  // still show projects that have an assigned expert (likely already in progress)
  if (project.assignedExpertId || project.expertId) {
    return true;
  }
  return false;
}

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
  const [recommendedExperts, setRecommendedExperts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return;
      setLoading(true);
      
      // Load user projects
      try {
        const userRes = await api.users.getById(user.id);
        setClientProjects(userRes?.jobPosts || []);
      } catch (err) {
        console.error("Error loading client projects:", err);
      }

      // Load recommended experts (handle 403 gracefully)
      try {
        const allUsersRes = await api.experts.list();
        const expertsOnly = (allUsersRes || [])
          .filter((u) => u.role?.toLowerCase() === "expert" && u.expertProfile)
          .map((u) => ({
            id: u.id,
            fullName: u.fullName,
            avgRating: 4.8,
            profile: {
              title: u.expertProfile.jobTitle,
              location: u.expertProfile.location,
              bio: u.expertProfile.bio,
              hourlyRate: 65,
              completedProjects: 8,
              skills: u.expertProfile.skills || ["Python", "Semantic Kernel"]
            }
          }));
        setRecommendedExperts(expertsOnly.slice(0, 3));
      } catch (err) {
        console.warn("Failed to load recommended experts (may lack permission):", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
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
      label: "All Project",
      value: getProjectsByStatus(["in_progress", "in progress", "published", "open"]),
      icon: Briefcase,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Billing",
      value: <MoneyDisplay amount={0} />,
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
      label: "In Progress",
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
            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm inline-flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" /> All Projects
          </Link>
          <Link
            to="/client/post-project"
            className="px-4 py-2.5 bg-blue-900 text-white rounded-xl hover:bg-blue-800 font-medium text-sm inline-flex items-center gap-2 transition-colors"
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
      {/* Two-Column Dashboard                                               */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] gap-6 items-stretch">
        {/* ================================================================ */}
        {/* LEFT PANEL — MY PROJECTS                                         */}
        {/* ================================================================ */}
        <section
          className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-w-0"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: "620px",
          }}
        >
          {/* Panel header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              My Projects
            </h2>
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {(() => {
              const myProjects = clientProjects.filter(canShowInMyProjects);
              if (myProjects.length === 0) {
                return (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  No projects yet
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Post your first project to find the right AI expert.
                </p>
                <Link
                  to="/client/post-project"
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 text-sm font-medium"
                >
                  Post a Project
                </Link>
              </div>
                );
              }
              return (
                myProjects.map((p) => {
                // TODO: Replace with API calls for expert info and proposals
                const assignedExpert = null;
                const progress = getProjectProgress(p.id);
                const statusKey = deriveProjectStatusKey(p, {
                  proposalCount: 0,
                });
                const displayStatus = getStatusLabel(statusKey);
                const badgeClass = getStatusBadgeClass(statusKey);
                const btnCfg = getClientButtonConfig(statusKey);
                
                const skills = p.jobPostSkills?.map((s) => s.skill?.name) || p.requiredSkills || [];
                const deadlineText = (() => {
                  if (!p.deadline) return "N/A";
                  const num = Number(p.deadline);
                  if (!isNaN(num) && num < 1000) return `${num} days`;
                  try {
                    return new Date(p.deadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  } catch {
                    return String(p.deadline);
                  }
                })();

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

                    {/* ── Expert name (if assigned) ── */}
                    <p className="text-sm text-gray-500 mb-3">
                      {assignedExpert ? (
                        <>
                          with{" "}
                          <span className="font-medium text-gray-700">
                            {assignedExpert.fullName}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">
                          No expert assigned yet
                        </span>
                      )}
                    </p>

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

                    {/* ── Bottom row: due date, budget, action ── */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Due {deadlineText}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <MoneyDisplay amount={p.budget} />
                        </span>
                      </div>
                      <Link
                        to={btnCfg.linkTo?.(p) || `/client/projects/${p.id}`}
                        state={{ from: location.pathname }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${btnCfg.className}`}
                      >
                        {btnCfg.label}
                      </Link>
                    </div>
                  </div>
                );
              })
            )})()}
          </div>
        </section>

        {/* ================================================================ */}
        {/* RIGHT PANEL — RECOMMENDED EXPERTS                                */}
        {/* ================================================================ */}
        <section
          className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-w-0"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: "620px",
          }}
        >
          {/* Panel header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Recommended Experts
            </h2>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {recommendedExperts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  No experts available
                </h3>
                <p className="text-sm text-gray-400">
                  Check back later for expert recommendations.
                </p>
              </div>
            ) : (
              recommendedExperts.map((expert) => (
                <div
                  key={expert.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                >
                  {/* ── Top: name + rating badge ── */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">
                      {expert.fullName}
                    </h3>
                    <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                      {expert.avgRating}
                    </span>
                  </div>

                  {/* ── Title + location ── */}
                  <p className="text-xs text-gray-500 mb-2.5">
                    {expert.profile?.title || "AI Expert"}
                    {expert.profile?.location ? (
                      <>
                        {" · "}
                        <span className="font-medium text-gray-600">
                          {expert.profile.location}
                        </span>
                      </>
                    ) : null}
                  </p>

                  {/* ── Bio ── */}
                  {expert.profile?.bio && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                      {expert.profile.bio}
                    </p>
                  )}

                  {/* ── Skill tags ── */}
                  {expert.profile?.skills?.length > 0 && (
                    <div className="mb-3">
                      <SkillTags
                        skills={expert.profile.skills}
                        maxVisible={SKILL_VISIBLE_COUNT.expert}
                      />
                    </div>
                  )}

                  {/* ── Stats ── */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-900">
                        {expert.profile?.completedProjects || 0}
                      </span>{" "}
                      projects
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-900">
                        ${expert.profile?.hourlyRate || 0}
                      </span>
                      /hr
                    </span>
                  </div>

                  {/* ── Action ── */}
                  <Link
                    to={`/client/experts/${expert.id}`}
                    className="block w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium text-center transition-colors"
                  >
                    View Profile
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
