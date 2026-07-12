const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://aitaskerbe-production.up.railway.app/api";
const TOKEN_STORAGE_KEY = "aitasker_auth_token";

function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch { }
}

async function request(endpoint, options = {}) {
  let finalEndpoint = endpoint;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      finalEndpoint += (finalEndpoint.includes("?") ? "&" : "?") + qs;
    }
  }

  const {
    authenticated = true,
    body,
    method,
    headers: extraHeaders = {},
    timeout = 15000, // 15 s — Railway backend needs extra time on cold starts
    ...rest
  } = options;

  const httpMethod = method || (body ? "POST" : "GET");

  // Mock interceptor disabled - proceed with real API calls

  const url = `${API_BASE_URL}${finalEndpoint}`;

  const headers = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true", // Bypass ngrok
    ...extraHeaders,
  };

  if (!options.isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (authenticated) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const init = {
    method: httpMethod,
    headers,
    signal: controller.signal,
    ...rest,
  };

  if (body !== undefined && body !== null) {
    init.body = options.isFormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch (networkError) {
    clearTimeout(timer);
    if (networkError.name === "AbortError") {
      throw new ApiError(
        "Request timed out — the server did not respond in time.",
        0,
        networkError,
      );
    }
    throw new ApiError(
      "Network error — please check your connection and try again.",
      0,
      networkError,
    );
  }
  clearTimeout(timer);

  // NOTE: We do NOT auto-clear the token on 401 here.
  // Many admin/owner dashboard APIs may return 401 if the backend endpoints
  // are not yet implemented or the user lacks permission for individual
  // resources. Only the auth-specific flows should trigger a session clear.
  // Dashboard & resource pages handle 401s gracefully via .catch().
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    throw new ApiError("Authentication required for this resource.", 401);
  }

  if (response.status === 204) return null;

  let data;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.title || data.error)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  // Centralized OData / envelope unpacking
  if (data && typeof data === "object") {
    if ("value" in data && Array.isArray(data.value)) {
      data = data.value;
    } else if ("data" in data && Array.isArray(data.data)) {
      data = data.data;
    }
  }

  // Centrally normalize report statuses to ensure full compatibility across client, expert, and admin views
  if (data) {
    const isReportsEndpoint = finalEndpoint.toLowerCase().includes("/reports") || finalEndpoint.toLowerCase().includes("/dispute");
    if (isReportsEndpoint) {
      const normalizeReport = (r) => {
        if (r && typeof r === "object") {
          if (r.status === "Pending") {
            r.status = "Pending Admin";
          }
          if (r.disputeType === "cancellation" && r.status === "Accepted") {
            r.status = "Resolved";
          }
        }
      };
      if (Array.isArray(data)) {
        data.forEach(normalizeReport);
      } else if (data.data && Array.isArray(data.data)) {
        data.data.forEach(normalizeReport);
      } else {
        normalizeReport(data);
        normalizeReport(data.data);
      }
    }
  }

  return data;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function get(endpoint, options = {}) {
  return request(endpoint, { ...options, method: "GET" });
}
function post(endpoint, body, options = {}) {
  return request(endpoint, { ...options, method: "POST", body });
}
function put(endpoint, body, options = {}) {
  return request(endpoint, { ...options, method: "PUT", body });
}
function patch(endpoint, body, options = {}) {
  return request(endpoint, { ...options, method: "PATCH", body });
}
function del(endpoint, options = {}) {
  return request(endpoint, { ...options, method: "DELETE" });
}

// ── Helpers lưu/đọc use cases từ localStorage (dự phòng khi BE chưa serialize jobRequirements) ──
export function saveJobUseCases(jobId, useCases) {
  try {
    localStorage.setItem(`aitasker_job_usecases_${jobId}`, JSON.stringify(useCases));
  } catch (e) { }
}

