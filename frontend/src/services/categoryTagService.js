// =============================================================================
// AITasker Category-Tag Service
// =============================================================================
// Wraps the existing /api/category-tags endpoints for managing skills and
// categories. Used by Admin/Owner management pages.
//
// Endpoints consumed:
//   GET    /category-tags              — list all (skills + categories)
//   GET    /category-tags/skills       — list all skills
//   POST   /category-tags/skills       — create a skill
//   DELETE /category-tags/skills/{id}  — delete a skill
//   GET    /category-tags/categories   — list all categories
//   POST   /category-tags/categories   — create a category
//   DELETE /category-tags/categories/{id} — delete a category
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
  // Normalize — backend may return array directly or { data: [...] }
  return Array.isArray(result) ? result : result?.data ?? [];
}

/**
 * Create a new skill.
 * @param {object} payload — { name: string }
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
 * @param {object} payload — { name: string }
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
// Named export group
// ---------------------------------------------------------------------------

export const categoryTagService = {
  getSkills,
  createSkill,
  deleteSkill,
  getCategories,
  createCategory,
  deleteCategory,
};

export default categoryTagService;
