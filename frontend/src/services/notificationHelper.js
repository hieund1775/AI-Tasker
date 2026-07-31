// =============================================================================
// AI-Tasker Notification Service (Helper)
// =============================================================================
// Manage sending notifications to correct targets (Targeted Notifications)
// Accurately resolve User ID and Client/Expert roles.
// =============================================================================

import api from "./api.js";

/**
 * Send a notification to a specific user.
 * 
 * @param {string} userId - Recipient User ID
 * @param {string} title - Notification Title
 * @param {string} message - Notification Message
 * @param {string} type - Notification Type
 * @param {string} linkTo - Redirect link when notification is clicked
 * @returns {Promise<object>} Created notification object
 */
export async function sendNotification({ userId, title, message, type = "system", linkTo = "" }) {
  try {
    // Call actual API to save notification
    const newNotif = await api.post("/notifications", {
      userId,
      title,
      content: message,
      link: linkTo,
    });
    
    // Emit UI update event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    }
    
    return newNotif;
  } catch (err) {
    console.warn("[NotificationService] Failed to send notification (Maybe BE does not have POST /notifications API yet):", err);
    // Return null instead of throwing error to prevent crashing main flows
    return null;
  }
}

/**
 * TRIGGER 1.1: Expert submits a new proposal for Client's JobPost
 * Only Client (JobPost owner) receives notification.
 */
export async function notifyNewProposal({ clientUserId, expertName, jobTitle, jobPostId }) {
  return sendNotification({
    userId: clientUserId,
    title: `New proposal for job: ${jobTitle}`,
    message: `Expert ${expertName} has submitted a new proposal for your job.`,
    type: "proposal",
    linkTo: `/client/my-projects?projectId=${jobPostId}&view=proposals`
  });
}

/**
 * TRIGGER 1.2: Expert updates/resubmits proposal needing revision
 * Only Client (JobPost owner) receives notification.
 */
export async function notifyUpdatedProposal({ clientUserId, expertName, jobTitle, jobPostId }) {
  return sendNotification({
    userId: clientUserId,
    title: `Updated proposal for job: ${jobTitle}`,
    message: `Expert ${expertName} has updated and resubmitted the proposal as requested.`,
    type: "proposal",
    linkTo: `/client/my-projects?projectId=${jobPostId}&view=proposals`
  });
}

/**
 * TRIGGER 2.1: Client accepts Expert A's Proposal
 * - Expert A (selected expert) receives congrats notification.
 * - All other candidates (Expert B, C...) for that Job receive rejection notification.
 */
export async function notifyProposalDecision({ selectedExpertId, clientName, jobTitle, proposalId, otherProposals = [] }) {
  // 1. Send to the selected Expert
  await sendNotification({
    userId: selectedExpertId,
    title: `Proposal accepted | Project: ${jobTitle}`,
    message: `Congratulations! Your proposal has been accepted by client ${clientName}.`,
    type: "proposal",
    linkTo: `/expert/proposals/${proposalId}`
  });

  // 2. Send to other Experts simultaneously (if any)
  const notifyOthers = otherProposals.map(prop => {
    return sendNotification({
      userId: prop.expertId,
      title: `Proposal rejected | Project: ${jobTitle}`,
      message: `Sorry, client ${clientName} has rejected your proposal for this project.`,
      type: "proposal",
      linkTo: `/expert/proposals/${prop.id}`
    });
  });

  await Promise.all(notifyOthers).catch(err => {
    console.error("[NotificationService] Failed to send rejection notifications to other experts:", err);
  });
}

/**
 * TRIGGER 2.2: Client successfully funds escrow (Fund Escrow)
 * Only selected Expert receives notification. Other unrelated Experts receive nothing.
 */
