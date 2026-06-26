const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://unoverthrown-unspuriously-leyla.ngrok-free.dev/api";
const TOKEN_STORAGE_KEY = "aitasker_auth_token";

function getToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
}

async function request(endpoint, options = {}) {
  // ── Mock DB short-circuit — bypass network entirely when enabled ──
  if (import.meta.env.VITE_USE_MOCK_DB === "true") {
    const { handleMockRequest } = await import("../data/mockApiHandler.js");
    const method = options.method || (options.body ? "POST" : "GET");
    return handleMockRequest(endpoint, method, options.body, options.authenticated !== false, getToken());
  }
  // ── End mock DB guard ──

  const {
    authenticated = true,
    body,
    method,
    headers: extraHeaders = {},
    timeout = 5000, // 5 s default — fail fast for unavailable backends
    ...rest
  } = options;

  const httpMethod = method || (body ? "POST" : "GET");

  // Mock interceptor disabled - proceed with real API calls

  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true", // Bypass ngrok
    ...extraHeaders,
  };

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
  if (body !== undefined && body !== null) init.body = JSON.stringify(body);

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

export const api = {
  // Generic HTTP methods for ad-hoc endpoints
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "PATCH", body }),
  del: (endpoint, options = {}) => request(endpoint, { ...options, method: "DELETE" }),

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
      };
      return post(endpoint, payload, { authenticated: false });
    },
    // API Hoàn thiện Profile
    completeProfile: (userId, data) => put(`/users/${userId}/expert-profile`, data),
    logout: () => post("/users/logout"),
    // TODO: Backend endpoint not yet confirmed — placeholder
    forgotPassword: (email) => {
      // TODO: Connect to real endpoint e.g. post("/auth/forgot-password", { email })
      return Promise.resolve(null);
    },
    // TODO: Backend endpoint not yet confirmed — placeholder
    resetPassword: (token, newPassword) => {
      // TODO: Connect to real endpoint e.g. post("/auth/reset-password", { token, newPassword })
      return Promise.resolve(null);
    },
    // TODO: Backend endpoint not yet confirmed — placeholder
    refreshToken: () => {
      // TODO: Connect to real endpoint e.g. post("/auth/refresh")
      return Promise.resolve(null);
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
    getWallet: (id) => get(`/Users/${id}`).then(u => u?.wallet || { balance: 0 }),
    getJobPosts: (id) => get("/JobPosts").then(posts => (Array.isArray(posts) ? posts.filter(p => p.clientId === id) : [])),
    getProposals: (id) => get(`/Proposals/expert/${id}`).catch(() => []),
    getClientProjects: (id) => get(`/Projects/client/${id}`).catch(() => []),
    getExpertProjects: (id) => get(`/Projects/expert/${id}`).catch(() => []),

    // Resolved from auth user profile on the frontend
    getMe: () => {
      return Promise.resolve(null);
    },

    getStats: (userId) => {
      return Promise.all([
        get(`/Projects/client/${userId}`).catch(() => []),
        get("/JobPosts").catch(() => []),
        get(`/Proposals/expert/${userId}`).catch(() => [])
      ]).then(([clientProjects, allJobPosts, expertProposals]) => {
        const clientJobs = Array.isArray(allJobPosts) ? allJobPosts.filter(j => j.clientId === userId) : [];
        return {
          posted: clientJobs.length,
          active: clientProjects.filter(p => p.status?.toLowerCase() === "inprogress").length,
          completed: clientProjects.filter(p => p.status?.toLowerCase() === "completed").length,
          proposals: expertProposals.length,
          totalSpent: 0
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

    // Lấy danh sách chuyên gia cũng sẽ gọi xuống Users (kèm filter nếu BE yêu cầu)
    list: (params) => {
      const query = buildQuery(params);
      return get(`/Users${query}`);
    },
  },

  projects: {
    create: (data) => post("/Projects", data),
    list: (params) => {
      const query = buildQuery(params);
      return get(`/Projects${query}`);
    },
    getByClient: (clientId) => get(`/Projects/client/${clientId}`),
    getByExpert: (expertId) => get(`/Projects/expert/${expertId}`),
    updateStatus: (id, status) => put(`/Projects/${id}/status?status=${encodeURIComponent(status)}`),
    submitWork: (id, projectLink) => put(`/Projects/${id}/submit-work?projectLink=${encodeURIComponent(projectLink)}`),
  },

  jobPosts: {
    list: () => get("/JobPosts"),
    search: (params) => {
      const query = buildQuery(params);
      return get(`/JobPosts/search-filter${query}`);
    },
    getById: (id) => get(`/JobPosts/${id}`),
    create: (data) => post("/JobPosts", data),
    update: (id, data) => put(`/JobPosts/${id}`, data),
  },

  categoryTags: {
    getSkills: () => get("/category-tags/skills"),
  },
  // ===========================================================================
  // PLACEHOLDER API GROUPS — backend endpoints not yet confirmed.
  // All functions return null or resolve to null so callers never crash.
  // TODO: Connect each function to its real backend endpoint when available.
  // ===========================================================================

  timeline: {
    // TODO: Connect to real API — get("/timeline/{projectId}")
    get: (_projectId) => Promise.resolve(null),
    // TODO: Connect to real API — get("/timeline/{projectId}/activity")
    getActivityLogs: (_projectId) => Promise.resolve(null),
    // TODO: Connect to real API — get("/timeline/{projectId}/progress")
    getProgress: (_projectId) => Promise.resolve(0),
  },

  tasks: {
    // TODO: Connect to real API — post("/tasks/{taskId}/submit", data)
    submit: (_taskId, _data) => Promise.resolve(null),
    // TODO: Connect to real API — post("/tasks/submissions/{submissionId}/review", data)
    reviewSubmission: (_submissionId, _data) => Promise.resolve(null),
    // TODO: Connect to real API — put("/tasks/{taskId}", updates)
    update: (_taskId, _updates) => Promise.resolve(null),
    // TODO: Connect to real API — put("/tasks/{taskId}/mini-tasks/{miniTaskId}", updates)
    updateMiniTask: (_taskId, _miniTaskId, _updates) => Promise.resolve(null),
    // TODO: Connect to real API — post("/tasks/{taskId}/logs", log)
    addLog: (_taskId, _log) => Promise.resolve(null),
    // TODO: Connect to real API — post("/tasks/{taskId}/feedback", feedback)
    addFeedback: (_taskId, _feedback) => Promise.resolve(null),
    // TODO: Connect to real API — get("/tasks/{taskId}/progress")
    getProgress: (_taskId) => Promise.resolve(0),
  },

  extensions: {
    // TODO: Connect to real API — post("/extensions", { projectId, ...data })
    request: (_projectId, _data) => Promise.resolve(null),
    // TODO: Connect to real API — put("/extensions/{extensionId}", data)
    resolve: (_projectId, _extensionId, _data) => Promise.resolve(null),
  },

  payments: {
    getWallet: (userId) => get(`/Users/${userId}`).then(u => u?.wallet || { balance: 0 }),
    getTransactions: () => get("/interactions").catch(() => []),
    depositEscrow: (data) => post("/interactions/transaction", {
      projectId: data.projectId,
      amount: data.amount,
      type: "escrow_deposit"
    }),
    releaseEscrow: (data) => post("/interactions/transaction", {
      projectId: data.projectId,
      amount: data.amount,
      type: "escrow_release"
    }),
    withdraw: (data) => post("/interactions/transaction", {
      amount: data.amount,
      type: "withdrawal"
    }),
  },

  notifications: {
<<<<<<< Updated upstream
    // TODO: Connect to real API — get("/notifications")
    getList: (_params) => {
      // Attempt to fetch from backend; fall back to empty array
      return get("/Notifications").catch(() => []);
    },
    // TODO: Connect to real API — put("/notifications/{id}/read")
    markRead: (_id) => Promise.resolve(null),
    // TODO: Connect to real API — put("/notifications/read-all")
    markAllRead: () => Promise.resolve(null),
    // TODO: Backend endpoint not yet confirmed — placeholder
    send: (data) => {
      // TODO: Connect to real endpoint e.g. post("/Notifications", data)
      return post("/Notifications", data).catch(() => null);
    },
  },

  contracts: {
    // TODO: Backend endpoint not yet confirmed — placeholder
    create: (data) => {
      // TODO: Connect to real endpoint e.g. post("/Contracts", data)
      return post("/Contracts", data);
    },
    // TODO: Backend endpoint not yet confirmed — placeholder
    getById: (id) => {
      // TODO: Connect to real endpoint e.g. get(`/Contracts/${id}`)
      return get(`/Contracts/${id}`);
    },
    // TODO: Backend endpoint not yet confirmed — placeholder
    getByProject: (projectId) => {
      // TODO: Connect to real endpoint e.g. get(`/Contracts/project/${projectId}`)
      return get(`/Contracts/project/${projectId}`);
    },
    // TODO: Backend endpoint not yet confirmed — placeholder
    getByExpert: (expertId) => {
      // TODO: Connect to real endpoint e.g. get(`/Contracts/expert/${expertId}`)
      return get(`/Contracts/expert/${expertId}`).catch(() => []);
    },
    // TODO: Backend endpoint not yet confirmed — placeholder
    updateStatus: (id, status) => {
      // TODO: Connect to real endpoint e.g. put(`/Contracts/${id}/status?status=...`)
      return put(`/Contracts/${id}/status?status=${encodeURIComponent(status)}`);
    },
=======
    getList: (params) => get(`/notifications${buildQuery(params)}`),
    markRead: (id) => put(`/notifications/${id}/read`),
    markAllRead: () => put("/notifications/read-all"),
>>>>>>> Stashed changes
  },

  proposals: {
    create: (data) => post("/Proposals/submit-proposal", data),
    getByJob: (jobPostId) => get(`/Proposals/job/${jobPostId}`),
    getByExpert: (expertId) => get(`/Proposals/expert/${expertId}`),
<<<<<<< Updated upstream
    getById: (id) => get(`/Proposals/${id}`),
=======
    update: (id, data) => put(`/Proposals/${id}`, data),
>>>>>>> Stashed changes
    updateStatus: (id, status) => put(`/Proposals/${id}/status?status=${encodeURIComponent(status)}`),
    delete: (id) => del(`/Proposals/${id}`),
  },

  // TODO: Connect to real AI backend when available
  ai: {
    // Generate project tasks & milestones from chat messages and file context
    chat: (_messages, _fileNames, _projectContext) => Promise.resolve(null),
  },
};

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
