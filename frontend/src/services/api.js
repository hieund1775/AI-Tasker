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
  const init = { method: httpMethod, headers, ...rest };
  if (body !== undefined && body !== null) init.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(url, init);
  } catch (networkError) {
    throw new ApiError(
      "Network error — please check your connection and try again.",
      0,
      networkError,
    );
  }

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    throw new ApiError("Your session has expired. Please log in again.", 401);
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
  auth: {
    login: (email, password) =>
      post("/Auth/login", { email, password }, { authenticated: false }),
    register: (data) => {
      const endpoint =
        data.role === "expert"
          ? "/Auth/register/expert"
          : "/Auth/register/client";
      const payload = {
        email: data.email,
        password: data.password,
        fullName: data.name,
      };
      return post(endpoint, payload, { authenticated: false });
    },
    // API Hoàn thiện Profile
    completeProfile: (data) => post("/Auth/complete-profile", data),
    logout: () => post("/Auth/logout"),
  },

  // ĐÃ SỬA CHUẨN BACKEND CHO NHÓM USERS
  users: {
    getById: (id) => get(`/Users/${id}`),
    list: (params) => {
      const query = buildQuery(params);
      return get(`/Users${query}`);
    },
    getWallet: (id) => get(`/Users/${id}/wallet`),
    getJobPosts: (id) => get(`/Users/${id}/job-posts`),
    getProposals: (id) => get(`/Users/${id}/proposals`),
    getClientProjects: (id) => get(`/Users/${id}/client-projects`),
    getExpertProjects: (id) => get(`/Users/${id}/expert-projects`),
  },

  // ĐÃ SỬA LẠI ĐỂ GỌI SANG ĐƯỜNG DẪN /Users THAY VÌ /experts
  experts: {
    // API Check Profile
    checkProfile: () => get("/Users/test-expert-profile"),

    // Lấy thông tin profile của chuyên gia
    getProfile: (id) => get(`/Users/${id}/expert-profile`),

    // Lấy danh sách chuyên gia cũng sẽ gọi xuống Users (kèm filter nếu BE yêu cầu)
    list: (params) => {
      const query = buildQuery(params);
      return get(`/Users${query}`);
    },
  },

  projects: {
    create: (data) => post("/projects", data),
    list: (params) => {
      const query = buildQuery(params);
      return get(`/projects${query}`);
    },
    getMine: () => get("/projects/my"),
    getById: (id) => get(`/projects/${id}`),
    update: (id, data) => put(`/projects/${id}`, data),
    delete: (id) => del(`/projects/${id}`),
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