export async function notifyEscrowFunded({ expertUserId, clientName, jobTitle, proposalId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Escrow deposited successfully | Project: ${jobTitle}`,
    message: `Client ${clientName} deposited escrow successfully. The project has officially started!`,
    type: "payment",
    linkTo: `/expert/proposals/${proposalId}`
  });
}

/**
 * TRIGGER 2.3: Client invites an Expert to a newly created project
 * Only the invited Expert receives the notification.
 */
export async function notifyExpertInvited({ expertUserId, clientName, jobTitle, jobPostId, proposalId }) {
  return sendNotification({
    userId: expertUserId,
    title: `New project invitation: ${jobTitle}`,
    message: `Client ${clientName} has invited you to join the project "${jobTitle}". Please check and respond.`,
    type: "proposal",
    linkTo: jobPostId ? `/expert/jobs/${jobPostId}` : `/expert/dashboard`
  });
}

/**
 * TRIGGER 2.4: Expert declines a project invitation
 * Only the Client receives the notification.
 */
export async function notifyInviteDeclined({ clientUserId, expertName, jobTitle, jobPostId }) {
  return sendNotification({
    userId: clientUserId,
    title: `Expert declined invitation: ${jobTitle}`,
    message: `Expert ${expertName} has declined the invitation to join the project "${jobTitle}".`,
    type: "proposal",
    linkTo: `/client/projects/${jobPostId}/proposals`
  });
}

/**
 * TRIGGER: Client declines a proposal
 * The expert is notified that their proposal was rejected.
 */
export async function notifyProposalDeclined({ expertUserId, clientName, jobTitle }) {
  return sendNotification({
    userId: expertUserId,
    title: `Proposal rejected: ${jobTitle}`,
    message: `Client ${clientName} has rejected your proposal for project "${jobTitle}".`,
    type: "proposal",
    linkTo: `/expert/proposals`
  });
}

// =============================================================================
// TASK-LEVEL NOTIFICATIONS
// =============================================================================

/**
 * TRIGGER 3.1: Expert submits task for client review.
 * Client receives notification.
 */
export async function notifyTaskSubmittedForReview({ clientUserId, expertName, taskTitle, projectId, taskId }) {
  return sendNotification({
    userId: clientUserId,
    title: `Task submitted for review: ${taskTitle}`,
    message: `Expert ${expertName} has submitted the task "${taskTitle}" for your review.`,
    type: "system",
    linkTo: projectId && taskId ? `/client/projects/${projectId}/tasks/${taskId}` : "",
  });
}

/**
 * TRIGGER 3.2: Client approves a task submission.
 * Expert receives notification.
 */
export async function notifyTaskApproved({ expertUserId, clientName, taskTitle, projectId, taskId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Task approved: ${taskTitle}`,
    message: `Client ${clientName} has approved your work on "${taskTitle}".`,
    type: "system",
    linkTo: projectId && taskId ? `/expert/projects/${projectId}/tasks/${taskId}` : "",
  });
}

/**
 * TRIGGER 3.3: Client requests revision on a submitted task.
 * Expert receives notification.
 */
