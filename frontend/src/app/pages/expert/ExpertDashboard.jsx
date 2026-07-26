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
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { ReportForm } from "../../components/report/ReportForm.jsx";
import { createReport } from "../../../services/reportService.js";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { DashboardStats } from "../../components/shared/DashboardStats.jsx";

import {
  getProjectProgress,
  deriveProjectStatusKey,
  getOverallProgress,
} from "../../lib/projectTimelineStore.js";
import {
  getStatusLabel,
  getStatusBadgeClass,
  getExpertButtonConfig,
} from "../../lib/projectStatusConfig.js";
import { timeAgo } from "../../lib/dateUtils.js";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { getRecommendedProjects } from "../../lib/recommendationHelper.js";

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
    projectStatus === "active" ||
    projectStatus === "disputed" ||
    projectStatus === "awaiting_cancellation"
  );
}

/** Derive a display-only match percentage from the index. */
/** Derive a display-only match percentage from the index. */
function getMatchPct(index) {
  return [96, 89, 84, 78, 92, 88, 81][index % 7];
}

export function getNormalizedStatus(project, activeReports = []) {
  const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
  const projId = project.projectId || project.id || project.Id;
  const isReleasedLocally = projId ? localReleases.some(r => String(r.projectId).toLowerCase() === String(projId).toLowerCase()) : false;
  
  const localStatus = projId ? localStorage.getItem(`project_status_${projId}`) : null;
  const dbStatus = (project.status || project.Status || "").toLowerCase();
  let status = (localStatus || dbStatus).toLowerCase();

  // If status is awaiting_cancellation, check if it's still pending Admin approval
  // Only match by projectId — no type filtering needed.
  if (status === "awaiting_cancellation" && projId && Array.isArray(activeReports) && activeReports.length > 0) {
    const report = activeReports.find(r => {
      const rProjId = String(r.projectId || r.ProjectId || "").toLowerCase();
      const rStatus = (r.status || r.Status || "").toLowerCase();
      return rProjId === String(projId).toLowerCase() &&
             (rStatus === "pending admin" || rStatus === "pending");
    });
    if (report) {
      status = "inprogress";
    }
  }

  let label = "In Progress";
  let badgeClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";

  if (status === "completed" || status === "complete" || status === "resolved" || isReleasedLocally) {
    label = "Completed";
    badgeClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  } else if (status === "cancelled" || status === "cancel" || status === "cancel_done" || status === "contract_cancelled" || status === "awaiting_cancellation") {
    label = "Cancel";
    badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
  } else if (status === "disputed") {
    label = "Disputed";
    badgeClass = "bg-red-100 text-red-700 border border-red-200 font-semibold";
  } else {
    const hasProjectRecord = !!projId;
    const isPendingEscrow = status === "pending_escrow" || status === "pending" || dbStatus === "pending_escrow";

    const localDepositedIds = JSON.parse(localStorage.getItem("deposited_project_ids") || "[]");
    const isDeposited = projId ? localDepositedIds.some(id => String(id).toLowerCase() === String(projId).toLowerCase()) : false;

    if (!hasProjectRecord || isPendingEscrow || !isDeposited) {
      label = "Open";
      badgeClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  }

  return { label, badgeClass };
}

/** Compute a real matching score percentage based on Category, Specialization, and Skills */
function calculateMatchPct(job, expertProfile, allSkills) {
  if (!expertProfile) return 75;
  
  let matchScore = 0;
  
  // Category match (40%)
  const expertCategory = expertProfile.category || "";
  const jobCat = job.category || job.domain?.name || "";
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
  const [dashboardBalance, setDashboardBalance] = useState(0);
  const [dashboardTotalEarned, setDashboardTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dispute reporting states
  const [reportingProject, setReportingProject] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [activeReports, setActiveReports] = useState([]);
  const [explainingReport, setExplainingReport] = useState(null);
  const [showExplanationForm, setShowExplanationForm] = useState(false);
  const [explanationSubmitting, setExplanationSubmitting] = useState(false);

  const handleSubmitReport = async (reportData) => {
    setReportSubmitting(true);
    try {
      await createReport({
        ...reportData,
        reporterId: user?.id || user?.Id,
        reporterRole: "expert",
        reportType: "type2"
      });
      setShowReportForm(false);
      setReportingProject(null);
      toast.success("Payment violation report sent to Admin successfully.");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Failed to send dispute report.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleExpertSubmitExplanation = async (formData) => {
    setExplanationSubmitting(true);
    try {
      const isCancellation = explainingReport.reportType === "cancellation" || explainingReport.disputeType === "cancellation";
      if (isCancellation) {
        await api.put(`/reports/${explainingReport.id}/partner-reject-cancel`, {
          partnerRejectionReason: formData.reason || formData.description || "Decline contract cancellation request",
        });
      } else {
        const evidenceUrl = Array.isArray(formData.evidence) && formData.evidence.length > 0
          ? (typeof formData.evidence[0].file === "string" ? formData.evidence[0].file : (formData.evidence[0].name || "Uploaded file"))
          : null;
        await api.put(`/reports/${explainingReport.id}/partner-submit-response?userId=${user?.id || user?.Id}`, {
          explanation: formData.description || formData.reason || "",
          desiredResolution: formData.desiredResolution || "",
          evidenceUrl: evidenceUrl,
          userId: user?.id
        });
      }
      setShowExplanationForm(false);
      setExplainingReport(null);
      toast.success("Response explanation submitted successfully!");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    } catch (err) {
      toast.error(err.message || "Failed to submit explanation report.");
    } finally {
      setExplanationSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      const currentUserId = user?.id || user?.Id;
      if (!currentUserId) return;
      setLoading(true);
      
      let expertDataToPass = null;
      let expertProfile = null;
      let allUserProjects = [];
      // Load user details (projects, proposals, transactions)
      try {
        const [userRes, reportsRes, transactions] = await Promise.all([
          api.users.getById(currentUserId),
          api.get("/reports").catch(() => ({ data: [] })),
          api.payments.getTransactions(currentUserId).catch(() => []),
        ]);
        setExpertDetails(userRes);
        expertDataToPass = userRes;
        expertProfile = userRes?.expertProfile;
        setActiveReports(Array.isArray(reportsRes) ? reportsRes : (reportsRes?.data || []));
        
        const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
        const expertReleases = localReleases.filter(r => String(r.expertId).toLowerCase() === String(currentUserId).toLowerCase());
        allUserProjects = (userRes.projects || userRes.Projects || []).map(p => {
          const isReleasedLocally = expertReleases.some(r => String(r.projectId).toLowerCase() === String(p.id || p.Id).toLowerCase());
          const localStatus = localStorage.getItem(`project_status_${p.id || p.Id}`);
          if (isReleasedLocally || localStatus === "completed") {
            return { ...p, status: "completed", Status: "completed" };
          }
          return p;
        });

        const myTransactions = Array.isArray(transactions)
          ? transactions.map(t => ({
              id: t.id || t.Id,
              projectId: t.projectId || t.ProjectId,
              amount: t.amount ?? t.Amount,
              type: t.type ?? t.Type,
              createdAt: t.createdAt ?? t.CreatedAt,
              projectTitle: t.projectTitle || t.ProjectTitle || null,
            }))
          : [];

        const transactionProjectIds = new Set(
          myTransactions
            .filter(t => {
              const lType = t.type?.toLowerCase();
              return lType === "escrow_release" || lType === "escrowrelease" || lType === "releasepayment";
            })
            .filter(t => t.projectId)
            .map(t => String(t.projectId).toLowerCase())
        );

        const localDeposits = JSON.parse(localStorage.getItem("zalopay_deposits") || "[]");
        const userDeposits = localDeposits.filter(d => String(d.userId).toLowerCase() === String(currentUserId).toLowerCase());

        const dbDeposits = myTransactions.filter(t => {
          const lType = t.type?.toLowerCase();
          return lType === "deposit" || lType === "manualdeposit";
        });

        const wallet = userRes?.wallet || userRes?.Wallet;
        let adjustedBalance = wallet?.balance ?? 0;
        let adjustedTotalEarned = wallet?.totalEarned ?? 0;
        
        // Fallback: calculate total earned from transactions (in case backend misses dispute payouts)
        let calcEarned = 0;
        myTransactions.forEach(t => {
            const lType = t.type?.toLowerCase() || "";
            if (t.amount > 0 && t.projectId && !lType.includes("deposit") && !lType.includes("refund") && !lType.includes("withdraw")) {
                calcEarned += Number(t.amount);
            }
        });
        if (calcEarned > adjustedTotalEarned) {
            adjustedTotalEarned = calcEarned;
        }

        const parseDbDate = (str) => {
          if (!str) return 0;
          const hasTimezone = /[Z]$|[+-]\d{2}:\d{2}$/.test(str);
          return new Date(hasTimezone ? str : str + "Z").getTime();
        };

        userDeposits.forEach(d => {
          const ackKey = `zalopay_ack_${d.id}`;
          const isAcked = localStorage.getItem(ackKey) === "1";

          if (isAcked) return;

          const dTime = new Date(d.createdAt).getTime();
          const match = dbDeposits.find(dbTx => {
            const dbTime = parseDbDate(dbTx.createdAt);
            const isTimeClose = Math.abs(dbTime - dTime) <= 60 * 60 * 1000;
            const isAmountMatch = Math.abs(Number(dbTx.amount) - Number(d.amount)) < 0.01;
            return isAmountMatch && isTimeClose;
          });

          if (match) {
            try { localStorage.setItem(ackKey, "1"); } catch(e) {}
          } else {
            adjustedBalance += d.amount;
          }
        });

        allUserProjects.forEach((p) => {
          const projId = p.id || p.Id;
          const isCompleted = p.status?.toLowerCase() === "completed" || p.status?.toLowerCase() === "closed" || p.status?.toLowerCase() === "resolved";
          const isReleasedLocally = expertReleases.some(r => String(r.projectId).toLowerCase() === String(projId).toLowerCase());

          const hasDbReleaseTx = transactionProjectIds.has(String(projId).toLowerCase());
          if (isReleasedLocally && !hasDbReleaseTx && !isCompleted) {
            const budget = p.budget ?? p.Budget ?? p.escrowBalance ?? p.escrowAmount ?? 0;
            const netAmount = budget * 0.95;
            adjustedBalance += netAmount;
            adjustedTotalEarned += netAmount;
          }
        });

        expertReleases.forEach(r => {
          const releaseProjIdLower = String(r.projectId).toLowerCase();
          const hasProj = allUserProjects.some(p => String(p.id || p.Id).toLowerCase() === releaseProjIdLower);
          const hasDbReleaseTx = transactionProjectIds.has(releaseProjIdLower);
          if (!hasProj && !hasDbReleaseTx) {
            const netAmount = r.amount * 0.95;
            adjustedBalance += netAmount;
            adjustedTotalEarned += netAmount;
          }
        });

        setDashboardBalance(adjustedBalance);
        setDashboardTotalEarned(adjustedTotalEarned);

        setCompletedProjects(
          allUserProjects.filter(
            (p) => ["completed", "complete", "cancel_done"].includes((p.status || p.Status || "").toLowerCase())
          )
        );

        // Enrich active contracts with client name and job post details (category, specialization)
        const activeProjList = allUserProjects.filter((p) => {
          const norm = getNormalizedStatus(p, activeReports);
          return ["In Progress", "Completed", "Cancel", "Disputed"].includes(norm.label);
        });

        setActiveContracts(activeProjList); // Set initially to avoid blank screen while loading details

        const enrichedProjects = await Promise.all(
          activeProjList.map(async (p) => {
            const jId = p.jobPostId || p.JobPostId;
            const cId = p.clientId || p.ClientId;
            let categoryName = p.category || "Artificial Intelligence";
            let specializationName = p.specialization || p.specializationName || "General";
            let clientName = p.clientName || p.client || "Client";
            let requiredSkills = p.requiredSkills || [];

            if (jId) {
              try {
                const jp = await api.jobPosts.getById(jId);
                if (jp) {
                  categoryName = jp.category || jp.domain?.name || categoryName;
                  specializationName = jp.specialization?.name || jp.specializationName || jp.specialization || specializationName;
                  requiredSkills = jp.requiredSkills || requiredSkills;
                }
              } catch (e) {
                console.warn("Failed to load job post for dashboard project:", e);
              }
            }

            if (cId) {
              try {
                const cli = await api.users.getById(cId);
                if (cli) {
                  clientName = cli.fullName || cli.username || clientName;
                }
              } catch (e) {
                console.warn("Failed to load client for dashboard project:", e);
              }
            }

            let overallProgress = 0;
            try {
              const fullProj = await api.projects.getById(p.id || p.Id);
              const projTasks = fullProj?.tasks || fullProj?.Tasks || [];
              if (projTasks.length > 0) {
                overallProgress = getOverallProgress(projTasks);
              }
            } catch (err) {
              console.warn("Failed to fetch full project details for progress mapping:", err);
            }

            return {
              ...p,
              category: categoryName,
              specialization: specializationName,
              specializationName: specializationName,
              clientName: clientName,
              client: clientName,
              requiredSkills: requiredSkills,
              progress: overallProgress
            };
          })
        );
        setActiveContracts(enrichedProjects);
        
        setExpertProposals(userRes.proposals || userRes.Proposals || []);
      } catch (err) {
        console.error("Error loading expert dashboard details:", err);
      }

      // Load skills & categories mapping to resolve IDs
      let allSkills = [];
      let allCategories = [];
      try {
        const [skillsRes, categoriesRes] = await Promise.all([
          api.categoryTags.getSkills().catch(() => []),
          api.categoryTags.getCategories().catch(() => []),
        ]);
        allSkills = Array.isArray(skillsRes) ? skillsRes : [];
        allCategories = Array.isArray(categoriesRes) ? categoriesRes : [];
      } catch (e) {
        console.error("Error fetching matching mapping data:", e);
      }

      // Load recommended jobs using the frontend AI Helper
      try {
        const allJobsRes = await api.jobPosts.list().catch(() => []);
        const allJobs = Array.isArray(allJobsRes) ? allJobsRes : (allJobsRes?.data || []);
        const recommendations = getRecommendedProjects(expertDataToPass, allJobs, allSkills, allCategories);

        const mappedRecommendations = (recommendations || [])
          .filter(r => {
            if (r.status && r.status.toLowerCase() !== "open") return false;
            const hasExistingProject = allUserProjects.some(p => String(p.jobPostId || p.JobPostId).toLowerCase() === String(r.id || r.jobPostId).toLowerCase());
            return !hasExistingProject;
          })
          .map(r => ({
            id: r.id || r.jobPostId,
            title: r.title,
            description: r.description,
            budget: r.budget,
            deadline: r.deadline,
            category: r.domainName || r.category || "AI",
            domain: { name: r.domainName || r.category || "AI" },
            specializationName: r.specializationName || r.specialization,
            requiredSkills: r.requiredSkills,
            jobPostSkills: r.jobPostSkills,
            createdAt: r.createdAt || new Date().toISOString(), // Fallback for timeAgo
            client: r.client?.fullName || "Client",
            matchPct: r.matchPct
          }));
        setRecommendedProjects(mappedRecommendations.slice(0, 5));
      } catch (err) {
        console.error("Error loading recommended jobs:", err);
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
  const earningsDisplay = dashboardBalance;

  const completedCount = activeContracts.filter(p => {
    const norm = getNormalizedStatus(p, activeReports);
    return norm.label === "Completed";
  }).length;

  const cancelCount = activeContracts.filter(p => {
    const norm = getNormalizedStatus(p, activeReports);
    return norm.label === "Cancel";
  }).length;

  const reportCount = activeContracts.filter(p => {
    const norm = getNormalizedStatus(p, activeReports);
    return norm.label === "Disputed";
  }).length;

  const totalForSuccess = completedCount + cancelCount + reportCount;
  const successRate = totalForSuccess > 0 ? Math.round((completedCount / totalForSuccess) * 100) : 0;

  // ---- Stats ---------------------------------------------------------------
  const dashboardStats = [
    {
      label: "Active Contracts",
      value: activeContracts.length,
      icon: Briefcase,
      color: "text-brand-primary bg-brand-primary-light",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: CheckCircle,
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
                  className="h-10 px-4 border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-sm transition-colors inline-flex items-center"
                >
                  Find Jobs
                </Link>
              </div>
            ) : (
              activeContracts.map((p) => {
                const clientName = p.clientName || p.client || "Client";
                const progress = p.progress || 0;
                const norm = getNormalizedStatus(p, activeReports);
                const displayStatus = norm.label;
                const badgeClass = norm.badgeClass;

                let statusKey = "in_progress";
                if (displayStatus === "Open") statusKey = "pending_escrow";
                else if (displayStatus === "Completed") statusKey = "completed";
                else if (displayStatus === "Cancel") statusKey = "cancelled";
                else if (displayStatus === "Disputed") statusKey = "settled_dispute";

                const btnCfg = getExpertButtonConfig(statusKey);
                const skills = p.projectSkills?.map((s) => s.skillName) || p.jobPostSkills?.map((s) => s.skill?.name || s.skill?.title) || p.requiredSkills || [];
                const categoryName = p.category || p.domain?.name || "AI & Computing";
                const specializationName = p.specialization || p.specializationName;

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    {/* 🔝 Top row: title + status badge 🔝 */}
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

                    {/* 👤 Client name 👤 */}
                    <p className="text-base text-gray-500 mb-3">
                      Client:{" "}
                      <span className="font-medium text-gray-700">
                        {clientName}
                      </span>
                    </p>

                    {/* 🏷️ Category & Skill tags 🏷️ */}
                    <div className="mb-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-brand-primary border border-blue-100 rounded-md text-xs font-medium uppercase tracking-wider">
                          {categoryName}
                        </span>
                        {specializationName && (
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-md text-xs font-medium uppercase tracking-wider">
                            {specializationName}
                          </span>
                        )}
                      </div>
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
                          {(p.endDate || p.EndDate || p.deadline || p.Deadline)
                            ? new Date(p.endDate || p.EndDate || p.deadline || p.Deadline).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric", year: "numeric" },
                              )
                            : "N/A"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <MoneyDisplay amount={p.budget} />
                        </span>
                      </div>
                      <div className="flex items-center">
                        {(() => {
                          const isDisputed = displayStatus === "Disputed";
                          if (!isDisputed) {
                            return (
                              <button
                                onClick={() => {
                                  setReportingProject(p);
                                  setShowReportForm(true);
                                }}
                                className="mr-3 h-11 px-4 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-[14px] text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <AlertTriangle className="w-4 h-4" /> Report Violation
                              </button>
                            );
                          }
                          const reportForProject = activeReports.find(r => r.projectId === p.id && r.status === "Awaiting Expert");
                          if (reportForProject) {
                            return (
                              <button
                                onClick={() => {
                                  setExplainingReport(reportForProject);
                                  setShowExplanationForm(true);
                                }}
                                className="mr-3 h-11 px-4 bg-amber-500 hover:bg-amber-600 border border-amber-500/20 text-white rounded-[14px] text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <AlertTriangle className="w-4 h-4" /> Submit Response
                              </button>
                            );
                          }
                          return null;
                        })()}
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
                const skills = p.jobPostSkills?.map((s) => s.skill?.name || s.skill?.title) || p.requiredSkills || [];
                const categoryName = p.category || p.domain?.name || "AI & Computing";

                return (
                  <div
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                  >
                    {/* 🔝 Top: title + match badge 🔝 */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg leading-snug">
                        {p.title}
                      </h3>
                      <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                        {matchPct}% match
                      </span>
                    </div>

                    {/* ⏳ Posted by + time ⏳ */}
                    <p className="text-[13px] text-gray-500 mb-2.5">
                      Posted by{" "}
                      <span className="font-medium text-gray-600">
                        {clientName}
                      </span>
                      {" • "}
                      {timeAgo(p.createdAt)}
                    </p>

                    {/* 📝 Description 📝 */}
                    <p className="text-base text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* 🏷️ Category & Skill tags 🏷️ */}
                    <div className="mb-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-brand-primary border border-blue-100 rounded-md text-xs font-medium uppercase tracking-wider">
                          {categoryName}
                        </span>
                      </div>
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
                        className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover text-xs font-semibold inline-flex items-center gap-1.5 transition-colors w-full justify-center"
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

      {/* REPORT FORM DIALOG */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Report Client Violation
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

      {/* EXPLANATION FORM DIALOG */}
      <Dialog open={showExplanationForm} onOpenChange={setShowExplanationForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Submit Response to Report
            </DialogTitle>
          </DialogHeader>
          {explainingReport && (
            <div className="space-y-6">

              <ReportForm
                project={activeContracts.find(p => String(p.id).toLowerCase() === String(explainingReport.projectId).toLowerCase()) || { id: explainingReport.projectId, title: explainingReport.reportName || explainingReport.projectTitle || explainingReport.projectName || "Project" }}
                onSubmit={handleExpertSubmitExplanation}
                onCancel={() => {
                  setShowExplanationForm(false);
                  setExplainingReport(null);
                }}
                loading={explanationSubmitting}
                submitLabel="Submit Response"
                role="expert"
                isResponse={true}
                initialDisputeType={explainingReport?.disputeType}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
