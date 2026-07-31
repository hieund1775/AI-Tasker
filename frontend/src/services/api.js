import { validateFormDataUploadFiles } from "../app/lib/fileValidation.js";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://aitaskerbe-production.up.railway.app/api";
const TOKEN_STORAGE_KEY = "aitasker_auth_token";

function getToken() {
  try {
    return (
      sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
      sessionStorage.getItem("token")
    );
  } catch {
    return null;
  }
}

const CLAIM_USER_ID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const CLAIM_ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

function decodeJwtPayload(token) {
  try {
    if (!token || token.startsWith("mock-jwt-token-for-")) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return JSON.parse(decodeURIComponent(escape(binary)));
  } catch {
    return null;
  }
}

function getTokenRole() {
  const payload = decodeJwtPayload(getToken());
  const role = payload?.role || payload?.[CLAIM_ROLE] || "";
  return role ? String(role).toLowerCase() : "";
}

function getTokenUserId() {
  const payload = decodeJwtPayload(getToken());
  return payload?.sub || payload?.nameid || payload?.[CLAIM_USER_ID] || "";
}

function resolveProposalExpertId(expertId) {
  const tokenRole = getTokenRole();
  const tokenUserId = getTokenUserId();

  if (tokenRole && tokenRole !== "expert") {
    throw new ApiError("Only expert accounts can submit proposals. Please log in with an expert account.", 403);
  }

  if (tokenUserId && expertId && String(tokenUserId).toLowerCase() !== String(expertId).toLowerCase()) {
    throw new ApiError("The active session does not match this expert account. Please log out and log in again.", 403);
  }

  return tokenUserId || expertId;
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem("aitasker_user_info");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
  } catch { }
}

function looksMojibake(value) {
  return /(?:\u00c3|\u00c2|\u00e2|\ufffd|\u00c4|\u00e1\u00ba|\u00e1\u00bb|\u00f0\u0178)/.test(value);
}

const WINDOWS_1252_BYTES = {
  "\u20ac": 0x80,
  "\u201a": 0x82,
  "\u0192": 0x83,
  "\u201e": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02c6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017d": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02dc": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203a": 0x9b,
  "\u0153": 0x9c,
  "\u017e": 0x9e,
  "\u0178": 0x9f,
};

function mojibakeByteForChar(char) {
  return WINDOWS_1252_BYTES[char] ?? (char.charCodeAt(0) & 0xff);
}

function repairMojibakeString(value) {
  if (typeof value !== "string" || !looksMojibake(value)) return value;

  try {
    const bytes = Uint8Array.from(value, mojibakeByteForChar);
    const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return looksMojibake(repaired) ? value : repaired;
  } catch {
    return value;
  }
}

