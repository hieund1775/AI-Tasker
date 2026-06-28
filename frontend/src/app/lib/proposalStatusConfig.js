// =============================================================================
// Proposal Status Configuration — single source of truth for proposal statuses.
//
// Import from this file instead of defining local STATUS_CONFIG objects.
// =============================================================================

import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

export const PROPOSAL_STATUS = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    icon: Clock,
    meaning: "Proposal has been submitted and is waiting for the client's decision.",
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-100 text-green-700 border border-green-200",
    icon: CheckCircle,
    meaning: "The client accepted this proposal. The expert is now assigned to the project.",
  },
  declined: {
    label: "Declined",
    className: "bg-red-100 text-red-700 border border-red-200",
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
    className: "bg-blue-100 text-blue-700 border border-blue-200",
    icon: AlertCircle,
    meaning: "The client is actively reviewing this proposal.",
  },
  pending_escrow: {
    label: "Pending Payment",
    className: "bg-amber-100 text-amber-700",
    icon: Clock,
    meaning: "The proposal is approved. Awaiting escrow payment from the client.",
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
};

/** Get the full config object for a proposal status key, with fallback. */
export function getProposalStatusConfig(status) {
  if (!status) return PROPOSAL_STATUS.pending;
  const key = String(status).toLowerCase().replace(/\s+/g, "_");

  // Handle common variations
  if (key === "pending_pay" || key === "pending_payment" || key === "pending_escrow") {
    return PROPOSAL_STATUS.pending_escrow;
  }

  return PROPOSAL_STATUS[key] || PROPOSAL_STATUS.pending;
}

/** Get the display label for a proposal status key. */
export function getProposalStatusLabel(status) {
  return getProposalStatusConfig(status).label;
}

/** Get the badge CSS class for a proposal status key. */
export function getProposalStatusClass(status) {
  return getProposalStatusConfig(status).className;
}
