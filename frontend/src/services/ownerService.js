// =============================================================================
// AITasker Owner Service
// =============================================================================
// Owner-only operations (Owner is a higher-level role than Admin).
//
// Permissions exclusive to Owner:
//   - Create Admin accounts
//   - Ban/lock Admin accounts
//   - View Admin user list
//   - View Owner statistics dashboard
//
// Backend endpoints are NOT yet implemented — each function uses an empty
// placeholder URL so the real API can be wired in later.
// =============================================================================

import api from "./api.js";

// ---------------------------------------------------------------------------
// API endpoint placeholders (TODO: update when backend is ready)
// ---------------------------------------------------------------------------

const OWNER_ENDPOINTS = {
  createAdminAccount: "",      // POST — Owner creates an Admin account
  banAdminAccount: "",         // PUT  — Owner locks/bans an Admin
  getAdminUsers: "",           // GET  — list of Admin accounts
  getOwnerDashboardStats: "",  // GET  — aggregate dashboard statistics
  getMonthlyTrafficStats: "",  // GET  — monthly Client/Expert visit data
  getYearlyPostStats: "",      // GET  — total posts per year
  getTotalPaymentStats: "",    // GET  — total money transferred
};

// ---------------------------------------------------------------------------
// createAdminAccount(payload)
// ---------------------------------------------------------------------------

/**
 * Owner creates a new Admin account.
 * If the backend supports passing role through /api/users/register, use that.
 * Otherwise this function uses its own empty endpoint.
 *
 * @param {object} payload — { email, password, fullName }
 * @returns {Promise<object>} created admin user
 */
export async function createAdminAccount(payload) {
  if (!OWNER_ENDPOINTS.createAdminAccount) {
    // TODO: add API endpoint here, or reuse /api/users/register with role=admin
    console.warn("[OwnerService] createAdminAccount — endpoint not configured");
    return { success: true, email: payload.email, role: "admin" };
  }
  return api.post(OWNER_ENDPOINTS.createAdminAccount, {
    ...payload,
    role: "admin",
  });
}

// ---------------------------------------------------------------------------
// banAdminAccount(adminId, payload)
// ---------------------------------------------------------------------------

/**
 * Owner locks/bans an Admin account.
 *
 * @param {string} adminId
 * @param {object} payload — { reason?: string }
 * @returns {Promise<object>}
 */
export async function banAdminAccount(adminId, payload = {}) {
  if (!OWNER_ENDPOINTS.banAdminAccount) {
    // TODO: add API endpoint here — could reuse /api/users/{id}/set-active
    console.warn("[OwnerService] banAdminAccount — endpoint not configured");
    return { success: true, adminId, status: "banned" };
  }
  return api.put(
    OWNER_ENDPOINTS.banAdminAccount.replace("{id}", adminId),
    payload,
  );
}

// ---------------------------------------------------------------------------
// getAdminUsers(params)
// ---------------------------------------------------------------------------

/**
 * Fetch list of Admin accounts.
 *
 * @param {object} params — { search?, status?, page?, limit? }
 * @returns {Promise<object>} { data: User[], total: number }
 */
export async function getAdminUsers(params = {}) {
  if (!OWNER_ENDPOINTS.getAdminUsers) {
    // TODO: add API endpoint here — could filter /api/users?role=admin
    console.warn("[OwnerService] getAdminUsers — endpoint not configured");
    return { data: [], total: 0 };
  }
  return api.get(OWNER_ENDPOINTS.getAdminUsers, { params });
}

// ---------------------------------------------------------------------------
// getOwnerDashboardStats(params)
// ---------------------------------------------------------------------------

/**
 * Fetch aggregate dashboard statistics for Owner.
 *
 * @param {object} params — { period?: "month" | "year" }
 * @returns {Promise<object>} {
 *   totalUsers, totalProjects, totalRevenue, totalDisputes,
 *   activeAdmins, platformGrowth, ...
 * }
 */
export async function getOwnerDashboardStats(params = {}) {
  if (!OWNER_ENDPOINTS.getOwnerDashboardStats) {
    // TODO: add API endpoint here
    console.warn("[OwnerService] getOwnerDashboardStats — endpoint not configured");
    return { totalUsers: 0, totalProjects: 0, totalRevenue: 0, totalDisputes: 0 };
  }
  return api.get(OWNER_ENDPOINTS.getOwnerDashboardStats, { params });
}

// ---------------------------------------------------------------------------
// getMonthlyTrafficStats(params)
// ---------------------------------------------------------------------------

/**
 * Fetch monthly visit data from Clients and Experts for bar chart display.
 *
 * @param {object} params — { year?: number, month?: number }
 * @returns {Promise<object>} {
 *   months: string[],
 *   clientVisits: number[],
 *   expertVisits: number[],
 * }
 */
export async function getMonthlyTrafficStats(params = {}) {
  if (!OWNER_ENDPOINTS.getMonthlyTrafficStats) {
    // TODO: add API endpoint here
    console.warn("[OwnerService] getMonthlyTrafficStats — endpoint not configured");
    return { months: [], clientVisits: [], expertVisits: [] };
  }
  return api.get(OWNER_ENDPOINTS.getMonthlyTrafficStats, { params });
}

// ---------------------------------------------------------------------------
// getYearlyPostStats(params)
// ---------------------------------------------------------------------------

/**
 * Fetch total post/job counts by year for chart display.
 *
 * @param {object} params — { year?: number }
 * @returns {Promise<object>} {
 *   years: number[],
 *   postCounts: number[],
 * }
 */
export async function getYearlyPostStats(params = {}) {
  if (!OWNER_ENDPOINTS.getYearlyPostStats) {
    // TODO: add API endpoint here
    console.warn("[OwnerService] getYearlyPostStats — endpoint not configured");
    return { years: [], postCounts: [] };
  }
  return api.get(OWNER_ENDPOINTS.getYearlyPostStats, { params });
}

// ---------------------------------------------------------------------------
// getTotalPaymentStats(params)
// ---------------------------------------------------------------------------

/**
 * Fetch total money Clients have transferred to Experts for chart display.
 *
 * @param {object} params — { year?: number, month?: number }
 * @returns {Promise<object>} {
 *   labels: string[],
 *   amounts: number[],
 *   totalAmount: number,
 * }
 */
export async function getTotalPaymentStats(params = {}) {
  if (!OWNER_ENDPOINTS.getTotalPaymentStats) {
    // TODO: add API endpoint here
    console.warn("[OwnerService] getTotalPaymentStats — endpoint not configured");
    return { labels: [], amounts: [], totalAmount: 0 };
  }
  return api.get(OWNER_ENDPOINTS.getTotalPaymentStats, { params });
}

// ---------------------------------------------------------------------------
// Named export group
// ---------------------------------------------------------------------------

export const ownerService = {
  createAdminAccount,
  banAdminAccount,
  getAdminUsers,
  getOwnerDashboardStats,
  getMonthlyTrafficStats,
  getYearlyPostStats,
  getTotalPaymentStats,
};

export default ownerService;