export async function notifyTaskRevisionRequested({ expertUserId, clientName, taskTitle, feedback, projectId, taskId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Revision requested: ${taskTitle}`,
    message: `Client ${clientName} requested changes on "${taskTitle}".${feedback ? ` Feedback: "${feedback}"` : ""}`,
    type: "system",
    linkTo: projectId && taskId ? `/expert/projects/${projectId}/tasks/${taskId}` : "",
  });
}

/**
 * TRIGGER 3.3b: Client requests revision on specific mini tasks.
 * Expert receives notification with mini task details.
 */
export async function notifyMiniTaskRevisionRequested({ expertUserId, clientName, taskTitle, miniTaskTitles, feedback, projectId, taskId }) {
  const taskList = (miniTaskTitles || []).map((t) => `- ${t}`).join("\n");
  return sendNotification({
    userId: expertUserId,
    title: `Mini task revision requested: ${taskTitle}`,
    message: `Client ${clientName} requested revisions for:\n${taskList}${feedback ? `\n\nReason: ${feedback}` : ""}`,
    type: "system",
    linkTo: projectId && taskId ? `/expert/projects/${projectId}/tasks/${taskId}` : "",
  });
}

/**
 * TRIGGER 3.4: Task deadline has been exceeded.
 * Both client and expert receive notification.
 */
export async function notifyTaskOverdue({ userId, taskTitle, projectId, taskId, daysOverdue }) {
  return sendNotification({
    userId,
    title: `Task overdue: ${taskTitle}`,
    message: `Task "${taskTitle}" is overdue by ${daysOverdue || "several"} day(s). Please take action.`,
    type: "system",
    linkTo: projectId && taskId ? `/expert/projects/${projectId}/tasks/${taskId}` : "",
  });
}

/**
 * TRIGGER 3.5: Client requests urgent submission on an overdue/delayed task.
 * Expert receives notification.
 */
export async function notifyUrgentSubmissionRequested({ expertUserId, clientName, taskTitle, projectId, taskId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Urgent Submission Requested`,
    message: `The Client requested you to complete and submit the task immediately:\n\n${taskTitle}`,
    type: "system",
    linkTo: projectId && taskId ? `/expert/projects/${projectId}/tasks/${taskId}` : "",
  });
}

// =============================================================================
// FINAL DELIVERY NOTIFICATIONS
// =============================================================================

/**
 * Expert submits final project deliverables.
 * Client receives notification.
 */
export async function notifyFinalWorkSubmitted({ clientUserId, expertName, projectTitle, projectId }) {
  return sendNotification({
    userId: clientUserId,
    title: `Final work submitted: ${projectTitle}`,
    message: `Expert ${expertName} has submitted the final project deliverables for "${projectTitle}". Please review and accept.`,
    type: "system",
    linkTo: projectId ? `/client/projects/${projectId}` : "",
  });
}

/**
 * Client accepts final delivery.
 * Expert receives notification.
 */
export async function notifyFinalDeliveryAccepted({ expertUserId, clientName, projectTitle, projectId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Final delivery accepted: ${projectTitle}`,
    message: `Client ${clientName} has accepted the final delivery for "${projectTitle}". Payment release is now available.`,
    type: "payment",
    linkTo: projectId ? `/expert/projects/${projectId}` : "",
  });
}

/**
 * Client declines final delivery with feedback.
 * Expert receives notification.
 */
export async function notifyFinalDeliveryDeclined({ expertUserId, clientName, projectTitle, feedback, projectId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Final delivery declined: ${projectTitle}`,
    message: `Client ${clientName} declined the final delivery for "${projectTitle}".${feedback ? ` Reason: "${feedback}"` : ""} Please revise and resubmit.`,
    type: "system",
    linkTo: projectId ? `/expert/projects/${projectId}` : "",
  });
}

/**
 * Client releases escrow payment to Expert.
 * Expert receives notification.
 */
