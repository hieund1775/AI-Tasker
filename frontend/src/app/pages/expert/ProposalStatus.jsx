import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  FileText,
  Eye,
  Clock,
  Send,
} from "lucide-react";
import { Button } from "../../components/ui/button.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { AnimatedReveal } from "../../components/shared/AnimatedReveal.jsx";
import api from "../../../services/api.js";

import { getProposalStatusConfig } from "../../lib/proposalStatusConfig.js";
import { safeDateFormat } from "../../lib/safety.js";

// Status helpers — delegated to shared proposalStatusConfig.js
function getStatusConfig(status) { return getProposalStatusConfig(status); }

/**
 * Find the conversation ID for a given project + expert combo.
 */
function findConversationId(projectId, expertId) {
  const expertConvs = [];
  const conv = expertConvs.find((c) => c.projectId === projectId);
  return conv ? conv.id : null;
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return safeDateFormat(dateStr, { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalStatus() {
  const { user } = useAuth();

  const [proposals, setProposals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProposals() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const list = await api.proposals.getByExpert(user.id);
        const fetchedProposals = await Promise.all(
          list.map(async (proposal) => {
            let job = null;
            try {
              job = await api.jobPosts.getById(proposal.jobPostId);
            } catch (err) {
              console.error("Failed to load job post details:", err);
            }

            let parsed = {};
            try {
              parsed = JSON.parse(proposal.coverLetter);
            } catch (e) {
              parsed = {
                coverLetter: proposal.coverLetter,
                professionalIntro: proposal.coverLetter,
              };
            }

            return {
              ...proposal,
              proposalTitle: parsed.proposalTitle || job?.title || "Proposal",
              projectTitle: job?.title || "AI Project",
              clientName: job?.client || "Client",
              clientCompany: "",
              durationDays: parsed.durationDays || job?.deadline || 0,
              project: job,
            };
          })
        );
        setProposals(fetchedProposals);
      } catch (err) {
        console.error("Failed to load expert proposals:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProposals();

    const handleUpdate = () => {
      loadProposals();
    };
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
  }, [user?.id]);

  const STATUS_OPTIONS = [
    { value: "", label: "Tất cả trạng thái" },
    { value: "pending", label: "Đang chờ (Pending)" },
    { value: "under_review", label: "Đang xem xét (Under Review)" },
    { value: "pending_escrow", label: "Chờ ký quỹ (Pending Payment)" },
    { value: "accepted", label: "Được chấp nhận (Accepted)" },
    { value: "declined", label: "Từ chối (Declined)" },
    { value: "withdrawn", label: "Đã rút (Withdrawn)" },
    { value: "expired", label: "Đã quá hạn (Expired)" },
  ];

  const filteredProposals = proposals.filter((proposal) => {
    if (!statusFilter) return true;
    const status = (proposal.status || "").toLowerCase();
    if (statusFilter === "under_review" && (status === "under_review" || status === "under review")) return true;
    if (statusFilter === "pending_escrow" && (status === "pending_escrow" || status === "pending_pay" || status === "pending escrow" || status === "pending pay")) return true;
    if (statusFilter === "declined" && (status === "declined" || status === "rejected")) return true;
    return status === statusFilter;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <PageHeader
          title="My Proposals"
          subtitle="Track your submitted proposals and their status"
          className="mb-0"
        />
        {proposals.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 px-3 border border-input rounded-xl bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-accent text-sm cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Empty state */}
      {proposals.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-muted/40" />
            <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Send className="w-9 h-9 text-muted-foreground/25" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">No proposals yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Browse available jobs and submit proposals to get started.
          </p>
          <Link
            to="/expert/find-jobs"
            className="h-9 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            Find Jobs
          </Link>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">Không tìm thấy đề xuất</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Không có đề xuất nào có trạng thái phù hợp với bộ lọc đã chọn.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal, i) => {
            const statusCfg = getStatusConfig(proposal.status);
            const StatusIcon = statusCfg.icon;
            const convId = findConversationId(proposal.projectId, user?.id || "current-user");
            const relTime = relativeTime(proposal.createdAt);

            const statusBorderColor = (() => {
              const s = proposal.status?.toLowerCase();
              if (s === "pending") return "border-l-warning";
              if (s === "accepted" || s === "active") return "border-l-success";
              if (s === "under_review" || s === "under review") return "border-l-accent";
              if (s === "declined" || s === "rejected") return "border-l-destructive";
              if (s === "withdrawn") return "border-l-muted-foreground";
              if (s === "pending_escrow" || s === "pending_pay" || s === "pending pay" || s === "pending escrow") return "border-l-amber-500";
              return "border-l-muted";
            })();

            return (
              <AnimatedReveal key={proposal.id} delay={i}>
                <div
                  className={`group bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200 border-l-4 ${statusBorderColor}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.className}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusCfg.label}
                        </span>
                        {relTime && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {relTime}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-foreground text-lg leading-snug mb-2 group-hover:text-accent transition-colors">
                        {proposal.proposalTitle}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                        <span className="text-muted-foreground">
                          Client: <span className="font-medium text-foreground">{proposal.clientName}{proposal.clientCompany ? ` · ${proposal.clientCompany}` : ""}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Bid: <span className="font-bold text-success"><MoneyDisplay amount={proposal.bidAmount} /></span>
                        </span>
                        <span className="text-muted-foreground">
                          Duration: <span className="font-medium text-foreground">{proposal.durationDays} days</span>
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted {safeDateFormat(proposal.createdAt, { year: "numeric", month: "long", day: "numeric" }, "—")}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 sm:min-w-[170px] items-stretch">
                      <Button variant="default" size="default" asChild className="w-full shadow-sm">
                        <Link to={`/expert/proposals/${proposal.id}`}>
                          <Eye className="w-4 h-4" /> View Proposal
                        </Link>
                      </Button>
                      <Button variant="outline" size="default" asChild className="w-full">
                        <Link to={`/expert/jobs/${proposal.jobPostId}`}>View Job</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </AnimatedReveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
