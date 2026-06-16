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
  const {
    authenticated = true,
    body,
    method,
    headers: extraHeaders = {},
    timeout = 5000, // 5 s default — fail fast for unavailable backends
    ...rest
  } = options;
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

  const httpMethod = method || (body ? "POST" : "GET");
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
    getById: (id) => get(`/users/${id}`),
    list: (params) => {
      const query = buildQuery(params);
      return get(`/users${query}`);
    },
    update: (id, data) => put(`/users/${id}`, data),
    getWallet: (id) => get(`/users/${id}`).then(u => u?.wallet || { balance: 0 }),
    getJobPosts: (id) => get("/jobposts").then(posts => (Array.isArray(posts) ? posts.filter(p => p.clientId === id) : [])),
    getProposals: (id) => get(`/proposals/expert/${id}`).catch(() => []),
    getClientProjects: (id) => get(`/projects/client/${id}`).catch(() => []),
    getExpertProjects: (id) => get(`/projects/expert/${id}`).catch(() => []),

    // Resolved from auth user profile on the frontend
    getMe: () => {
      return Promise.resolve(null);
    },

    getStats: (userId) => {
      return Promise.all([
        get(`/projects/client/${userId}`).catch(() => []),
        get("/jobposts").catch(() => []),
        get(`/proposals/expert/${userId}`).catch(() => [])
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
    checkProfile: () => get("/users/test-expert-profile"),

    // Lấy thông tin profile của chuyên gia
    getProfile: (id) => get(`/users/${id}`),

    // Lấy thông tin chi tiết chuyên gia
    getById: (id) => {
      return get(`/users/${id}`).catch(() => null);
    },

    // Lấy danh sách chuyên gia
    list: (params) => {
      const query = buildQuery(params);
      return get(`/users${query}`);
    },
  },

  projects: {
    create: (data) => post("/projects", data),
    list: (params) => {
      const query = buildQuery(params);
      return get(`/projects${query}`);
    },
    getById: (id) => get(`/projects/${id}`),
    getByClient: (clientId) => get(`/projects/client/${clientId}`),
    getByExpert: (expertId) => get(`/projects/expert/${expertId}`),
    updateStatus: (id, status) => put(`/projects/${id}/status?status=${encodeURIComponent(status)}`),
    submitWork: (id, projectLink) => put(`/projects/${id}/submit-work?projectLink=${encodeURIComponent(projectLink)}`),
  },

  jobPosts: {
    list: () => get("/JobPosts"),
    search: (params) => {
      const query = buildQuery(params);
      return get(`/jobposts/search${query}`);
    },
    getById: (id) => get(`/JobPosts/${id}`),
    create: (data) => post("/JobPosts", data),
    update: (id, data) => put(`/JobPosts/${id}`, data),
  },

  categoryTags: {
    getSkills: () => get("/category-tags/skills"),
  },
  // ===========================================================================
  // REVIEWS API — real backend endpoints
  // ===========================================================================
  reviews: {
    getByExpert: (expertId) => get(`/experts/${expertId}/reviews`).catch(() => []),
    getRatingSummary: (expertId) => get(`/experts/${expertId}/rating-summary`).catch(() => null),
    create: (data) => post("/interactions/reviews", data),
  },

  // ===========================================================================
  // CHAT API — real backend endpoints
  // ===========================================================================
  chat: {
    getConversations: () => get("/chat/conversations").catch(() => []),
    getConversation: (id) => get(`/chat/conversations/${id}`),
    createConversation: (data) => post("/chat/conversations", data),
    getMessages: (conversationId) => get(`/chat/conversations/${conversationId}/messages`).catch(() => []),
    sendMessage: (data) => post("/chat/send", data),
    markRead: (conversationId) => put(`/chat/conversations/${conversationId}/read`),
  },

  payments: {
    getWallet: (userId) => get(`/Users/${userId}`).then(u => u?.wallet || { balance: 0 }),
    getTransactions: (userId) => get(`/interactions/transactions/user/${userId}`).catch(() => []),
    getProjectTransactions: (projectId) => get(`/interactions/transactions/project/${projectId}`).catch(() => []),
    deposit: (userId, amount) => post(`/users/${userId}/deposit`, { amount }),
    withdraw: (userId, amount) => post(`/users/${userId}/withdraw`, { amount }),
    depositEscrow: (data) => post("/interactions/transaction", {
      projectId: data.projectId,
      sourceWalletId: data.sourceWalletId,
      destinationWalletId: null,
      amount: data.amount,
      type: "escrow_deposit"
    }),
    releaseEscrow: (data) => post("/interactions/transaction", {
      projectId: data.projectId,
      sourceWalletId: null,
      destinationWalletId: data.destinationWalletId,
      amount: data.amount,
      type: "escrow_release"
    }),
  },

  notifications: {
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
  },

  proposals: {
    create: (data) => post("/proposals/submit-proposal", data),
    getByJob: (jobPostId) => get(`/proposals/job/${jobPostId}`),
    getByExpert: (expertId) => get(`/proposals/expert/${expertId}`),
    getById: (id) => get(`/proposals/${id}`),
    updateStatus: (id, status) => put(`/proposals/${id}/status?status=${encodeURIComponent(status)}`),
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
