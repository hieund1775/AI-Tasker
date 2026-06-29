import { Link } from "react-router";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  GitBranch,
} from "lucide-react";
import { MoneyDisplay } from "../shared/MoneyDisplay.jsx";

// =============================================================================
// ProposalCard — renders a single proposal for the client's proposal review.
//
// Props:
//   proposal     — enriched proposal object (includes expert, matchPct, etc.)
//   isAccepted   — whether this proposal has been accepted
//   isDeclined   — whether this proposal has been declined
//   hasBeenActed — whether any action (accept/decline) has been taken
//   onAccept     — callback(proposalId, expertName)
//   onDecline    — callback(proposalId, expertName)
// =============================================================================

export function ProposalCard({
  proposal,
  isAccepted,
  isDeclined,
  hasBeenActed,
  onAccept,
  onDecline,
  onAcceptTask,
  onRejectTask,
}) {
  const hasUseCaseBreakdown = proposal.useCaseBreakdown?.length > 0;

  return (
    <div
      className={`bg-card rounded-xl border p-6 transition-colors ${
        isAccepted
          ? "border-success/30 bg-success-light/40"
          : isDeclined
            ? "border-destructive/20 bg-destructive-light/30 opacity-75"
            : "border-border hover:border-border/80 hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* ── Expert info ── */}
        <div className="flex items-start gap-4 flex-1">
          {/* Avatar initials */}
          <div className="w-12 h-12 bg-accent-light rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-accent">
              {proposal.expert?.initials}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + match % */}
            <div className="flex items-center flex-wrap gap-3 mb-1">
              <h3 className="font-semibold text-foreground">
                {proposal.expert?.name}
              </h3>
              <span className="px-2 py-0.5 bg-success-light text-success rounded-full text-xs font-bold">
                {proposal.matchPct}% match
              </span>
              {isAccepted && (
                <span className="px-2.5 py-0.5 bg-success-light text-success rounded-full text-xs font-medium inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Accepted
                </span>
              )}
              {isDeclined && (
                <span className="px-2.5 py-0.5 bg-destructive-light text-destructive rounded-full text-xs font-medium inline-flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Declined
                </span>
              )}
            </div>

            {/* Title */}
            {proposal.expert?.title && (
              <p className="text-sm text-muted-foreground mb-2">
                {proposal.expert.title}
              </p>
            )}

            {/* Cover letter / message */}
            {(proposal.coverLetter || proposal.message) && (
              <p className="text-foreground/80 text-sm leading-relaxed mb-3">
                {proposal.coverLetter || proposal.message}
              </p>
            )}

            {/* Expert skills */}
            {proposal.expert?.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {proposal.expert.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-secondary text-muted-foreground rounded-md text-[13px] font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {proposal.expert.skills.length > 5 && (
                  <span className="px-2 py-0.5 bg-secondary text-muted-foreground/60 rounded-md text-xs">
                    +{proposal.expert.skills.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* ── Use Case & Task Breakdown ── */}
            {(hasUseCaseBreakdown || proposal.tasks?.length > 0) && (
              <div className="mb-3 p-3 bg-secondary/30 rounded-xl border border-border/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  <GitBranch className="w-3.5 h-3.5" /> Use Case & Task Breakdown
                </div>

                {hasUseCaseBreakdown ? (
                  /* ── Grouped by use case ── */
                  proposal.useCaseBreakdown.map((uc) => (
                    <div key={uc.useCaseId} className="space-y-1.5">
                      <div className="flex items-center gap-2 pt-1">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold dark:bg-blue-900/40 dark:text-blue-300">Use Case</span>
                        <span className="text-xs font-semibold text-foreground">{uc.useCaseTitle}</span>
                        <span className="text-xs text-muted-foreground">{uc.originalDuration}d</span>
                      </div>
                      {(uc.tasks || []).map((task, i) => {
                        const isClient = task.source === "client" || task.source === "client_use_case_fallback";
                        const isProposed = task.source === "expert" && task.approvalStatus === "pending_client_approval";
                        const isTaskAccepted = task.approvalStatus === "accepted" && task.source === "expert";
                        const isTaskRejected = task.approvalStatus === "rejected" && task.source === "expert";
                        const borderColor = isTaskAccepted ? "border-green-300" : isTaskRejected ? "border-red-200 opacity-60" : isProposed ? "border-amber-200" : "border-blue-200";

                        return (
                          <div key={task.id || i} className={`pl-2 border-l-2 ${borderColor} space-y-0.5 ml-2`}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{task.title || `Task #${i + 1}`}</span>
                              {isClient && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">Client Task</span>
                              )}
                              {isProposed && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">Pending Approval</span>
                              )}
                              {isTaskAccepted && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">Accepted</span>
                              )}
                              {isTaskRejected && (
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">Rejected</span>
                              )}
                              <span className="text-xs text-muted-foreground">{task.price != null ? `${Number(task.price).toLocaleString()}` : ""}{task.completionDays ? ` · ${task.completionDays}d` : ""}</span>
                              {isProposed && !hasBeenActed && onAcceptTask && onRejectTask && (
                                <div className="flex items-center gap-1 ml-auto">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); onAcceptTask(proposal.id, task.id, task); }} className="h-7 px-2 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors" title="Accept proposed task">
                                    <CheckCircle className="w-3 h-3" /> Accept
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); onRejectTask(proposal.id, task.id, task); }} className="h-7 px-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors" title="Reject proposed task">
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  /* ── Flat fallback ── */
                  <>
                    {proposal.tasks.filter(t => t.source !== "expert" || t.approvalStatus !== "pending_client_approval").map((task, i) => (
                      <div key={task.id || i} className="pl-2 border-l-2 border-blue-200 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{task.title || `Task #${i + 1}`}</span>
                          {task.source === "client" || task.source === "client_use_case_fallback" ? (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">Client Task</span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">{task.price != null ? `${task.price?.toLocaleString()}` : ""}{task.completionDays ? ` · ${task.completionDays}d` : ""}</span>
                        </div>

                      </div>
                    ))}

                    {/* ── Expert-Proposed Tasks ── */}
                    {(proposal.proposedTasks?.length > 0 || proposal.tasks?.filter(t => t.source === "expert" && (t.approvalStatus === "pending_client_approval" || t.approvalStatus === "accepted" || t.approvalStatus === "rejected")).length > 0) && (
                      <div className="pt-2 border-t border-amber-200">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Proposed by Expert</span>
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">Pending Client Approval</span>
                        </div>
                        {(proposal.proposedTasks || proposal.tasks?.filter(t => t.source === "expert" && (t.approvalStatus === "pending_client_approval" || t.approvalStatus === "accepted" || t.approvalStatus === "rejected")) || []).map((task, i) => {
                          const taskStatus = task.approvalStatus || "pending_client_approval";
                          const isPending = taskStatus === "pending_client_approval";
                          const isTaskAccepted = taskStatus === "accepted";
                          const isTaskRejected = taskStatus === "rejected";

                          return (
                          <div key={task.id || `prop-${i}`} className={`pl-2 border-l-2 space-y-0.5 ${isTaskAccepted ? "border-green-300" : isTaskRejected ? "border-red-200 opacity-60" : "border-amber-200"}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{task.title || `Proposed Task #${i + 1}`}</span>
                              <span className="text-xs text-muted-foreground">{task.price != null ? `${task.price?.toLocaleString()}` : ""}{task.completionDays ? ` · ${task.completionDays}d` : ""}</span>
                              {isTaskAccepted && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">Accepted</span>}
                              {isTaskRejected && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">Rejected</span>}
                              {isPending && !hasBeenActed && onAcceptTask && onRejectTask && (
                                <div className="flex items-center gap-1 ml-auto">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onAcceptTask(proposal.id, task.id, task); }}
                                    className="h-7 px-2 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                    title="Accept proposed task"
                                  >
                                    <CheckCircle className="w-3 h-3" /> Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onRejectTask(proposal.id, task.id, task); }}
                                    className="h-7 px-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                    title="Reject proposed task"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: bid amount + actions ── */}
        <div className="flex flex-col items-start md:items-end gap-3 md:min-w-[180px] flex-shrink-0">
          {/* Bid amount */}
          <div className="text-right">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Bid</span>
            <p className="text-lg font-bold text-accent">
              <MoneyDisplay amount={proposal.bidAmount} />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Duration: {proposal.durationDays || proposal.estimatedDays || 0} days
            </p>
          </div>

          {/* Actions */}
          {!hasBeenActed && (
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Link
                to="/messenger"
                className="min-w-[140px] justify-center h-11 px-5 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                title="Message expert"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </Link>
              <button
                type="button"
                onClick={() =>
                  onDecline(
                    proposal.id,
                    proposal.expert?.name,
                  )
                }
                className="min-w-[140px] justify-center h-11 px-5 border border-destructive/20 text-destructive rounded-xl hover:bg-destructive-light text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
              <button
                type="button"
                onClick={() =>
                  onAccept(
                    proposal.id,
                    proposal.expert?.name,
                  )
                }
                className="min-w-[140px] justify-center h-11 px-5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