function normalizeResponseText(value, seen = new WeakSet()) {
  if (typeof value === "string") return repairMojibakeString(value);
  if (!value || typeof value !== "object") return value;

  if (seen.has(value)) return value;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => normalizeResponseText(item, seen));
  }

  Object.keys(value).forEach((key) => {
    value[key] = normalizeResponseText(value[key], seen);
  });
  return value;
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
    timeout = 15000, // 15s - Railway backend needs extra time on cold starts
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

  if (options.isFormData && body instanceof FormData) {
    const fileValidation = validateFormDataUploadFiles(body);
    if (!fileValidation.valid) {
      throw new ApiError(fileValidation.message, 413);
    }
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
        "Request timed out - the server did not respond in time.",
        0,
        networkError,
      );
    }
    throw new ApiError(
      "Network error - please check your connection and try again.",
      0,
      networkError,
    );
  }
  clearTimeout(timer);

  // NOTE: We do NOT auto-clear the token on 401 here to prevent random logouts.
  // Many dashboard APIs may return 401 if the user lacks permission or the endpoint is unimplemented.
  // The UI will handle the error gracefully via .catch() or ErrorBoundaries.
  if (response.status === 401) {
    // if (typeof window !== "undefined") {
    //   window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    // }
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

  data = normalizeResponseText(data);

  if (!response.ok) {
    const message =
      (data && (data.message || data.title || data.error)) ||
      `Request failed with status ${response.status}`;

    const msgLower = String(message || "").toLowerCase();
    if (
      response.status === 401 ||
      response.status === 403 ||
      msgLower.includes("inactive") ||
      msgLower.includes("locked") ||
      msgLower.includes("suspended") ||
      msgLower.includes("banned")
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }

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

export function saveJobAttachments(jobId, attachments) {
  try {
    localStorage.setItem(`aitasker_job_attachments_${jobId}`, JSON.stringify(attachments));
  } catch (e) { }
}

function loadJobAttachments(jobId) {
  try {
    const raw = localStorage.getItem(`aitasker_job_attachments_${jobId}`);
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

  // 1. Prioritize jobPostTasks from API (if BE saves them here)
  const tasksList = jp.jobPostTasks || jp.JobPostTasks;
  const implementationStr = jp.implementation || jp.Implementation;

  let parsedImplementation = [];
  if (implementationStr) {
    try {
      const parsed = JSON.parse(implementationStr);
      if (Array.isArray(parsed)) {
        parsedImplementation = parsed;
      }
    } catch (e) {
      console.warn("Failed to parse implementation string", e);
    }
  }
  const cachedUseCases = loadJobUseCases(jp.id || jp.Id) || [];

  if (tasksList && Array.isArray(tasksList) && tasksList.length > 0) {
    jp.useCases = tasksList.map((task, idx) => {
      const miniTasks = task.jobPostMiniTasks || task.JobPostMiniTasks || [];
      const parsedUc = parsedImplementation.find(u => (u.Title || u.title) === (task.title || task.Title)) || parsedImplementation[idx];
      const cachedUc = cachedUseCases.find(c => c.title === (task.title || task.Title)) || cachedUseCases[idx];
      const descVal = task.description || task.Description || parsedUc?.Description || parsedUc?.description || cachedUc?.description || "";
      return {
        id: task.id || task.Id || `uc-${Math.random()}`,
        title: task.title || task.Title || "",
        description: descVal,
        originalDurationDays: task.duration || task.Duration || 1,
        durationDays: task.duration || task.Duration || 1,
        requirements: miniTasks.map(mt => ({
          id: mt.id || mt.Id || `mt-${Math.random()}`,
          title: mt.title || mt.Title || "",
          durationDays: mt.duration || mt.Duration || 1
        }))
      };
    });
  } else if (parsedImplementation.length > 0) {
    // 2. Try parsing field implementation (JSON string storing use cases)
    jp.useCases = parsedImplementation.map((uc, idx) => {
      const miniTasks = uc.MiniTasks || uc.miniTasks || uc.requirements || [];
      const cachedUc = cachedUseCases.find(c => c.title === (uc.Title || uc.title)) || cachedUseCases[idx];
      return {
        id: uc.id || uc.Id || `uc-${Math.random()}`,
        title: uc.Title || uc.title || "",
        description: uc.Description || uc.description || cachedUc?.description || "",
        originalDurationDays: uc.Duration || uc.duration || uc.durationDays || 1,
        durationDays: uc.Duration || uc.duration || uc.durationDays || 1,
        requirements: miniTasks.map(mt => ({
          id: mt.id || mt.Id || `mt-${Math.random()}`,
          title: mt.Title || mt.title || "",
          durationDays: mt.Duration || mt.duration || mt.durationDays || 1
        }))
      };
    });
  } else {
    // 3. Fallback: localStorage (saved during post on this machine)
    jp.useCases = cachedUseCases;
  }

  // Inject attachments from localStorage fallback
  if (!jp._attachments) {
    const id = jp.id || jp.Id;
    if (id) {
      const cached = loadJobAttachments(id);
      if (cached) jp._attachments = cached;
    }
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
    // Profile Completion API
    completeProfile: (userId, data) =>
      put(`/users/${userId}/expert-profile`, data),
    logout: () => post("/auth/logout"),
    forgotPassword: (email) =>
      post("/auth/forgot-password", { email }, { authenticated: false }),
    resetPassword: (token, newPassword) =>
      post("/auth/reset-password", { resetToken: token, newPassword }, { authenticated: false }),
    verifyEmail: (data) =>
      post("/users/verify-email", data, { authenticated: false }),
    resendVerification: (data) =>
      post("/users/resend-verification", data, { authenticated: false }),
    refreshToken: () => {
      let userId = null;
      try {
        const userInfo =
          sessionStorage.getItem("aitasker_user_info") ||
          sessionStorage.getItem("user");
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          userId = parsed?.id || parsed?.Id;
        }
      } catch (e) { }
      if (!userId) return Promise.resolve(null);
      return post("/auth/refresh", { userId });
    },
  },

  // FIXED BACKEND STANDARD FOR USERS GROUP
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

    getMe: () => get("/users/me"),

    systemDashboard: () => get("/Admin/owner/system-dashboard"),
    createStaff: (data) => post("/Admin/owner/create-staff", data),
    banStaff: (staffId) => put(`/Admin/owner/ban-staff/${staffId}`),
  },

  transactions: {
    getStats: (userId) =>
      get(`/users/${userId}/dashboard-stats`).catch(() => ({
        posted: 0, active: 0, completed: 0, proposals: 0, totalSpent: 0
      })),
  },

  // MODIFIED TO CALL /Users ENDPOINT INSTEAD OF /experts
  experts: {
    // API Check Profile
    checkProfile: () => get("/Users/test-expert-profile"),

    // Retrieve expert profile info
    getProfile: (id) => get(`/Users/${id}/expert-profile`),

    // TODO: Backend endpoint not yet confirmed - placeholder
    getById: (id) => {
      // TODO: Replace with real endpoint e.g. get(`/experts/${id}`) or get(`/Users/${id}`)
      return get(`/Users/${id}`).catch(() => null);
    },

    // Retrieve expert list from the new /users/experts BE endpoint
    list: (params) => {
      const query = buildQuery(params);
      return get(`/users/experts${query}`);
    },
  },

  reviews: {
    createReview: (data) => post("/Reviews", data),
    getReviewByProject: (projectId) => get(`/Reviews/project/${projectId}`).catch(() => null),
    getExpertReviews: (expertId) => get(`/Reviews/expert/${expertId}`).catch(() => ({ totalReviews: 0, reviews: [] })),
    updateReview: (reviewId, data) => put(`/Reviews/${reviewId}`, data),
    replyReview: (reviewId, data) => post(`/Reviews/${reviewId}/reply`, data),
  },

  projects: {
    list: (params) => get(`/Projects${buildQuery(params)}`).catch(() => []),
    // Phase 1 API integration
    createFromProposal: (proposalId) =>
      post(`/Projects/proposal/${proposalId}`),
    getById: (id) => get(`/Projects/${id}`),
    getByExpert: (expertId) => get(`/Projects/expert/${expertId}`).catch(() => []),
    getByClient: (clientId) => get(`/Projects/client/${clientId}`).catch(() => []),
    updateStatus: (id, status) => put(`/Projects/${id}/status`, { status }),
    updateMetadata: (id, metadata) => put(`/Projects/${id}/metadata`, { metadata }),
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
  // PLACEHOLDER API GROUPS - backend endpoints not yet confirmed.
  // All functions return null or resolve to null so callers never crash.
  // TODO: Connect each function to its real backend endpoint when available.
  // ===========================================================================

  timeline: {
    get: (projectId) => get(`/Projects/${projectId}/tasks`),
    getActivityLogs: (projectId) => get(`/Projects/${projectId}/activity-logs`),
    getProgress: (_projectId) => Promise.resolve(0), // Handled by FE useProjectProgress
  },

  tasks: {
    submit: (taskId) => post(`/Projects/tasks/${taskId}/submit`),
    reviewSubmission: (taskId, data) => post(`/Projects/tasks/${taskId}/review`, data),
    update: (taskId, status) => put(`/Projects/tasks/${taskId}/status?status=${encodeURIComponent(status)}`),
    updateMiniTask: (miniTaskId, data) => put(`/Projects/minitasks/${miniTaskId}`, data),
    deleteMiniTask: (miniTaskId) => del(`/Projects/minitasks/${miniTaskId}`),
    addLog: (taskId, log) => post(`/Projects/tasks/${taskId}/logs`, log),
    addFeedback: (taskId, feedback) => post(`/Projects/tasks/${taskId}/feedback`, feedback),
    getProgress: (_taskId) => Promise.resolve(0), // Handled by FE useProjectProgress
  },

  extensions: {
    request: (projectId, data) => post(`/Projects/${projectId}/extensions`, data),
    resolve: (_projectId, extensionId, data) => put(`/Projects/extensions/${extensionId}/resolve`, data),
  },

  payments: {
    // Retrieve wallet balance from GET /Users/{id} (returns wallet.balance field)
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
    withdraw: (userId, amount, extraData = {}) =>
      post(`/users/${userId}/withdraw`, {
        amount: Number(amount),
        bankCode: extraData.bankCode || "VISA (ZaloPay)",
        cardNumber: extraData.cardNumber || extraData.bankAccountNumber || "",
        cardHolderName: extraData.cardHolderName || extraData.bankAccountName || "",
      }),
    // ZaloPay create-order: returns { orderUrl } to redirect to ZaloPay page
    createPaymentOrder: (userId, amount) =>
      post("/payment/create-order", {
        userId,
        amount: Number(amount),
      }),
  },

  notifications: {
    getList: (params) => get(`/notifications${buildQuery(params)}`).catch(() => []),
    markRead: (id) => put(`/notifications/${id}/read`).catch(() => null),
    markAllRead: (params) => put(`/notifications/read-all${buildQuery(params)}`).catch(() => null),
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
      const expertId = resolveProposalExpertId(data.expertId);
      // API /api/Proposals/submit-proposal accepts multipart/form-data
      const formData = new FormData();
      formData.append("JobPostId", data.jobPostId);
      formData.append("ExpertId", expertId);
      formData.append("BidAmount", String(data.bidAmount));
      formData.append("EstimatedDuration", String(data.estimatedDays));
      formData.append("Introduction", data.introduction || "");
      formData.append("Implementation", data.coverLetter || "");

      // Append PortfolioUrl string if available
      if (data.portfolioUrl && String(data.portfolioUrl).trim() !== "") {
        formData.append("PortfolioUrl", String(data.portfolioUrl).trim());
      }
      if (data.portfolio instanceof File) {
        formData.append("Portfolio", data.portfolio);
      }

      // Append AttachmentUrl string if available
      if (data.attachmentUrl && String(data.attachmentUrl).trim() !== "") {
        formData.append("AttachmentUrl", String(data.attachmentUrl).trim());
      }
      if (data.attachment instanceof File) {
        formData.append("Attachment", data.attachment);
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

      if (data.portfolioUrl && String(data.portfolioUrl).trim() !== "") {
        formData.append("PortfolioUrl", String(data.portfolioUrl).trim());
      }
      if (data.portfolio instanceof File) {
        formData.append("Portfolio", data.portfolio);
      }

      if (data.attachmentUrl && String(data.attachmentUrl).trim() !== "") {
        formData.append("AttachmentUrl", String(data.attachmentUrl).trim());
      }
      if (data.attachment instanceof File) {
        formData.append("Attachment", data.attachment);
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
    generateExpertIntroduction: (data) => post("/AiChat/generate-expert-introduction", data, { timeout: 60000 }),
    analyzeMinitasks: (data) => post("/AiChat/analyze-minitasks", data, { timeout: 60000 }),
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

  let cleanPath = url.trim();
  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }
  if (
    !cleanPath.startsWith("/uploads/") &&
    !cleanPath.startsWith("/job_files/") &&
    !cleanPath.startsWith("/api/")
  ) {
    cleanPath = "/uploads" + cleanPath;
  }

  try {
    const parsed = new URL(API_BASE_URL);
    return `${parsed.origin}${cleanPath}`;
  } catch (e) {
    return `https://aitaskerbe-production.up.railway.app${cleanPath}`;
  }
}

/**
 * Strips GUIDs, hashes, and timestamp prefixes off filenames,
 * returning the clean human-readable original filename.
 */
export function cleanFileName(name) {
  if (!name || typeof name !== "string") return "Attachment Document";

  // Check for ?name=OriginalName or ?filename=OriginalName in URL
  const qsMatch = name.match(/[?&](?:name|filename)=([^&]+)/);
  if (qsMatch) {
    try { return decodeURIComponent(qsMatch[1]); } catch (e) { return qsMatch[1]; }
  }

  let raw = name.split("?")[0].split("/").pop().split("\\").pop() || "Attachment Document";
  try {
    raw = decodeURIComponent(raw);
  } catch (e) {}

  const cleaned = raw
    .replace(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})_/i, "")
    .replace(/^[a-f0-9-]{32,38}_/i, "")
    .replace(/^[a-f0-9]{24,32}_/i, "")
    .replace(/^\d{10,17}[-_]/, "")
    .replace(/^\d+[-_]/, "");

  const resultName = cleaned || raw;
  // If resultName is a raw pure GUID (e.g. 630eb873-b50a-4e9d-aa99-751a337ff95d.docx)
  const isPureGuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(\.[a-z0-9]+)?$/i.test(resultName);
  if (isPureGuid) {
    const ext = resultName.match(/(\.[a-z0-9]+)$/i)?.[1] || ".pdf";
    return `Proposal_Attachment_Document${ext}`;
  }

  return resultName;
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
    let titleVal = t.title || t.Title || "";
    if (typeof titleVal === "string" && titleVal.trim().startsWith("{")) {
      try {
        const parsedT = JSON.parse(titleVal);
        if (parsedT.tasks && Array.isArray(parsedT.tasks) && parsedT.tasks[0]) {
          titleVal = parsedT.tasks[0].title || parsedT.tasks[0].Title || "Proposed Task";
        } else if (parsedT.Title || parsedT.title) {
          titleVal = parsedT.Title || parsedT.title;
        }
      } catch (e) { }
    }

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
    attachments: parsed?.attachments || [],
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
