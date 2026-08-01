// =============================================================================
// AITasker Category-Tag Service
// =============================================================================
// Wraps the existing /api/category-tags endpoints for managing skills and
// categories. Used by Admin/Owner management pages.
//
// Endpoints consumed:
//   GET    /category-tags              - list all (skills + categories)
//   GET    /category-tags/skills       - list all skills
//   POST   /category-tags/skills       - create a skill
//   DELETE /category-tags/skills/{id}  - delete a skill
//   GET    /category-tags/categories   - list all categories
//   POST   /category-tags/categories   - create a category
//   DELETE /category-tags/categories/{id} - delete a category
// =============================================================================

import api from "./api.js";

const BASE = "/category-tags";

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/**
 * Fetch all skills.
 * @returns {Promise<Array<{id, name}>>}
 */
export async function getSkills() {
  const result = await api.get(`${BASE}/skills`);
  // Normalize - backend may return array directly or { data: [...] }
  return Array.isArray(result) ? result : result?.data ?? [];
}

/**
 * Create a new skill.
 * @param {object} payload - { name: string }
 * @returns {Promise<{id, name}>}
 */
export async function createSkill(payload) {
  return api.post(`${BASE}/skills`, payload);
}

/**
 * Delete a skill by ID.
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function deleteSkill(id) {
  return api.del(`${BASE}/skills/${id}`);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * Fetch all categories.
 * @returns {Promise<Array<{id, name}>>}
 */
export async function getCategories() {
  const result = await api.get(`${BASE}/categories`);
  return Array.isArray(result) ? result : result?.data ?? [];
}

/**
 * Create a new category.
 * @param {object} payload - { name: string }
 * @returns {Promise<{id, name}>}
 */
export async function createCategory(payload) {
  return api.post(`${BASE}/categories`, payload);
}

/**
 * Delete a category by ID.
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function deleteCategory(id) {
  return api.del(`${BASE}/categories/${id}`);
}

// ---------------------------------------------------------------------------
// Specializations
// ---------------------------------------------------------------------------

/**
 * Fetch all specializations.
 * @returns {Promise<Array>}
 */
export async function getSpecializations() {
  const result = await api.get(`${BASE}/specializations`);
  return Array.isArray(result) ? result : result?.data ?? [];
}

/**
 * Fetch categories enriched with their specializations.
 * Backend now serves specializations via a dedicated endpoint keyed by domainId,
 * so we group them back onto each category to keep legacy call sites working.
 * @returns {Promise<Array<{id, name, specializations: Array}>>}
 */
export async function getCategoriesWithSpecializations() {
  const [cats, specs] = await Promise.all([getCategories(), getSpecializations()]);
  return (cats || []).map((cat) => ({
    ...cat,
    specializations: (specs || []).filter(
      (s) => s.domainId === cat.id || s.domainName === cat.name
    ),
  }));
}

/**
 * Create a new specialization.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function createSpecialization(payload) {
  return api.post(`${BASE}/specializations`, payload);
}

/**
 * Delete a specialization by ID.
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function deleteSpecialization(id) {
  return api.del(`${BASE}/specializations/${id}`);
}

// ---------------------------------------------------------------------------
// Named export group
// ---------------------------------------------------------------------------

export const categoryTagService = {
  getSkills,
  createSkill,
  deleteSkill,
  getCategories,
  createCategory,
  deleteCategory,
  getSpecializations,
  getCategoriesWithSpecializations,
  createSpecialization,
  deleteSpecialization,
};

export default categoryTagService;
