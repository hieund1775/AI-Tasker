// =============================================================================
// AdminCategoryTags - Skills & Categories management page for Admin/Owner.
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
import { Search, Plus, Trash2, Tag, FolderTree, Briefcase } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { ConfirmationModal } from "../../components/shared/ConfirmationModal.jsx";
import {
  getSkills,
  createSkill,
  deleteSkill,
  getCategories,
  createCategory,
  deleteCategory,
  getSpecializations,
  createSpecialization,
  deleteSpecialization,
} from "../../../services/categoryTagService.js";

// ---------------------------------------------------------------------------
// Error message helper - maps HTTP status codes to user-friendly messages
// ---------------------------------------------------------------------------

function errorMessage(err, action) {
  const status = err?.status;
  const detail = err?.message || "An unexpected error occurred.";

  switch (status) {
    case 400:
      return `Invalid request - ${detail}`;
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The item was not found. It may have already been deleted.";
    case 500:
      return "Server error - please try again later.";
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
  { key: "specializations", label: "Specializations", icon: Briefcase },
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

  // ----- Specializations state -----
  const [specializations, setSpecializations] = useState([]);
  const [specializationsLoading, setSpecializationsLoading] = useState(true);
  const [specializationsError, setSpecializationsError] = useState(null);
  const [specializationSearch, setSpecializationSearch] = useState("");
  const [newSpecializationName, setNewSpecializationName] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [addingSpecialization, setAddingSpecialization] = useState(false);

  // ----- Shared state -----
  const [feedback, setFeedback] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { type, id, name }
  const [deleting, setDeleting] = useState(false);

  // -----------------------------------------------------------------------
  // Toast helper - success variant (green)
  // -----------------------------------------------------------------------
  const showSuccess = useCallback((msg) => {
    setFeedback({ text: msg, type: "success" });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  // -----------------------------------------------------------------------
  // Toast helper - error variant (red)
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
  // Fetch specializations
  // -----------------------------------------------------------------------
  const fetchSpecializations = useCallback(async () => {
    setSpecializationsLoading(true);
    setSpecializationsError(null);
    try {
      const data = await getSpecializations();
      setSpecializations(data);
    } catch (err) {
      setSpecializationsError(errorMessage(err, "Load specializations"));
      setSpecializations([]);
    } finally {
      setSpecializationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecializations();
  }, [fetchSpecializations]);

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
  // Add specialization
  // -----------------------------------------------------------------------
  const handleAddSpecialization = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = newSpecializationName.trim();
      if (!trimmed || !selectedDomainId) return;

      setAddingSpecialization(true);
      try {
        await createSpecialization({ name: trimmed, domainId: selectedDomainId });
        setNewSpecializationName("");
        showSuccess(`Specialization "${trimmed}" has been added.`);
        await fetchSpecializations();
      } catch (err) {
        showError(errorMessage(err, "Add specialization"));
      } finally {
        setAddingSpecialization(false);
      }
    },
    [newSpecializationName, selectedDomainId, fetchSpecializations, showSuccess, showError],
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
      } else if (deleteModal.type === "category") {
        await deleteCategory(deleteModal.id);
        showSuccess(`Category "${deleteModal.name}" has been deleted.`);
        await fetchCategories();
        await fetchSpecializations();
      } else if (deleteModal.type === "specialization") {
        await deleteSpecialization(deleteModal.id);
        showSuccess(`Specialization "${deleteModal.name}" has been deleted.`);
        await fetchSpecializations();
      }
    } catch (err) {
      showError(errorMessage(err, "Delete"));
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  }, [deleteModal, fetchSkills, fetchCategories, fetchSpecializations, showSuccess, showError]);

  const renderDeleteAction = useCallback(
    (type, label) => (row) => {
      const id = row.id ?? row.Id;
      const name = row.name ?? row.Name ?? label;
      return (
        <button
          type="button"
          onClick={() => setDeleteModal({ type, id, name })}
          disabled={!id}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive-light px-2.5 text-xs font-semibold text-destructive transition-colors hover:border-destructive/40 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          title={`Delete ${label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      );
    },
    [],
  );

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

  const filteredSpecializations = specializations.filter((s) => {
    const name = (s.name || "").toLowerCase();
    return name.includes(specializationSearch.toLowerCase());
  });

  // -----------------------------------------------------------------------
  // Table columns
  // -----------------------------------------------------------------------
  const skillColumns = [
    {
      key: "name",
      label: "Skill Name",
      render: (val) => (
        <span className="text-sm font-medium text-foreground">{val || "-"}</span>
      ),
    },
  ];

  const categoryColumns = [
    {
      key: "name",
      label: "Category Name",
      render: (val) => (
        <span className="text-sm font-medium text-foreground">{val || "-"}</span>
      ),
    },
  ];

  const specializationColumns = [
    {
      key: "name",
      label: "Specialization Name",
      render: (val) => (
        <span className="text-sm font-medium text-foreground">{val || "-"}</span>
      ),
    },
    {
      key: "domainName",
      label: "Category (Domain)",
      render: (val) => (
        <span className="text-sm text-muted-foreground">{val || "-"}</span>
      ),
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const isSkills = activeTab === "skills";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills & Categories"
        subtitle="Manage platform skills and category tags used in projects and expert profiles."
        illustration={<Tag className="h-28 w-28" />}
      />

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`p-3 border rounded-lg text-sm ${
            feedback.type === "error"
              ? "bg-destructive-light border-destructive/20 text-destructive"
              : "bg-success-light border-success/20 text-success"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = tab.key === "skills" ? skills.length : tab.key === "categories" ? categories.length : specializations.length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isActive ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
              }`}>
                {count}
              </span>
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
            <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
              {skillsError}
            </div>
          )}

          {/* Search + Add */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input
                type="text"
                placeholder="Search skills..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border border-border rounded-lg bg-card focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 text-sm placeholder:text-muted-foreground/40"
              />
              {skillSearch && (
                <button
                  type="button"
                  onClick={() => setSkillSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary text-muted-foreground"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Add skill form */}
          <form
            onSubmit={handleAddSkill}
            className="page-filter-toolbar max-w-lg"
          >
            <div className="flex-1">
              <label
                htmlFor="new-skill-name"
                className="block text-xs font-medium text-muted-foreground mb-1"
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
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-card focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/40"
              />
            </div>
            <button
              type="submit"
              disabled={addingSkill || !newSkillName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-brand-primary-foreground rounded-lg text-sm font-medium hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingSkill ? "Adding..." : "+ Add Skill"}
            </button>
          </form>

          {/* Skills table */}
          <DataTable
            columns={skillColumns}
            data={filteredSkills}
            loading={skillsLoading}
            emptyMessage="No skills found."
            actions={renderDeleteAction("skill", "skill")}
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* CATEGORIES TAB                                                    */}
      {/* ================================================================= */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          {/* Error banner */}
          {categoriesError && (
            <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
              {categoriesError}
            </div>
          )}

          {/* Search + Add */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border border-border rounded-lg bg-card focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 text-sm placeholder:text-muted-foreground/40"
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary text-muted-foreground"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Add category form */}
          <form
            onSubmit={handleAddCategory}
            className="page-filter-toolbar max-w-lg"
          >
            <div className="flex-1">
              <label
                htmlFor="new-category-name"
                className="block text-xs font-medium text-muted-foreground mb-1"
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
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-card focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/40"
              />
            </div>
            <button
              type="submit"
              disabled={addingCategory || !newCategoryName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-brand-primary-foreground rounded-lg text-sm font-medium hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingCategory ? "Adding..." : "+ Add Category"}
            </button>
          </form>

          {/* Categories table */}
          <DataTable
            columns={categoryColumns}
            data={filteredCategories}
            loading={categoriesLoading}
            emptyMessage="No categories found."
            actions={renderDeleteAction("category", "category")}
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* SPECIALIZATIONS TAB                                               */}
      {/* ================================================================= */}
      {activeTab === "specializations" && (
        <div className="space-y-4">
          {/* Error banner */}
          {specializationsError && (
            <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
              {specializationsError}
            </div>
          )}

          {/* Search + Add */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search specializations..."
                value={specializationSearch}
                onChange={(e) => setSpecializationSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border border-border rounded-lg bg-card focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 text-sm placeholder:text-muted-foreground/40"
              />
              {specializationSearch && (
                <button
                  type="button"
                  onClick={() => setSpecializationSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary text-muted-foreground"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Add specialization form */}
          <form
            onSubmit={handleAddSpecialization}
            className="page-filter-toolbar max-w-2xl"
          >
            <div className="flex-1">
              <label
                htmlFor="new-specialization-name"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                New Specialization Name
              </label>
              <input
                id="new-specialization-name"
                type="text"
                placeholder="e.g. Frontend Development, Data Analysis"
                value={newSpecializationName}
                onChange={(e) => setNewSpecializationName(e.target.value)}
                disabled={addingSpecialization}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-card focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="domain-select"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Category (Domain)
              </label>
              <select
                id="domain-select"
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                disabled={addingSpecialization}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-card focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={addingSpecialization || !newSpecializationName.trim() || !selectedDomainId}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-brand-primary-foreground rounded-lg text-sm font-medium hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingSpecialization ? "Adding..." : "+ Add"}
            </button>
          </form>

          {/* Specializations table */}
          <DataTable
            columns={specializationColumns}
            data={filteredSpecializations}
            loading={specializationsLoading}
            emptyMessage="No specializations found."
            actions={renderDeleteAction("specialization", "specialization")}
          />
        </div>
      )}

      <ConfirmationModal
        open={Boolean(deleteModal)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteModal(null);
        }}
        title={`Delete ${deleteModal?.type || "item"}`}
        description={`Are you sure you want to delete "${deleteModal?.name || "this item"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </div>
  );
}

export default AdminCategoryTags;
