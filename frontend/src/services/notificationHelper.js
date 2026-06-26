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
};

export default notificationService;
