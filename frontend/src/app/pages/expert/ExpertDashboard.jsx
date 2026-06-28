import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Briefcase,
  TrendingUp,
  CheckCircle,
  Search,
  Calendar,
  ReceiptText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { createReport } from "../../../services/reportService.js";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { cn } from "../../lib/utils.js";
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
import { safeDateFormat } from "../../lib/safety.js";

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

  // Dispute reporting states
  const [reportingProject, setReportingProject] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const handleSubmitReport = async (reportData) => {
    setReportSubmitting(true);
    try {
      await createReport({
        ...reportData,
        reporterRole: "expert",
        reportType: "type2"
      });
      setShowReportForm(false);
      setReportingProject(null);
      toast.success("Báo cáo vi phạm thanh toán đã được gửi tới Admin thành công.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể gửi báo cáo tranh chấp.");
    } finally {
      setReportSubmitting(false);
    }
  };

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
            (p) => p.status?.toLowerCase() === "in_progress" || p.status?.toLowerCase() === "in progress" || p.status?.toLowerCase() === "active" || p.status?.toLowerCase() === "disputed" || p.status?.toLowerCase() === "under_review" || p.status?.toLowerCase() === "under review"
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
      color: "text-success bg-success-light",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: CheckCircle,
      color: "text-accent bg-accent-light",
    },
    {
      label: "Completed",
      value: completedProjects.length,
      icon: Calendar,
      color: "text-brand-primary bg-brand-primary-light",
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
          <h1 className="page-title">Expert Dashboard</h1>
          <p className="page-subtitle">
            Manage your contracts and discover new opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/expert/find-jobs"
            className="h-11 px-5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover font-semibold text-sm inline-flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" /> Browse All Jobs
          </Link>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-br from-accent/[0.07] via-accent/[0.03] to-primary/[0.04] rounded-2xl border border-border/60 shadow-sm p-5 mb-6 overflow-hidden group">
        <div className="absolute inset-0 brand-neural opacity-15 pointer-events-none" />
        {/* Subtle animated shimmer on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-accent/10 blur-md -z-[1]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your contracts and discover new opportunities
            </p>
          </div>
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
          className="expert-dashboard-panel bg-card rounded-2xl border border-border shadow-sm flex flex-col min-w-0"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: "620px",
          }}
        >
          {/* Panel header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center">
            <h2 className="text-[15px] font-semibold text-foreground uppercase tracking-wider">
              My Active Contracts
            </h2>
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {activeContracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                  No active contracts
                </h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Browse available jobs and submit proposals.
                </p>
                <Link
                  to="/expert/find-jobs"
                  className="h-11 px-5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover text-sm font-semibold inline-flex items-center"
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
                const isDisputed = ["disputed", "under_review", "under review"].includes(p.status?.toLowerCase());

                return (
                  <div
                    key={p.id}
                    className={cn(
                      "bg-card border rounded-xl p-5 transition-colors",
                      "card-reveal",
                      `card-reveal-${((activeContracts.indexOf(p) % 12) + 1)}`,
                      isDisputed
                        ? "border-red-800 bg-gradient-to-r from-red-950 to-red-900 text-red-100 shadow-lg shadow-red-900/30"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    {/* ── Top row: title + status badge ── */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <h3 className={cn("font-semibold text-base leading-snug", isDisputed ? "text-red-100" : "text-foreground")}>
                        {p.title}
                      </h3>
                      <span
                        className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                      >
                        {displayStatus}
                      </span>
                    </div>

                    {/* ── Client name ── */}
                    <p className={cn("text-sm mb-3", isDisputed ? "text-red-200/70" : "text-muted-foreground")}>
                      with{" "}
                      <span className={cn("font-medium", isDisputed ? "text-red-100" : "text-foreground")}>
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
                        <span className={cn("text-sm font-medium", isDisputed ? "text-red-300/70" : "text-muted-foreground")}>
                          Milestone Progress
                        </span>
                        <span className={cn("text-sm font-bold", isDisputed ? "text-red-100" : "text-foreground")}>
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", isDisputed ? "bg-red-500" : "bg-primary")}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* ── Bottom row: due date, value, action ── */}
                    <div className="flex items-center justify-between pt-1">
                      <div className={cn("flex items-center gap-4 text-sm", isDisputed ? "text-red-200/70" : "text-muted-foreground")}>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Due{" "}
                          {safeDateFormat(p.deadline, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 font-semibold", isDisputed ? "text-red-100" : "text-foreground")}>
                          <ReceiptText className="w-3.5 h-3.5 text-muted-foreground" />
                          <MoneyDisplay amount={p.budget} />
                        </span>
                      </div>
                      <div className="flex items-center">
                        {!isDisputed && (
                          <button
                            onClick={() => {
                              setReportingProject(p);
                              setShowReportForm(true);
                            }}
                            className="mr-3 h-11 px-4 border border-destructive/20 text-destructive bg-destructive-light hover:bg-destructive/10 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4" /> Báo cáo vi phạm
                          </button>
                        )}
                        {isDisputed && (
                          <span className="mr-3 h-11 px-4 border border-red-500/30 text-red-300 bg-red-900/40 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> Under Admin Review
                          </span>
                        )}
                        {btnCfg.disabled ? (
                          <span
                            className={`h-11 px-5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap inline-flex items-center ${btnCfg.className}`}
                          >
                            {btnCfg.label}
                          </span>
                        ) : (
                          <Link
                            to={btnCfg.linkTo?.(p) || `/expert/projects/${p.id}`}
                            className={`h-11 px-5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap inline-flex items-center ${btnCfg.className}`}
                          >
                            {btnCfg.label}
                          </Link>
                        )}
                      </div>
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
          className="expert-dashboard-panel bg-card rounded-2xl border border-border shadow-sm flex flex-col min-w-0"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: "620px",
          }}
        >
          {/* Panel header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-foreground uppercase tracking-wider">
              Recommended Projects
            </h2>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>

          {/* Scrollable card list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {recommendedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                  No recommendations yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Complete your profile to get personalized project recommendations.
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
                    className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors"
                  >
                    {/* ── Top: title + match badge ── */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-foreground text-base leading-snug">
                        {p.title}
                      </h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-success-light text-success rounded-full text-xs font-bold">
                        {matchPct}% match
                      </span>
                    </div>

                    {/* ── Posted by + time ── */}
                    <p className="text-[13px] text-muted-foreground mb-2.5">
                      Posted by{" "}
                      <span className="font-medium text-foreground/70">
                        {clientName}
                      </span>
                      {" · "}
                      {timeAgo(p.createdAt)}
                    </p>

                    {/* ── Description ── */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
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
                      <span className="font-semibold text-foreground text-base">
                        <MoneyDisplay amount={p.budget} />
                      </span>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-muted-foreground text-[13px]">
                        {p.deadline || p.durationValue || 0} {p.durationUnit || "days"}
                      </span>
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to={`/expert/jobs/${p.id}/proposal`}
                        className="h-11 px-5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover text-sm font-semibold text-center transition-colors inline-flex items-center justify-center"
                      >
                        Apply Now
                      </Link>
                      <Link
                        to={`/expert/jobs/${p.id}`}
                        className="h-11 px-5 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold text-center transition-colors inline-flex items-center justify-center"
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

      {/* REPORT FORM DIALOG */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Báo cáo vi phạm Khách hàng (Expert Report Client)
            </DialogTitle>
          </DialogHeader>
          {reportingProject && (
            <ReportForm
              project={reportingProject}
              onSubmit={handleSubmitReport}
              onCancel={() => {
                setShowReportForm(false);
                setReportingProject(null);
              }}
              loading={reportSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