function loadJobUseCases(jobId) {
  try {
    const raw = localStorage.getItem(`aitasker_job_usecases_${jobId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function mapJobPost(jp) {
  if (!jp) return jp;

  // Map Domain and Specialization fallbacks
  const domain = jp.domain || jp.Domain;
  const specialization = jp.specialization || jp.Specialization;

  if (domain && !jp.category) {
    jp.category = domain.name || domain.Name;
  }
  if (specialization && !jp.specializationName) {
    jp.specializationName = specialization.name || specialization.Name || specialization;
  }

  // Map Skills
  const skillsList = jp.jobPostSkills || jp.JobPostSkills;
  if (skillsList && Array.isArray(skillsList)) {
    jp.requiredSkills = skillsList.map(s =>
      s.skill?.name || s.skill?.Name ||
      s.Skill?.name || s.Skill?.Name ||
      s.skillName || s.SkillName || ""
    ).filter(Boolean);
  }

  // 1. Ưu tiên jobPostTasks từ API (nếu BE lưu vào đây)
  const tasksList = jp.jobPostTasks || jp.JobPostTasks;
  const implementationStr = jp.implementation || jp.Implementation;

  if (tasksList && Array.isArray(tasksList) && tasksList.length > 0) {
    jp.useCases = tasksList.map(task => {
      const miniTasks = task.jobPostMiniTasks || task.JobPostMiniTasks || [];
      return {
        id: task.id || task.Id || `uc-${Math.random()}`,
        title: task.title || task.Title || "",
        description: task.description || task.Description || "",
        originalDurationDays: task.duration || task.Duration || 1,
        durationDays: task.duration || task.Duration || 1,
        requirements: miniTasks.map(mt => ({
          id: mt.id || mt.Id || `mt-${Math.random()}`,
          title: mt.title || mt.Title || "",
          durationDays: mt.duration || mt.Duration || 1
        }))
      };
    });
  } else if (implementationStr) {
    // 2. Thử parse field implementation (JSON string lưu use cases)
    try {
      const parsed = JSON.parse(implementationStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        jp.useCases = parsed.map(uc => {
          const miniTasks = uc.MiniTasks || uc.miniTasks || uc.requirements || [];
          return {
            id: uc.id || uc.Id || `uc-${Math.random()}`,
            title: uc.Title || uc.title || "",
            description: uc.Description || uc.description || "",
            originalDurationDays: uc.Duration || uc.durationDays || 1,
            durationDays: uc.Duration || uc.durationDays || 1,
            requirements: miniTasks.map(mt => ({
              id: mt.id || mt.Id || `mt-${Math.random()}`,
              title: mt.Title || mt.title || "",
              durationDays: mt.Duration || mt.durationDays || 1
            }))
          };
        });
      } else {
        jp.useCases = [];
      }
    } catch (e) {
      jp.useCases = [];
    }
  } else {
    // 3. Fallback: localStorage (lưu lúc post trên máy này)
    const cached = loadJobUseCases(jp.id || jp.Id);
    jp.useCases = cached || [];
  }
  return jp;
}

export const api = {
  // Generic HTTP methods for ad-hoc endpoints
  get: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, { ...options, method: "PATCH", body }),
  del: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: "DELETE" }),

  auth: {
    login: (email, password) =>
      post("/users/login", { email, password }, { authenticated: false }),
    register: (data) => {
      const endpoint = "/users/register";
      const payload = {
        email: data.email,
        password: data.password,
        fullName: data.name,
        role: data.role,
        phoneNumber: data.phoneNumber || "0912345678", // Default fallback if not provided
      };
      return post(endpoint, payload, { authenticated: false });
    },
    // API Hoàn thiện Profile
    completeProfile: (userId, data) =>
      put(`/users/${userId}/expert-profile`, data),
    logout: () => post("/auth/logout"),
    forgotPassword: (email) =>
      post("/auth/forgot-password", { email }, { authenticated: false }),
    resetPassword: (token, newPassword) =>
      post("/auth/reset-password", { resetToken: token, newPassword }, { authenticated: false }),
    refreshToken: () => {
      let userId = null;
      try {
        const userInfo = sessionStorage.getItem("aitasker_user_info");
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          userId = parsed?.id || parsed?.Id;
        }
      } catch (e) { }
      if (!userId) return Promise.resolve(null);
      return post("/auth/refresh", { userId });
    },
  },

  // ĐÃ SỬA CHUẨN BACKEND CHO NHÓM USERS
  users: {
    getById: (id) => get(`/Users/${id}`),
    list: (params) => {
      const query = buildQuery(params);
      return get(`/Users${query}`);
    },
    update: (id, data) => put(`/users/${id}`, data),
    setActiveStatus: (id, isActive) => put(`/Users/${id}/set-active?isActive=${isActive}`),
    getWallet: (id) =>
      get(`/Users/${id}`).then((u) => {
        const w = u?.wallet || u?.Wallet;
        return {
          balance: w?.balance ?? w?.Balance ?? 0,
          escrowBalance: w?.escrowBalance ?? w?.EscrowBalance ?? 0,
          totalEarned: w?.totalEarned ?? w?.TotalEarned ?? 0,
        };
      }).catch(() => ({ balance: 0, escrowBalance: 0, totalEarned: 0 })),
    getJobPosts: (id) =>
      get(`/JobPosts/client/${id}`).then((posts) =>
        Array.isArray(posts) ? posts.map(mapJobPost) : [],
      ).catch(() => []),
    getProposals: (id) => get(`/Proposals/expert/${id}`).catch(() => []),
    getClientProjects: (id) => get(`/Projects/client/${id}`).catch(() => []),
    getExpertProjects: (id) => get(`/Projects/expert/${id}`).catch(() => []),

    // Resolved from auth user profile on the frontend
    getMe: () => {
      return Promise.resolve(null);
    },

    systemDashboard: () => get("/Admin/owner/system-dashboard"),
    createStaff: (data) => post("/Admin/owner/create-staff", data),
    banStaff: (staffId) => put(`/Admin/owner/ban-staff/${staffId}`),
  },

  transactions: {
    getStats: (userId) => {
      return Promise.all([
        get(`/Projects/client/${userId}`).catch(() => []),
        get("/JobPosts").catch(() => []),
        get(`/Proposals/expert/${userId}`).catch(() => []),
      ]).then(([clientProjects, allJobPosts, expertProposals]) => {
        const clientJobs = Array.isArray(allJobPosts)
          ? allJobPosts.filter((j) => j.clientId === userId)
          : [];
        return {
          posted: clientJobs.length,
          active: clientProjects.filter(
            (p) => p.status?.toLowerCase() === "inprogress",
          ).length,
          completed: clientProjects.filter(
            (p) => p.status?.toLowerCase() === "completed",
          ).length,
          proposals: expertProposals.length,
          totalSpent: 0,
        };
      });
    },
  },

  // ĐÃ SỬA LẠI ĐỂ GỌI SANG ĐƯỜNG DẪN /Users THAY VÌ /experts
  experts: {
    // API Check Profile
    checkProfile: () => get("/Users/test-expert-profile"),

    // Lấy thông tin profile của chuyên gia
    getProfile: (id) => get(`/Users/${id}/expert-profile`),

    // TODO: Backend endpoint not yet confirmed — placeholder
    getById: (id) => {
      // TODO: Replace with real endpoint e.g. get(`/experts/${id}`) or get(`/Users/${id}`)
      return get(`/Users/${id}`).catch(() => null);
    },

    // Lấy danh sách chuyên gia gọi xuống /users/experts mới mở của BE
    list: (params) => {
      const query = buildQuery(params);
      return get(`/users/experts${query}`);
    },
  },

  reviews: {
    createReview: (data) => post("/Reviews", data),
    getReviewByProject: (projectId) => get(`/Reviews/project/${projectId}`),
    getExpertReviews: (expertId) => get(`/Reviews/expert/${expertId}`),
  },

  projects: {
    list: (params) => get(`/Projects${buildQuery(params)}`).catch(() => []),
    // Phase 1 API integration
    createFromProposal: (proposalId) =>
      post(`/Projects/proposal/${proposalId}`),
    getById: (id) => get(`/Projects/${id}`),
    getByExpert: (expertId) => get(`/Projects/expert/${expertId}`).catch(() => []),
    getByClient: (clientId) => get(`/Projects/client/${clientId}`).catch(() => []),
    updateStatus: (id, status) => put(`/Projects/${id}/status?status=${encodeURIComponent(status)}`),
    submitWork: (id, data) => {
      const body = typeof data === "string" ? { projectLink: data, projectFile: "" } : {
        projectLink: data?.projectLink || "",
        projectFile: data?.projectFile || ""
      };
      return post(`/Projects/${id}/submit-work`, body);
    },

    // Phase 3 API integration
    getTasks: (projectId) => get(`/Projects/${projectId}/tasks`),
    createTask: (projectId, data) => post(`/Projects/${projectId}/tasks`, data),
    getTaskById: (taskId) => get(`/Projects/tasks/${taskId}`),
    updateTaskStatus: (taskId, status) =>
      put(`/Projects/tasks/${taskId}/status?status=${encodeURIComponent(status)}`),
    submitTask: (taskId, notes) =>
      post(`/Projects/tasks/${taskId}/submit`, { notes }),
    uploadTaskFile: async (taskId, formData) => {
      try {
        return await post("/FileUpload/upload", formData, { isFormData: true });
      } catch (err) {
        console.warn("FileUpload/upload failed, trying JobPosts/upload-file fallback:", err);
        return await post("/JobPosts/upload-file", formData, { isFormData: true });
      }
    },
    reviewTask: (taskId, data) =>
      post(`/Projects/tasks/${taskId}/review`, data),
    addMiniTask: (taskId, data) =>
      post(`/Projects/tasks/${taskId}/minitasks`, data),
    updateMiniTask: (miniTaskId, data) =>
      put(`/Projects/minitasks/${miniTaskId}`, data),
    deleteMiniTask: (miniTaskId) =>
      del(`/Projects/minitasks/${miniTaskId}`),
  },

  jobPosts: {
    list: (params) => {
      const query = buildQuery({ pageSize: 200, ...params });
      return get(`/JobPosts${query}`).then(data => {
        if (Array.isArray(data)) return data.map(mapJobPost);
        if (data && Array.isArray(data.data)) {
          data.data = data.data.map(mapJobPost);
          return data;
        }
        return data;
      });
    },
    search: (params) => {
      const query = buildQuery({ pageSize: 200, ...params });
      return get(`/JobPosts/search-filter${query}`).then(data => {
        if (Array.isArray(data)) return data.map(mapJobPost);
        if (data && Array.isArray(data.data)) {
          data.data = data.data.map(mapJobPost);
          return data;
        }
        return data;
      });
    },
    getById: (id) => get(`/JobPosts/${id}`).then(mapJobPost),
    getByClientId: (clientId) => get(`/JobPosts/client/${clientId}`).then(data => Array.isArray(data) ? data.map(mapJobPost) : data),
    create: (data) => post("/JobPosts", data).then(mapJobPost),
    update: (id, data) => put(`/JobPosts/${id}`, data).then(mapJobPost),
  },


  categoryTags: {
    getSkills: () => get("/category-tags/skills"),
    createSkill: (data) => post("/category-tags/skills", data),
    deleteSkill: (id) => del(`/category-tags/skills/${id}`),
    getCategories: () => get("/category-tags/categories"),
    createCategory: (data) => post("/category-tags/categories", data),
    deleteCategory: (id) => del(`/category-tags/categories/${id}`),
    getSpecializations: () => get("/category-tags/specializations"),
    createSpecialization: (data) => post("/category-tags/specializations", data),
    deleteSpecialization: (id) => del(`/category-tags/specializations/${id}`),
  },

  chat: {
    createConversation: (data) => post("/chat/conversations", data),
    getUserConversations: (userId) => get(`/chat/conversations/user/${userId}`),
    sendMessage: (data) => post("/chat/messages", data),
    getMessages: (conversationId) => get(`/chat/conversations/${conversationId}/messages`),
  },

  disputes: {
    submitReport: (data) => post("/Dispute/user/submit-report", data),
    getSharedQueue: (staffId) => get(`/Dispute/staff/shared-reports-queue?staffId=${staffId}`),
    triggerLock: (projectId, reason, staffId) => post(`/Dispute/staff/trigger-dispute-lock/${projectId}?reason=${encodeURIComponent(reason)}&staffId=${staffId}`),
    executeVerdict: (disputeId, winnerRole, reason, staffId) => post(`/Dispute/staff/execute-verdict/${disputeId}?winnerRole=${encodeURIComponent(winnerRole)}&verdictReason=${encodeURIComponent(reason)}&staffId=${staffId}`)
  },

  reports: {
    create: (data) => post("/Reports", data),
    getAll: () => get("/Reports"),
    getById: (id) => get(`/Reports/${id}`),
    // Cancellation flow
    adminApproveCancel: (id) => put(`/Reports/${id}/admin-approve-cancel`),
    adminRejectCancel: (id, data) => put(`/Reports/${id}/admin-reject-cancel`, data),
    partnerAcceptCancel: (id) => put(`/Reports/${id}/partner-accept-cancel`),
    partnerRejectCancel: (id, data) => put(`/Reports/${id}/partner-reject-cancel`, data),
    // Report review flow
    adminAcceptReport: (id, data) => put(`/Reports/${id}/admin-accept-report`, data),
    adminRejectReport: (id, data) => put(`/Reports/${id}/admin-reject-report`, data),
    adminRequestMoreEvidence: (id, data) => put(`/Reports/${id}/admin-request-more-evidence`, data),
    // Initiator response flow
    initiatorAcceptRejection: (id) => put(`/Reports/${id}/initiator-accept-rejection`),
    initiatorRespondRejection: (id, data) => put(`/Reports/${id}/initiator-respond-rejection`, data),
    // Partner response
    partnerSubmitResponse: (id, data) => put(`/Reports/${id}/partner-submit-response`, data),
  },

  // ===========================================================================
  // PLACEHOLDER API GROUPS — backend endpoints not yet confirmed.
  // All functions return null or resolve to null so callers never crash.
  // TODO: Connect each function to its real backend endpoint when available.
  // ===========================================================================

  timeline: {
    get: (projectId) => get(`/Projects/${projectId}/tasks`),
    getActivityLogs: (_projectId) => Promise.resolve(null),
    getProgress: (_projectId) => Promise.resolve(0),
  },

  tasks: {
    submit: (taskId) => post(`/Projects/tasks/${taskId}/submit`),
    reviewSubmission: (taskId, data) => post(`/Projects/tasks/${taskId}/review`, data),
    update: (taskId, status) => put(`/Projects/tasks/${taskId}/status?status=${encodeURIComponent(status)}`),
    updateMiniTask: (miniTaskId, data) => put(`/Projects/minitasks/${miniTaskId}`, data),
    deleteMiniTask: (miniTaskId) => del(`/Projects/minitasks/${miniTaskId}`),
    addLog: (_taskId, _log) => Promise.resolve(null),
    addFeedback: (_taskId, _feedback) => Promise.resolve(null),
    getProgress: (_taskId) => Promise.resolve(0),
  },

  extensions: {
    // TODO: Connect to real API — post("/extensions", { projectId, ...data })
    request: (_projectId, _data) => Promise.resolve(null),
    // TODO: Connect to real API — put("/extensions/{extensionId}", data)
    resolve: (_projectId, _extensionId, _data) => Promise.resolve(null),
  },

  payments: {
    // Lấy số dư ví từ GET /Users/{id} (trả về field wallet.balance)
    getWallet: (userId) =>
      get(`/Users/${userId}`).then((u) => {
        const w = u?.wallet || u?.Wallet;
        return {
          balance: w?.balance ?? w?.Balance ?? 0,
          escrowBalance: w?.escrowBalance ?? w?.EscrowBalance ?? 0,
          totalEarned: w?.totalEarned ?? w?.TotalEarned ?? 0,
        };
      }).catch(() => ({ balance: 0, escrowBalance: 0, totalEarned: 0 })),
    getTransactions: (userId) => get(userId ? `/Payment/transactions?userId=${userId}` : "/Payment/transactions").catch(() => []),
    depositWallet: (userId, amount) =>
      post(`/users/${userId}/deposit`, {
        amount: Number(amount)
      }),
    depositEscrow: (data) =>
      post(`/Projects/${data.projectId}/escrow-deposit`, {
        clientId: data.clientId,
        amount: Number(data.amount),
      }),
    releaseEscrow: (data) =>
      post(`/Projects/${data.projectId}/release-payment`),
    withdraw: (userId, amount) =>
      post(`/users/${userId}/withdraw`, {
        amount: Number(amount)
      }),
    // ZaloPay create-order: trả về { orderUrl } để redirect sang trang ZaloPay
    createPaymentOrder: (userId, amount) =>
      post("/payment/create-order", {
        userId,
        amount: Number(amount),
      }),
  },

  notifications: {
    getList: (params) => get(`/notifications${buildQuery(params)}`),
    markRead: (id) => put(`/notifications/${id}/read`),
    markAllRead: (params) => put(`/notifications/read-all${buildQuery(params)}`),
  },

  contracts: {
    create: (data) => post("/Contracts", data),
    getById: (id) => get(`/Contracts/${id}`),
    getByProject: (projectId) => get(`/Contracts/project/${projectId}`),
    getByExpert: (expertId) => get(`/Contracts/expert/${expertId}`).catch(() => []),
    updateStatus: (id, status) =>
      put(`/Contracts/${id}/status?status=${encodeURIComponent(status)}`),
  },

  proposals: {
    create: (data) => {
      // API /api/Proposals/submit-proposal nhận multipart/form-data
      const formData = new FormData();
      formData.append("JobPostId", data.jobPostId);
      formData.append("ExpertId", data.expertId);
      formData.append("BidAmount", String(data.bidAmount));
      formData.append("EstimatedDuration", String(data.estimatedDays));
      formData.append("Introduction", data.introduction || "");
      formData.append("Implementation", data.coverLetter || "");

      // Append files thực tế nếu có, hoặc để trống
      if (data.portfolio instanceof File) {
        formData.append("Portfolio", data.portfolio);
      } else {
        formData.append("PortfolioUrl", data.portfolioUrl || "");
      }

      if (data.attachment instanceof File) {
        formData.append("Attachment", data.attachment);
      } else {
        formData.append("AttachmentUrl", data.attachmentUrl || "");
      }

      return post("/Proposals/submit-proposal", formData, { isFormData: true });
    },
    getByJob: (jobPostId) => get(`/Proposals/job/${jobPostId}`),
    getByExpert: (expertId) => get(`/Proposals/expert/${expertId}`),
    getById: (id) => get(`/Proposals/${id}`),
    update: (id, data) => {
      const formData = new FormData();
      formData.append("BidAmount", String(data.bidAmount));
      formData.append("EstimatedDuration", String(data.estimatedDays));
      formData.append("Introduction", data.introduction || "");
      formData.append("Implementation", data.coverLetter || "");

      if (data.portfolio instanceof File) {
        formData.append("Portfolio", data.portfolio);
      } else {
        formData.append("PortfolioUrl", data.portfolioUrl || "");
      }

      if (data.attachment instanceof File) {
        formData.append("Attachment", data.attachment);
      } else {
        formData.append("AttachmentUrl", data.attachmentUrl || "");
      }

      return put(`/Proposals/${id}`, formData, { isFormData: true });
    },
    updateStatus: (id, status) =>
      put(`/Proposals/${id}/status?status=${encodeURIComponent(status)}`, { status }),
    delete: (id) => del(`/Proposals/${id}`),
  },

  // Real AI backend endpoints
  ai: {
    sendSession: (data) => post("/AiChat/send-session", data, { timeout: 60000 }),
    uploadChatFile: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return post("/FileUpload/upload", fd, { isFormData: true, timeout: 60000 });
    },
    recommendExperts: (data) => post("/JobPosts/recommend-experts", data),
    recommendForExpert: (expertId) => get(`/JobPosts/recommend-for-expert/${expertId}`),
    analyzeJobToUsecases: (jobPostId) =>
      post(`/Proposals/analyze-job-to-usecases/${jobPostId}`),
    expertChatSession: (data) =>
      post("/Proposals/expert-ai-chat-session", data, { timeout: 60000 }),
    getExpertAiChatHistory: (jobPostId, expertId) =>
      get(`/Proposals/expert-ai-chat-history?jobPostId=${jobPostId}&expertId=${expertId}`, { timeout: 15000 }),
    generateMilestone: (proposalId) =>
      post(`/Proposals/${proposalId}/generate-milestone-md`),
  },
};

export function enrichFileUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  try {
    const parsed = new URL(API_BASE_URL);
    return `${parsed.protocol}//${parsed.host}${url}`;
  } catch (e) {
    return `https://aitaskerbe-production.up.railway.app${url}`;
  }
}

export function parseProposalWbs(rawImplementation, proposal) {
  let parsed = {};
  try {
    parsed = JSON.parse(rawImplementation);
  } catch (e) {
    parsed = {
      coverLetter: rawImplementation,
      professionalIntro: proposal?.introduction || rawImplementation || "",
    };
  }

  const dbTasks = proposal?.proposalTasks || proposal?.ProposalTasks || [];
  const rawTasks = parsed?.tasks || (Array.isArray(parsed) && parsed.length > 0 ? parsed : []) || [];
  const finalTasks = rawTasks.length > 0 ? rawTasks : dbTasks;

  const tasks = finalTasks.map((t, idx) => {
    const titleVal = t.title || t.Title || "";
    const ucidMatch = titleVal.match(/\[UCID:(.*?)\]/);
    const useCaseId = ucidMatch ? ucidMatch[1] : (t.useCaseId || t.UseCaseId || null);
    const cleanTitle = titleVal.replace(/\s*\[UCID:.*?\]/, "");

    const mTasks = t.miniTasks || t.MiniTasks || t.proposalMiniTasks || t.ProposalMiniTasks || [];
    const miniTasks = mTasks.map((m, mtIdx) => ({
      id: m.id || m.Id || `mt-${Date.now()}-${mtIdx}`,
      taskId: m.taskId || m.TaskId || t.id || t.Id || null,
      title: m.title || m.Title || "",
      description: m.description || m.Description || "",
      status: m.status || m.Status || "pending",
      isCompleted: m.isCompleted || m.IsCompleted || false,
    }));

    return {
      id: t.id || t.Id || `task-${idx}`,
      useCaseId: useCaseId,
      useCaseTitle: t.useCaseTitle || t.UseCaseTitle || null,
      title: cleanTitle,
      description: t.description || t.Description || "",
      source: t.source || t.Source || "expert",
      approvalStatus: t.approvalStatus || t.ApprovalStatus || "accepted",
      locked: t.locked !== false,
      price: Number(t.price || t.Price) || 0,
      completionDays: Number(t.completionDays || t.CompletionDays || t.duration || t.Duration || t.durationDays) || 1,
      miniTasks: miniTasks,
    };
  });

  return {
    proposalTitle: parsed?.proposalTitle || "Proposal",
    professionalIntro: parsed?.professionalIntro || proposal?.introduction || parsed?.coverLetter || "",
    technicalApproach: parsed?.technicalApproach || "",
    timelineMilestones: parsed?.timelineMilestones || "",
    dependencies: parsed?.dependencies || "",
    durationDays: parsed?.durationDays || proposal?.estimatedDuration || 0,
    tasks: tasks,
    proposedTasks: parsed?.proposedTasks || [],
    useCaseBreakdown: parsed?.useCaseBreakdown || [],
    totalBidAmount: parsed?.totalBidAmount || proposal?.bidAmount || 0,
  };
}

function buildQuery(params) {
  if (!params || typeof params !== "object") return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) searchParams.append(key, String(value));
  return `?${searchParams.toString()}`;
}

export const login = api.auth.login;
export const register = api.auth.register;
export default api;
