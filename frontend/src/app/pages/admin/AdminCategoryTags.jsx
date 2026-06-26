// =============================================================================
// AdminCategoryTags — Skills & Categories management page for Admin/Owner.
//
// Uses existing /api/category-tags endpoints. Admin/Owner can:
//   - View skills list with search
//   - Add new skill
//   - Delete skill (with confirmation)
//   - View categories list with search
//   - Add new category
//   - Delete category (with confirmation)
//
// Tabs: Skills | Categories
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Tag, FolderTree } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import {
  getSkills,
  createSkill,
  deleteSkill,
  getCategories,
  createCategory,
  deleteCategory,
} from "../../../services/categoryTagService.js";

// ---------------------------------------------------------------------------
// Error message helper — maps HTTP status codes to user-friendly messages
// ---------------------------------------------------------------------------

function errorMessage(err, action) {
  const status = err?.status;
  const detail = err?.message || "An unexpected error occurred.";

  switch (status) {
    case 400:
      return `Invalid request — ${detail}`;
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The item was not found. It may have already been deleted.";
    case 500:
      return "Server error — please try again later.";
    default:
      return `${action} failed: ${detail}`;
  }
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = [
  { key: "skills", label: "Skills", icon: Tag },
  { key: "categories", label: "Categories", icon: FolderTree },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminCategoryTags() {
  const [activeTab, setActiveTab] = useState("skills");

  // ----- Skills state -----
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);

  // ----- Categories state -----
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  // ----- Shared state -----
  const [feedback, setFeedback] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { type, id, name }
  const [deleting, setDeleting] = useState(false);

  // -----------------------------------------------------------------------
  // Toast helper — success variant (green)
  // -----------------------------------------------------------------------
  const showSuccess = useCallback((msg) => {
    setFeedback({ text: msg, type: "success" });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  // -----------------------------------------------------------------------
  // Toast helper — error variant (red)
  // -----------------------------------------------------------------------
  const showError = useCallback((msg) => {
    setFeedback({ text: msg, type: "error" });
    setTimeout(() => setFeedback(null), 6000);
  }, []);

  // -----------------------------------------------------------------------
  // Fetch skills
  // -----------------------------------------------------------------------
  const fetchSkills = useCallback(async () => {
    setSkillsLoading(true);
    setSkillsError(null);
    try {
      const data = await getSkills();
      setSkills(data);
    } catch (err) {
      setSkillsError(errorMessage(err, "Load skills"));
      setSkills([]);
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // -----------------------------------------------------------------------
  // Fetch categories
  // -----------------------------------------------------------------------
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setCategoriesError(errorMessage(err, "Load categories"));
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // -----------------------------------------------------------------------
  // Add skill
  // -----------------------------------------------------------------------
  const handleAddSkill = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = newSkillName.trim();
      if (!trimmed) return;

      setAddingSkill(true);
      try {
        await createSkill({ name: trimmed });
        setNewSkillName("");
        showSuccess(`Skill "${trimmed}" has been added.`);
        await fetchSkills();
      } catch (err) {
        showError(errorMessage(err, "Add skill"));
      } finally {
        setAddingSkill(false);
      }
    },
    [newSkillName, fetchSkills, showSuccess, showError],
  );

  // -----------------------------------------------------------------------
  // Add category
  // -----------------------------------------------------------------------
  const handleAddCategory = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = newCategoryName.trim();
      if (!trimmed) return;

      setAddingCategory(true);
      try {
        await createCategory({ name: trimmed });
        setNewCategoryName("");
        showSuccess(`Category "${trimmed}" has been added.`);
        await fetchCategories();
      } catch (err) {
        showError(errorMessage(err, "Add category"));
      } finally {
        setAddingCategory(false);
      }
    },
    [newCategoryName, fetchCategories, showSuccess, showError],
  );

  // -----------------------------------------------------------------------
  // Delete handler
  // -----------------------------------------------------------------------
  const handleDelete = useCallback(async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      if (deleteModal.type === "skill") {
        await deleteSkill(deleteModal.id);
        showSuccess(`Skill "${deleteModal.name}" has been deleted.`);
        await fetchSkills();
      } else {
        await deleteCategory(deleteModal.id);
        showSuccess(`Category "${deleteModal.name}" has been deleted.`);
        await fetchCategories();
      }
    } catch (err) {
      showError(errorMessage(err, "Delete"));
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  }, [deleteModal, fetchSkills, fetchCategories, showSuccess, showError]);

  // -----------------------------------------------------------------------
  // Filter helpers
  // -----------------------------------------------------------------------
  const filteredSkills = skills.filter((s) => {
    const name = (s.name || "").toLowerCase();
    return name.includes(skillSearch.toLowerCase());
  });

  const filteredCategories = categories.filter((c) => {
    const name = (c.name || "").toLowerCase();
    return name.includes(categorySearch.toLowerCase());
  });

  // -----------------------------------------------------------------------
  // Table columns
  // -----------------------------------------------------------------------
  const skillColumns = [
    {
      key: "name",
      label: "Skill Name",
      render: (val) => (
        <span className="text-sm font-medium text-gray-900">{val || "—"}</span>
      ),
    },
  ];

  const categoryColumns = [
    {
      key: "name",
      label: "Category Name",
      render: (val) => (
        <span className="text-sm font-medium text-gray-900">{val || "—"}</span>
      ),
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const isSkills = activeTab === "skills";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/admin/dashboard" className="mb-4">
        Back to Dashboard
      </BackButton>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Skills &amp; Categories
      </h1>
      <p className="text-gray-600 mb-6">
        Manage platform skills and category tags used in projects and expert
        profiles.
      </p>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`mb-4 p-3 border rounded-lg text-sm ${
            feedback.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* SKILLS TAB                                                        */}
      {/* ================================================================= */}
      {isSkills && (
        <div className="space-y-4">
          {/* Error banner */}
          {skillsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {skillsError}
            </div>
          )}

          {/* Search + Add */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search skills..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm"
              />
            </div>
          </div>

          {/* Add skill form */}
          <form
            onSubmit={handleAddSkill}
            className="flex gap-2 items-end max-w-lg"
          >
            <div className="flex-1">
              <label
                htmlFor="new-skill-name"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                New Skill Name
              </label>
              <input
                id="new-skill-name"
                type="text"
                placeholder="e.g. React, Python, UI Design"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                disabled={addingSkill}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={addingSkill || !newSkillName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingSkill ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Skill
                </>
              )}
            </button>
          </form>

          {/* Skills table */}
          <DataTable
            columns={skillColumns}
            data={filteredSkills}
            loading={skillsLoading}
            emptyMessage="No skills found."
            actions={(row) => (
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    type: "skill",
                    id: row.id,
                    name: row.name,
                  })
                }
                disabled={deleting}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* CATEGORIES TAB                                                    */}
      {/* ================================================================= */}
      {!isSkills && (
        <div className="space-y-4">
          {/* Error banner */}
          {categoriesError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {categoriesError}
            </div>
          )}

          {/* Search + Add */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm"
              />
            </div>
          </div>

          {/* Add category form */}
          <form
            onSubmit={handleAddCategory}
            className="flex gap-2 items-end max-w-lg"
          >
            <div className="flex-1">
              <label
                htmlFor="new-category-name"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                New Category Name
              </label>
              <input
                id="new-category-name"
                type="text"
                placeholder="e.g. Web Development, Design, Marketing"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={addingCategory}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={addingCategory || !newCategoryName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingCategory ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Category
                </>
              )}
            </button>
          </form>

          {/* Categories table */}
          <DataTable
            columns={categoryColumns}
            data={filteredCategories}
            loading={categoriesLoading}
            emptyMessage="No categories found."
            actions={(row) => (
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    type: "category",
                    id: row.id,
                    name: row.name,
                  })
                }
                disabled={deleting}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                         */}
      {/* ================================================================= */}
      <ConfirmationModal
        open={deleteModal !== null}
        onOpenChange={(open) => !open && !deleting && setDeleteModal(null)}
        title={`Delete ${deleteModal?.type === "skill" ? "Skill" : "Category"}`}
        description={`Are you sure you want to delete "${deleteModal?.name}"? This action cannot be undone. Any projects or profiles using this ${deleteModal?.type || "item"} may be affected.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export default AdminCategoryTags;
