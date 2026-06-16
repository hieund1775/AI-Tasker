import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router";
import {
  Search,
  DollarSign,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { categoryTagService } from "../../../services/categoryTagService.js";
import { timeAgo } from "../../lib/dateUtils.js";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBudget(amount) {
  if (amount == null) return "—";
  const n = Number(amount);
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

/** Map sortBy UI value to server sortBy + sortOrder params */
function getSortParams(sortBy) {
  switch (sortBy) {
    case "budget_high":
      return { sortBy: "budget", sortOrder: "desc" };
    case "budget_low":
      return { sortBy: "budget", sortOrder: "asc" };
    case "deadline":
      return { sortBy: "deadline", sortOrder: "asc" };
    default:
      return { sortBy: "createdAt", sortOrder: "desc" };
  }
}

// ---------------------------------------------------------------------------
// Job card component
// ---------------------------------------------------------------------------

function JobCard({ job, viewMode }) {
  const categoryName = job.aiCategoryDomain?.name || job.category || job.categoryName;
  const skills = job.jobPostSkills?.map((s) => s.skill?.name) || job.requiredSkills || job.skills || [];

  if (viewMode === "grid") {
    return (
      <Link
        to={`/expert/jobs/${job.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-purple-200 transition-all group"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-gray-900 text-[15px] leading-snug line-clamp-2 group-hover:text-blue-900 transition-colors">
            {job.title}
          </h3>
          {categoryName && (
            <span className="flex-shrink-0 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-medium">
              {categoryName}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4 line-clamp-3 leading-relaxed">
          {job.description}
        </p>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.slice(0, 4).map((s, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium"
              >
                {typeof s === "string" ? s : s}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="px-2 py-0.5 text-gray-400 text-[11px]">
                +{skills.length - 4}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="font-semibold text-gray-900">
              {formatBudget(job.budget)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {job.deadline || job.durationValue || 0}d
            </span>
          </div>
          <span className="text-[11px] text-gray-400">{timeAgo(job.createdAt)}</span>
        </div>
      </Link>
    );
  }

  // List view
  return (
    <Link
      to={`/expert/jobs/${job.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-900 transition-colors">
              {job.title}
            </h3>
            {categoryName && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-medium">
                {categoryName}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{job.description}</p>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="font-semibold text-gray-900">
              {formatBudget(job.budget)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {job.deadline || job.durationValue || 0} {job.durationUnit || "days"}
            </span>
            <span className="text-xs text-gray-400">{timeAgo(job.createdAt)}</span>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function JobListSkeleton({ viewMode }) {
  const cols = viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3";
  const cards = Array.from({ length: 6 });
  return (
    <div className={cols}>
      {cards.map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <LoadingSkeleton className="h-5 w-2/3 mb-3" />
          <LoadingSkeleton className="h-4 w-full mb-2" />
          <LoadingSkeleton className="h-4 w-3/4 mb-4" />
          <div className="flex gap-2 mb-4">
            <LoadingSkeleton className="h-5 w-16 rounded-md" />
            <LoadingSkeleton className="h-5 w-20 rounded-md" />
            <LoadingSkeleton className="h-5 w-14 rounded-md" />
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-100">
            <LoadingSkeleton className="h-4 w-20" />
            <LoadingSkeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function JobList() {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [filters, setFilters] = useState({
    category: "",
    minBudget: 0,
    maxBudget: 0,
    skill: "",
    sortBy: "newest",
  });

  const [jobs, setJobs] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load filter options (categories, skills, counts) — once on mount
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [catsRes, skillsRes, countsRes] = await Promise.all([
          categoryTagService.getCategories(),
          categoryTagService.getSkills(),
          api.get("/category-tags/categories/with-counts", { authenticated: false }).catch(() => []),
        ]);
        setAllCategories(Array.isArray(catsRes) ? catsRes : []);
        setAllSkills(Array.isArray(skillsRes) ? skillsRes : []);
        setCategoryCounts(Array.isArray(countsRes) ? countsRes : []);
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    }
    loadFilterOptions();
  }, []);

  // Fetch jobs from server-side search API whenever filters/page change
  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);

        const { sortBy, sortOrder } = getSortParams(filters.sortBy);

        const params = {
          page,
          pageSize,
          sortBy,
          sortOrder,
        };
        if (debouncedSearch) params.searchTerm = debouncedSearch;
        if (filters.category) params.categoryId = filters.category;
        if (filters.skill) params.skillId = filters.skill;
        if (filters.minBudget > 0) params.minBudget = filters.minBudget;
        if (filters.maxBudget > 0) params.maxBudget = filters.maxBudget;

        const result = await api.get("/jobposts/search", {
          authenticated: false,
          params,
        });

        if (result && result.items) {
          // Map server response to format compatible with JobCard
          const mapped = result.items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            budget: item.budget,
            deadline: item.deadline,
            status: item.status,
            createdAt: item.createdAt,
            client: item.clientName,
            category: item.categoryName,
            categoryName: item.categoryName,
            clientName: item.clientName,
            jobPostSkills: (item.skills || []).map((s) => ({
              skill: { name: typeof s === "string" ? s : s },
            })),
            skills: item.skills || [],
          }));
          setJobs(mapped);
          setTotalCount(result.totalCount ?? mapped.length);
          setTotalPages(result.totalPages ?? 1);
        } else {
          setJobs([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } catch (err) {
        console.error("Failed to search jobs:", err);
        // Fallback: load all jobs and filter client-side
        try {
          const allJobs = await api.jobPosts.list();
          setJobs(Array.isArray(allJobs) ? allJobs : []);
          setTotalCount(Array.isArray(allJobs) ? allJobs.length : 0);
          setTotalPages(1);
        } catch {
          setJobs([]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [debouncedSearch, filters.category, filters.skill, filters.minBudget, filters.maxBudget, filters.sortBy, page]);

  // Reset to page 1 when filters change
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      category: "",
      minBudget: 0,
      maxBudget: 0,
      skill: "",
      sortBy: "newest",
    });
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
  }, []);

  const hasActiveFilters =
    filters.category ||
    filters.minBudget > 0 ||
    filters.maxBudget > 0 ||
    filters.skill ||
    debouncedSearch;

  // ── Quick-filter pills: use server-side category counts when available ──
  const topCategories = useMemo(() => {
    if (categoryCounts.length > 0) {
      return categoryCounts
        .filter((c) => c.jobCount > 0)
        .sort((a, b) => b.jobCount - a.jobCount)
        .slice(0, 6)
        .map((c) => ({ name: c.name, count: c.jobCount }));
    }
    return [];
  }, [categoryCounts]);

  const displayCount = totalCount > 0 ? totalCount : jobs.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Browse Jobs</h1>
        <p className="text-gray-500">
          {loading
            ? "Loading available projects..."
            : `${displayCount} ${displayCount === 1 ? "job" : "jobs"} available`}
        </p>
      </div>

      {/* ── Incomplete profile warning ── */}
      {user?.role === "expert" && user?.hasProfile === false && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-amber-800 text-sm font-medium">
            Complete your expert profile to start submitting proposals.
          </p>
          <Link
            to="/expert/profile/edit"
            className="whitespace-nowrap px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition shadow-sm"
          >
            Create Profile
          </Link>
        </div>
      )}

      {/* ── Search + Controls row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by title or description..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 border rounded-xl inline-flex items-center gap-2 text-sm font-medium transition ${
            showFilters || hasActiveFilters
              ? "border-blue-900 bg-blue-50 text-blue-900"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
        </button>

        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter("sortBy", e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-900 text-sm bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="budget_high">Budget: High to Low</option>
          <option value="budget_low">Budget: Low to High</option>
          <option value="deadline">Deadline: Soonest</option>
        </select>

        {/* View toggle */}
        <div className="flex border border-gray-300 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 ${viewMode === "list" ? "bg-blue-50 text-blue-900" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 ${viewMode === "grid" ? "bg-blue-50 text-blue-900" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Quick category pills ── */}
      {!loading && topCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-gray-400" />
          {topCategories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => {
                const matchingCategory = allCategories.find((c) => c.name === cat.name);
                if (matchingCategory) {
                  updateFilter("category", filters.category === matchingCategory.id ? "" : matchingCategory.id);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.category && allCategories.find((c) => c.id === filters.category)?.name === cat.name
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      )}

      {/* ── Active filter chips ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filters.category && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              {allCategories.find((c) => c.id === filters.category)?.name || filters.category}
              <button onClick={() => updateFilter("category", "")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.skill && (
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              {allSkills.find((s) => s.id === filters.skill)?.name || filters.skill}
              <button onClick={() => updateFilter("skill", "")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.minBudget > 0 && (
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              Min ${filters.minBudget}
              <button onClick={() => updateFilter("minBudget", 0)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.maxBudget > 0 && (
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              Max ${filters.maxBudget}
              <button onClick={() => updateFilter("maxBudget", 0)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-gray-400 hover:text-gray-600 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter("category", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm bg-white"
              >
                <option value="">All categories</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Min Budget
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={filters.minBudget || ""}
                onChange={(e) =>
                  updateFilter("minBudget", e.target.value === "" ? 0 : Number(e.target.value))
                }
                placeholder="Any"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Max Budget
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={filters.maxBudget || ""}
                onChange={(e) =>
                  updateFilter("maxBudget", e.target.value === "" ? 0 : Number(e.target.value))
                }
                placeholder="Any"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Required Skill
              </label>
              <select
                value={filters.skill}
                onChange={(e) => updateFilter("skill", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm bg-white"
              >
                <option value="">Any skill</option>
                {allSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <JobListSkeleton viewMode={viewMode} />
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <Search className="w-14 h-14 text-gray-200 mx-auto mb-5" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">No jobs found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            {hasActiveFilters
              ? "Try adjusting your search terms or clearing filters."
              : "No open positions are currently available. Check back soon for new opportunities."}
          </p>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} viewMode="grid" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} viewMode="list" />
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-500 px-4">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
