// =============================================================================
// Proposal Status Configuration — single source of truth for proposal statuses.
//
// Import from this file instead of defining local STATUS_CONFIG objects.
// =============================================================================

import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

export const PROPOSAL_STATUS = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700",
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
    className: "bg-red-100 text-red-700",
    icon: XCircle,
    meaning: "The client declined this proposal.",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
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
    className: "bg-amber-100 text-amber-700",
    icon: Clock,
    meaning: "The client accepted the proposal, pending escrow payment.",
  },
  pending_pay: {
    label: "Pending Pay",
    className: "bg-amber-100 text-amber-700",
    icon: Clock,
    meaning: "The client accepted the proposal, pending escrow payment.",
  },
  report: {
    label: "Reported",
    className: "bg-red-100 text-red-700",
    icon: AlertCircle,
    meaning: "This proposal/project has been reported.",
  },
  reported: {
    label: "Reported",
    className: "bg-red-100 text-red-700",
    icon: AlertCircle,
    meaning: "This proposal/project has been reported.",
  },
  expired: {
    label: "Expired",
    className: "bg-gray-100 text-gray-500 line-through",
    icon: Clock,
    meaning: "This proposal has expired after 7 days without client response.",
  },
  settled_dispute: {
    label: "Settled dispute",
    className: "bg-teal-100 text-teal-800 border border-teal-200 font-semibold",
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