export async function notifyPaymentReleased({ expertUserId, clientName, projectTitle, amount, projectId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Payment released: ${projectTitle}`,
    message: `Client ${clientName} has released the escrow payment (${amount}) for "${projectTitle}". The project is now completed.`,
    type: "payment",
    linkTo: projectId ? `/expert/projects/${projectId}` : "",
  });
}

// =============================================================================
// DISPUTE NOTIFICATIONS
// =============================================================================

/**
 * A dispute report is filed and accepted by Admin.
 * The accused party receives notification with 48h deadline.
 */
export async function notifyDisputeFiled({ accusedUserId, accusedRole, reporterName, projectTitle, deadline, projectId, reportId }) {
  const baseRoute = accusedRole?.toLowerCase() === "client" ? "client" : "expert";
  return sendNotification({
    userId: accusedUserId,
    title: `Dispute filed against you: ${projectTitle}`,
    message: `${reporterName} has filed a dispute regarding "${projectTitle}". You have 48 hours to submit your explanation. Admin will review the case.`,
    type: "dispute",
    linkTo: projectId ? `/${baseRoute}/projects/${projectId}` : "",
  });
}

/**
 * Dispute resolved by Admin.
 * Both parties receive notification.
 */
export async function notifyDisputeResolved({ userId, userRole, projectTitle, resolution, projectId }) {
  const baseRoute = userRole?.toLowerCase() === "client" ? "client" : "expert";
  return sendNotification({
    userId,
    title: `Dispute resolved: ${projectTitle}`,
    message: `The dispute for "${projectTitle}" has been resolved. Resolution: ${resolution}.`,
    type: "dispute",
    linkTo: projectId ? `/${baseRoute}/projects/${projectId}` : "",
  });
}

/**
 * Admin requests more evidence, extending 48h deadline.
 * The accused party receives notification.
 */
export async function notifyMoreEvidenceRequested({ userId, userRole, projectTitle, adminNote, projectId }) {
  const baseRoute = userRole?.toLowerCase() === "client" ? "client" : "expert";
  return sendNotification({
    userId,
    title: `More evidence requested: ${projectTitle}`,
    message: `Admin has requested additional evidence for the dispute "${projectTitle}". You have 48 more hours to respond.${adminNote ? ` Note: "${adminNote}"` : ""}`,
    type: "dispute",
    linkTo: projectId ? `/${baseRoute}/projects/${projectId}` : "",
  });
}

// =============================================================================
// CONTRACT CANCELLATION NOTIFICATIONS
// =============================================================================

/**
 * A user requests to cancel the contract. Partner is notified to accept/reject.
 */
export async function notifyCancelRequestSubmitted({ partnerUserId, projectTitle, requesterName, projectId }) {
  if (!partnerUserId) return;
  return sendNotification({
    userId: partnerUserId,
    title: `Cancel Request: ${projectTitle}`,
    message: `${requesterName} has requested to cancel the contract for "${projectTitle}". Please review and respond in your Project Management dashboard.`,
    type: "info",
    linkTo: `/projects/${projectId}`, // Notification routing will handle the /client or /expert prefix based on role
  });
}

/**
 * Client cancels contract. Expert receives payout notification.
 */
export async function notifyContractCancelledExpert({ expertUserId, projectTitle, expertPayout, projectId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Contract Cancelled: ${projectTitle}`,
    message: `The client cancelled the contract for "${projectTitle}". You received ${Number(expertPayout).toLocaleString()} (progress payout + 10% compensation). The project is now closed.`,
    type: "system",
    linkTo: projectId ? `/expert/projects/${projectId}` : "",
  });
}

/**
 * Client cancels contract. Client receives refund notification.
 */
export async function notifyContractCancelledClient({ clientUserId, projectTitle, clientRefund, projectId }) {
  return sendNotification({
    userId: clientUserId,
    title: `Contract Cancelled: ${projectTitle}`,
    message: `Your contract cancellation for "${projectTitle}" has been processed. Refund amount: ${Number(clientRefund).toLocaleString()}.`,
    type: "system",
    linkTo: projectId ? `/client/projects/${projectId}` : "",
  });
}

export const notificationService = {
  sendNotification,
  notifyExpertInvited,
  notifyInviteDeclined,
  notifyProposalDeclined,
  notifyNewProposal,
  notifyUpdatedProposal,
  notifyProposalDecision,
  notifyEscrowFunded,
  notifyTaskSubmittedForReview,
  notifyTaskApproved,
  notifyTaskRevisionRequested,
  notifyMiniTaskRevisionRequested,
  notifyTaskOverdue,
  notifyUrgentSubmissionRequested,
  // Final delivery
  notifyFinalWorkSubmitted,
  notifyFinalDeliveryAccepted,
  notifyFinalDeliveryDeclined,
  notifyPaymentReleased,
  // Dispute
  notifyDisputeFiled,
  notifyDisputeResolved,
  notifyMoreEvidenceRequested,
  // Contract cancellation
  notifyCancelRequestSubmitted,
  notifyContractCancelledExpert,
  notifyContractCancelledClient,
};

export default notificationService;
