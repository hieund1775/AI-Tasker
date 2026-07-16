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
  createAdminAccount: "/Admin/owner/create-staff",
  banAdminAccount: "/Admin/owner/ban-staff/{id}",
  getAdminUsers: "/users",
  getOwnerDashboardStats: "/Admin/owner/system-dashboard",
  getMonthlyTrafficStats: "/Admin/owner/system-dashboard", // Fallback mapping
  getYearlyPostStats: "/Admin/owner/system-dashboard", // Fallback mapping
  getTotalPaymentStats: "/Admin/owner/system-dashboard", // Fallback mapping
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
  return api.post(OWNER_ENDPOINTS.createAdminAccount, {
    Username: payload.username,
    Password: payload.password,
    FullName: payload.fullName,
    PhoneNumber: payload.phoneNumber
  });
}

export async function banAdminAccount(adminId, payload = {}) {
  return api.put(
    OWNER_ENDPOINTS.banAdminAccount.replace("{id}", adminId),
    payload,
  );
}

export async function getAdminUsers(params = {}) {
  return api.get(OWNER_ENDPOINTS.getAdminUsers, { params: { ...params, role: 'admin' } });
}

export async function getOwnerDashboardStats(params = {}) {
  return api.get(OWNER_ENDPOINTS.getOwnerDashboardStats, { params });
}

export async function getMonthlyTrafficStats(params = {}) {
  return api.get(OWNER_ENDPOINTS.getMonthlyTrafficStats, { params })
    .then(res => res?.monthlyTraffic || { months: [], clientVisits: [], expertVisits: [] })
    .catch(() => ({ months: [], clientVisits: [], expertVisits: [] }));
}

export async function getYearlyPostStats(params = {}) {
  return api.get(OWNER_ENDPOINTS.getYearlyPostStats, { params })
    .then(res => res?.yearlyPosts || { years: [], postCounts: [] })
    .catch(() => ({ years: [], postCounts: [] }));
}

export async function getTotalPaymentStats(params = {}) {
  return api.get(OWNER_ENDPOINTS.getTotalPaymentStats, { params })
    .then(res => res?.paymentStats || { labels: [], amounts: [], totalAmount: 0 })
    .catch(() => ({ labels: [], amounts: [], totalAmount: 0 }));
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
