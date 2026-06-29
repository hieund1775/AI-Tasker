import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";

import {
  Briefcase,
  Clock,
  CheckCircle2,
  PlusCircle,
  Calendar,
  User,
  Star,
  TrendingUp,
  FileText,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { createReport } from "../../../services/reportService.js";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { safeNumberFormat, safeDateFormat } from "../../lib/safety.js";
import { cn } from "../../lib/utils.js";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
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

function computeExpertRating(_expertId) {
  return null;
}

const formatDate = (dateStr) => {
  return safeDateFormat(dateStr, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }, String(dateStr || "N/A"));
};

const getDeadlineDate = (createdAt, deadline) => {
  if (!deadline) return "N/A";
  const num = Number(deadline);
  if (!Number.isNaN(num) && num < 1000) {
    const start = createdAt ? new Date(createdAt) : new Date();
    if (Number.isNaN(start.getTime())) return "N/A";
    const end = new Date(start.getTime() + num * 24 * 60 * 60 * 1000);
    return safeDateFormat(end, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
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

  const [reportingProject, setReportingProject] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const handleSubmitReport = async (reportData) => {
    setReportSubmitting(true);
    try {
      await createReport({
        ...reportData,
        reporterRole: "client",
        reportType: "type1"
      });
      setShowReportForm(false);
      setReportingProject(null);
      toast.success("Báo cáo vi phạm đã được gửi tới Admin thành công.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Không thể gửi báo cáo vi phạm.");
    } finally {
      setReportSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return;
      setLoading(true);

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
      value: getProjectsByStatus(["in_progress", "in progress", "active", "disputed", "under_review", "under review"]),
      icon: Briefcase,
      color: "text-primary bg-primary-light",
    },
    {
      label: "Wallet Balance",
      value: <MoneyDisplay amount={walletBalance} />,
      icon: Wallet,
      color: "text-accent bg-accent-light",
    },
    {
      label: "Completed",
      value: getProjectsByStatus(["completed", "complete"]),
      icon: CheckCircle2,
      color: "text-success bg-success-light",
    },
    {
      label: "Cancelled",
      value: getProjectsByStatus(["cancelled", "cancel"]),
      icon: Clock,
      color: "text-destructive bg-destructive-light",
    },
  ];

  // ---- Render --------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Manage your AI projects and find experts</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/client/my-projects"
            className="h-9 px-4 border border-border text-foreground rounded-lg hover:bg-secondary font-medium text-sm inline-flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" /> All Projects
          </Link>
          <Link
            to="/client/post-project"
            className="h-9 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium text-sm inline-flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Post New Project
          </Link>
        </div>
      </div>

      {/* Hero Welcome Banner */}
      <div className="relative bg-gradient-to-br from-accent/[0.06] via-accent/[0.02] to-violet-500/[0.03] rounded-2xl border border-border/50 shadow-sm p-6 mb-8 overflow-hidden group">
        <div className="absolute inset-0 brand-neural opacity-10 pointer-events-none" />
        {/* Subtle animated shimmer on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
              <User className="w-6 h-6 text-accent" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-accent/8 blur-lg -z-[1] animate-sparkle-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your AI projects and find the right experts
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <DashboardStats stats={dashboardStats} size="sm" className="mb-8" />

      {/* My Projects Section */}
      <section className="bg-card rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="section-header">My Projects</h2>
          <span className="text-xs text-muted-foreground">
            {getProjectsByStatus(["in_progress", "in progress", "active", "disputed", "under_review", "under review"])} active
          </span>
        </div>

        <div className="p-6">
          {(() => {
            const activeProjects = clientProjects.filter((p) => {
              const s = p.status?.toLowerCase() || "";
              return s === "active" || s === "in_progress" || s === "in progress" || s === "disputed" || s === "under_review" || s === "under review";
            });

            if (loading) {
              return (
                <div className="py-8">
                  <LoadingSkeleton variant="dashboard" />
                </div>
              );
            }

            if (activeProjects.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground/60 mb-2">
                    No active projects yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-sm">
                    Confirm escrow deposits on your accepted proposals to activate projects.
                  </p>
                  <Link
                    to="/client/my-projects"
                    className="h-9 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover text-sm font-medium inline-flex items-center"
                  >
                    View My Projects
                  </Link>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {activeProjects.map((p) => {
                  const assignedExpert = p.assignedExpert;
                  const progress = getProjectProgress(p.id);
                  const statusKey = deriveProjectStatusKey(p, { proposalCount: 0 });
                  const displayStatus = getStatusLabel(statusKey);
                  const badgeClass = getStatusBadgeClass(statusKey);
                  const btnCfg = getClientButtonConfig(statusKey);

                  const skills = p.jobPostSkills?.map((s) => s.skill?.name) || p.requiredSkills || [];
                  const postDateText = p.createdAt ? formatDate(p.createdAt) : "N/A";
                  const deadlineDateText = getDeadlineDate(p.createdAt, p.deadline);

                  const isDisputed = ["disputed", "under_review", "under review"].includes(p.status?.toLowerCase());

                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "bg-card border rounded-xl p-5 hover:shadow-sm transition-all duration-200",
                        "card-reveal",
                        `card-reveal-${((activeProjects.indexOf(p) % 12) + 1)}`,
                        isDisputed
                          ? "border-red-800 bg-gradient-to-r from-red-950 to-red-900 text-red-100 shadow-lg shadow-red-900/30"
                          : "border-border hover:border-border/80"
                      )}
                    >
                      {/* Top row: title + status badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className={cn("font-semibold text-base leading-snug", isDisputed ? "text-red-100" : "text-foreground")}>
                          {p.title}
                        </h3>
                        <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${badgeClass}`}>
                          {displayStatus}
                        </span>
                      </div>

                      {/* Expert name */}
                      <p className={cn("text-sm mb-3", isDisputed ? "text-red-200/70" : "text-muted-foreground")}>
                        {assignedExpert ? (
                          <>
                            Expert:{" "}
                            <span className={cn("font-medium", isDisputed ? "text-red-100" : "text-foreground")}>
                              {assignedExpert.fullName}
                            </span>
                          </>
                        ) : (
                          <span className={cn("italic", isDisputed ? "text-red-300/60" : "text-muted-foreground/60")}>
                            No expert assigned yet
                          </span>
                        )}
                      </p>

                      {/* Category & Specialization */}
                      {(p.aiCategoryDomain?.name || p.category || p.specialization) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(p.aiCategoryDomain?.name || p.category) && (
                            <span className="px-2.5 py-0.5 bg-secondary text-muted-foreground rounded-md text-xs font-medium">
                              {p.aiCategoryDomain?.name || p.category}
                            </span>
                          )}
                          {p.specialization && (
                            <span className="px-2.5 py-0.5 bg-accent-light text-accent rounded-md text-xs font-medium">
                              {p.specialization}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Dates & Money info */}
                      <div className={cn(
                        "grid grid-cols-3 gap-3 mb-4 rounded-lg p-3 border",
                        isDisputed
                          ? "bg-red-900/40 border-red-700/50"
                          : "bg-secondary/40 border-border/60"
                      )}>
                        <div>
                          <span className={cn("block text-[11px] uppercase font-semibold tracking-[0.04em]", isDisputed ? "text-red-300/70" : "text-muted-foreground")}>Posted</span>
                          <span className={cn("font-medium text-sm", isDisputed ? "text-red-100" : "text-foreground")}>{postDateText}</span>
                        </div>
                        <div>
                          <span className={cn("block text-[11px] uppercase font-semibold tracking-[0.04em]", isDisputed ? "text-red-300/70" : "text-muted-foreground")}>Deadline</span>
                          <span className={cn("font-medium text-sm", isDisputed ? "text-red-100" : "text-foreground")}>{deadlineDateText}</span>
                        </div>
                        <div>
                          <span className={cn("block text-[11px] uppercase font-semibold tracking-[0.04em]", isDisputed ? "text-red-300/70" : "text-muted-foreground")}>Budget</span>
                          <span className={cn("font-bold text-sm", isDisputed ? "text-red-200" : "text-success")}>
                            <MoneyDisplay amount={p.budget} />
                          </span>
                        </div>
                      </div>

                      {/* Skill tags */}
                      {skills.length > 0 && (
                        <div className="mb-4">
                          <SkillTags
                            skills={skills}
                            maxVisible={SKILL_VISIBLE_COUNT.project}
                          />
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Progress
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom row: actions */}
                      <div className="flex items-center justify-end pt-1 gap-3">
                        {!["disputed", "under_review", "under review"].includes(p.status?.toLowerCase()) && (
                          <button
                            onClick={() => {
                              setReportingProject(p);
                              setShowReportForm(true);
                            }}
                            className="h-9 px-4 border border-destructive/20 text-destructive bg-destructive-light hover:bg-destructive/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Report
                          </button>
                        )}
                        <Link
                          to={btnCfg.linkTo?.(p) || `/client/projects/${p.id}`}
                          state={{ from: location.pathname }}
                          className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap inline-flex items-center ${btnCfg.className}`}
                        >
                          {btnCfg.label}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      {/* REPORT FORM DIALOG */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Report Expert Violation
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
