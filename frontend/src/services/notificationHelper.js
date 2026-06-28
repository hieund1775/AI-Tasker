// =============================================================================
// AI-Tasker Notification Service (Helper)
// =============================================================================
// Quản lý việc bắn thông báo đúng đối tượng (Targeted Notifications)
// Phân định chính xác User ID và vai trò Client/Expert.
// =============================================================================

import api from "./api.js";

/**
 * Gửi thông báo đến một người dùng cụ thể.
 * 
 * @param {string} userId - ID người nhận thông báo
 * @param {string} title - Tiêu đề thông báo
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại thông báo ('proposal', 'payment', 'system', 'message', 'dispute')
 * @param {string} linkTo - Đường dẫn chuyển hướng khi click thông báo
 * @returns {Promise<object>} Đối tượng thông báo đã tạo
 */
export async function sendNotification({ userId, title, message, type = "system", linkTo = "" }) {
  try {
    // Gọi API của hệ thống mock (hoặc thực tế) để lưu thông báo
    const newNotif = await api.post("/notifications", {
      userId,
      title,
      message,
      type,
      isRead: false,
      linkTo,
      createdAt: new Date().toISOString(),
    });
    
    // Phát sự kiện cập nhật giao diện ngay lập tức
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
    }
    
    return newNotif;
  } catch (err) {
    console.error("[NotificationService] Gửi thông báo thất bại:", err);
    throw err;
  }
}

/**
 * TRIGGER 1.1: Expert gửi một proposal mới cho JobPost của Client
 * Chỉ Client (chủ JobPost) nhận thông báo.
 */
export async function notifyNewProposal({ clientUserId, expertName, jobTitle, jobPostId }) {
  return sendNotification({
    userId: clientUserId,
    title: `Đề xuất mới cho công việc: ${jobTitle}`,
    message: `Chuyên gia ${expertName} vừa gửi một đề xuất mới cho công việc của bạn.`,
    type: "proposal",
    linkTo: `/client/my-projects?projectId=${jobPostId}&view=proposals`
  });
}

/**
 * TRIGGER 1.2: Expert cập nhật/gửi lại proposal cần sửa
 * Chỉ Client (chủ JobPost) nhận thông báo.
 */
export async function notifyUpdatedProposal({ clientUserId, expertName, jobTitle, jobPostId }) {
  return sendNotification({
    userId: clientUserId,
    title: `Cập nhật đề xuất cho công việc: ${jobTitle}`,
    message: `Chuyên gia ${expertName} đã cập nhật và gửi lại đề xuất theo yêu cầu.`,
    type: "proposal",
    linkTo: `/client/my-projects?projectId=${jobPostId}&view=proposals`
  });
}

/**
 * TRIGGER 2.1: Client chấp nhận Proposal của Expert A
 * - Expert A (người được chọn) nhận thông báo chúc mừng.
 * - Tất cả các ứng viên khác (Expert B, C...) ứng tuyển vào Job đó nhận thông báo từ chối.
 */
export async function notifyProposalDecision({ selectedExpertId, clientName, jobTitle, proposalId, otherProposals = [] }) {
  // 1. Gửi cho Expert được chọn
  await sendNotification({
    userId: selectedExpertId,
    title: `Đề xuất được chấp nhận | Dự án: ${jobTitle}`,
    message: `Chúc mừng! Đề xuất của bạn đã được khách hàng ${clientName} chấp nhận.`,
    type: "proposal",
    linkTo: `/expert/proposals/${proposalId}`
  });

  // 2. Đồng loạt gửi cho các Expert khác (nếu có)
  const notifyOthers = otherProposals.map(prop => {
    return sendNotification({
      userId: prop.expertId,
      title: `Đề xuất bị từ chối | Dự án: ${jobTitle}`,
      message: `Rất tiếc, khách hàng ${clientName} đã từ chối đề xuất của bạn cho dự án này.`,
      type: "proposal",
      linkTo: `/expert/proposals/${prop.id}`
    });
  });

  await Promise.all(notifyOthers).catch(err => {
    console.error("[NotificationService] Gửi thông báo từ chối cho các chuyên gia khác thất bại:", err);
  });
}

/**
 * TRIGGER 2.2: Client hoàn thành ký quỹ (Fund Escrow) thành công
 * Chỉ Expert được chọn nhận thông báo. Các Expert khác không liên quan KHÔNG nhận gì.
 */
export async function notifyEscrowFunded({ expertUserId, clientName, jobTitle, proposalId }) {
  return sendNotification({
    userId: expertUserId,
    title: `Ký quỹ thành công | Dự án: ${jobTitle}`,
    message: `Khách hàng ${clientName} đã nạp tiền ký quỹ thành công. Dự án chính thức bắt đầu!`,
    type: "payment",
    linkTo: `/expert/proposals/${proposalId}`
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
  const taskList = (miniTaskTitles || []).map((t) => `• ${t}`).join("\n");
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
export async function notifyDisputeFiled({ accusedUserId, reporterName, projectTitle, deadline, projectId, reportId }) {
  return sendNotification({
    userId: accusedUserId,
    title: `Dispute filed against you: ${projectTitle}`,
    message: `${reporterName} has filed a dispute regarding "${projectTitle}". You have 48 hours to submit your explanation. Admin will review the case.`,
    type: "dispute",
    linkTo: projectId ? `/expert/projects/${projectId}` : "",
  });
}

/**
 * Dispute resolved by Admin.
 * Both parties receive notification.
 */
export async function notifyDisputeResolved({ userId, projectTitle, resolution, projectId }) {
  return sendNotification({
    userId,
    title: `Dispute resolved: ${projectTitle}`,
    message: `The dispute for "${projectTitle}" has been resolved. Resolution: ${resolution}.`,
    type: "dispute",
    linkTo: projectId ? `/expert/projects/${projectId}` : "",
  });
}

/**
 * Admin requests more evidence, extending 48h deadline.
 * The accused party receives notification.
 */
export async function notifyMoreEvidenceRequested({ userId, projectTitle, adminNote, projectId }) {
  return sendNotification({
    userId,
    title: `More evidence requested: ${projectTitle}`,
    message: `Admin has requested additional evidence for the dispute "${projectTitle}". You have 48 more hours to respond.${adminNote ? ` Note: "${adminNote}"` : ""}`,
    type: "dispute",
    linkTo: projectId ? `/expert/projects/${projectId}` : "",
  });
}

// =============================================================================
// CONTRACT CANCELLATION NOTIFICATIONS
// =============================================================================

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
  notifyContractCancelledExpert,
  notifyContractCancelledClient,
};

export default notificationService;
