// =============================================================================
// Proposal Status Configuration — single source of truth for proposal statuses.
//
// Import from this file instead of defining local STATUS_CONFIG objects.
// =============================================================================

import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

export const PROPOSAL_STATUS = {
  pending: {
    label: "Pending",
    className: "bg-warning-light text-warning",
    icon: Clock,
    meaning: "Proposal has been submitted and is waiting for the client's decision.",
  },
  accepted: {
    label: "Accepted",
    className: "bg-brand-green/10 text-brand-green",
    icon: CheckCircle,
    meaning: "The client accepted this proposal. The expert is now assigned to the project.",
  },
  declined: {
    label: "Declined",
    className: "bg-destructive-light text-destructive",
    icon: XCircle,
    meaning: "The client declined this proposal.",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive-light text-destructive",
    icon: XCircle,
    meaning: "The client rejected this proposal.",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-secondary text-muted-foreground",
    icon: XCircle,
    meaning: "The expert withdrew this proposal before a decision was made.",
  },
  under_review: {
    label: "Under Review",
    className: "bg-brand-primary-light text-brand-primary",
    icon: AlertCircle,
    meaning: "The client is actively reviewing this proposal.",
  },
  pending_escrow: {
    label: "Pending Payment",
    className: "bg-warning-light text-warning",
    icon: Clock,
    meaning: "The client accepted the proposal, pending escrow payment.",
  },
  pending_pay: {
    label: "Pending Pay",
    className: "bg-warning-light text-warning",
    icon: Clock,
    meaning: "The client accepted the proposal, pending escrow payment.",
  },
  report: {
    label: "Reported",
    className: "bg-destructive-light text-destructive",
    icon: AlertCircle,
    meaning: "This proposal/project has been reported.",
  },
  reported: {
    label: "Reported",
    className: "bg-destructive-light text-destructive",
    icon: AlertCircle,
    meaning: "This proposal/project has been reported.",
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground line-through",
    icon: Clock,
    meaning: "This proposal has expired after 7 days without client response.",
  },
  settled_dispute: {
    label: "Settled dispute",
    className: "bg-success-light text-success border border-success/20 font-semibold",
    icon: CheckCircle,
    meaning: "Dispute settled by force action.",
  },
};

/** Get the full config object for a proposal status key, with fallback. */
export function getProposalStatusConfig(status) {
  const key = String(status || "").toLowerCase();
  return PROPOSAL_STATUS[key] || PROPOSAL_STATUS.pending;
}

/** Get the display label for a proposal status key. */
export function getProposalStatusLabel(status) {
  const key = String(status || "").toLowerCase();
  return PROPOSAL_STATUS[key]?.label || PROPOSAL_STATUS.pending.label;
}

/** Get the badge CSS class for a proposal status key. */
export function getProposalStatusClass(status) {
  const key = String(status || "").toLowerCase();
  return PROPOSAL_STATUS[key]?.className || PROPOSAL_STATUS.pending.className;
}
