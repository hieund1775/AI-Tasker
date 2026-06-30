import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Search,
  ReceiptText,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  X,
  FolderOpen,
  Calendar,
  User,
  Zap,
  Sparkles,
  Target,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { categoryTagService } from "../../../services/categoryTagService.js";
import { safeNumberFormat } from "../../lib/safety.js";

/**
 * Job Card — renders a scannable job listing card for the expert job board.
 */
function ProjectCard({ job }) {
  const clientName = job.client || "Anonymous Client";
  const categoryName = job.aiCategoryDomain?.name || job.category || "Uncategorized";
  const specializationName = job.specialization || "General";
  const skills = job.requiredSkills || job.jobPostSkills?.map(s => s.skill?.name) || [];

  const formatDeadline = (deadline, createdAt) => {
    if (!deadline) return "N/A";
    const d = new Date(deadline);
    if (!Number.isNaN(d.getTime()) && typeof deadline === "string" && deadline.includes("-")) {
      return d.toLocaleDateString("vi-VN");
    }
    const days = Number(deadline);
    if (!Number.isNaN(days) && createdAt) {
      const created = new Date(createdAt);
      if (Number.isNaN(created.getTime())) return `${deadline} days`;
      created.setDate(created.getDate() + days);
      return created.toLocaleDateString("vi-VN");
    }
    return `${deadline} days`;
  };

  const formatPostedDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("vi-VN");
  };

  const daysAgo = (() => {
    if (!job.createdAt) return null;
    const created = new Date(job.createdAt);
    if (Number.isNaN(created.getTime())) return null;
    const diff = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return null;
  })();

  const getBudgetFormatted = () => {
    if (!job.budget) return "N/A";
    try {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(job.budget));
    } catch {
      return String(job.budget);
    }
  };

  // Match score — simulated from skills count vs total skills
  const skillCount = skills.length;
  const matchScore = skillCount > 0 ? Math.min(95, 55 + skillCount * 8) : 60;

  return (
    <Link
      to={`/expert/jobs/${job.id}`}
      className="group block bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] via-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative p-6 flex flex-col gap-4">
        {/* Row 1: Title + Match Score + Category Badges */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {/* Match score pill */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                matchScore >= 80 ? "bg-success/10 text-success border border-success/20" :
                matchScore >= 65 ? "bg-accent/10 text-accent border border-accent/20" :
                "bg-muted text-muted-foreground border border-border"
              }`}>
                <Target className="w-3 h-3" />
                {matchScore}% Match
              </span>
              {daysAgo && (
                <span className="text-[11px] text-muted-foreground font-medium">
                  {daysAgo}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-lg group-hover:text-accent transition-colors leading-snug">
              {job.title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/6 text-primary text-sm font-semibold rounded-full border border-primary/15">
              <FolderOpen className="w-3.5 h-3.5" />
              {categoryName}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/6 text-accent text-sm font-semibold rounded-full border border-accent/15">
              <Zap className="w-3.5 h-3.5" />
              {specializationName}
            </span>
          </div>
        </div>

        {/* Row 2: Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Row 3: Info grid with tinted background */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3.5 px-4 bg-secondary/60 rounded-xl border border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <ReceiptText className="w-4 h-4 text-success" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Budget</span>
              <span className="font-bold text-foreground text-sm">{getBudgetFormatted()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-warning" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Deadline</span>
              <span className="font-semibold text-foreground text-sm">{formatDeadline(job.deadline, job.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Posted</span>
              <span className="font-semibold text-foreground text-sm">{formatPostedDate(job.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/6 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block font-semibold uppercase tracking-wider">Client</span>
              <span className="font-semibold text-foreground text-sm truncate max-w-[120px] block">{clientName}</span>
            </div>
          </div>
        </div>

        {/* Row 4: Skills Tags + Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="flex-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Required Skills
            </span>
            <div className="flex flex-wrap gap-1.5">
              {skills.length > 0 ? (
                skills.slice(0, 6).map((skillName, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 bg-secondary text-muted-foreground group-hover:text-foreground text-xs font-medium rounded-md transition-colors"
                  >
                    {skillName}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">No skill requirements</span>
              )}
              {skills.length > 6 && (
                <span className="px-2.5 py-0.5 bg-muted text-muted-foreground text-xs rounded-md">+{skills.length - 6}</span>
              )}
            </div>
          </div>

          <div className="flex justify-end items-center">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:text-accent-hover transition-colors">
              View Details
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function JobList() {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [jobsRes, catsRes, skillsRes] = await Promise.all([
          api.jobPosts.list(),
          categoryTagService.getCategories(),
          categoryTagService.getSkills(),
        ]);
        setJobs(jobsRes || []);
        setAllCategories(catsRes || []);
        setAllSkills(skillsRes || []);
      } catch (err) {
        console.error("Failed to load jobs list data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => {
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
  }, []);

  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));
  const clearFilters = () =>
    setFilters({
      category: "",
      minBudget: 0,
      maxBudget: 0,
      skill: "",
      sortBy: "newest",
    });

  const hasActiveFilters =
    filters.category ||
    filters.minBudget > 0 ||
    filters.maxBudget > 0 ||
    filters.skill;

  let filtered = jobs.filter((j) => {
    if (!j) return false;

    const statusLower = j.status?.toLowerCase() || "open";
    if (statusLower !== "open" && statusLower !== "published") return false;

    if (
      searchTerm &&
      !j.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !j.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    if (filters.category && j.aiCategoryDomainId !== filters.category) return false;
    const budget = Number(j.budget) || 0;
    if (filters.minBudget > 0 && budget < filters.minBudget) return false;
    if (filters.maxBudget > 0 && budget > filters.maxBudget) return false;
    if (filters.skill) {
      const jobSkillIds = j.jobPostSkills?.map((s) => s.skillsId) || [];
      if (!jobSkillIds.includes(filters.skill)) return false;
    }
    return true;
  });

  switch (filters.sortBy) {
    case "budget_high":
      filtered = [...filtered].sort(
        (a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0),
      );
      break;
    case "budget_low":
      filtered = [...filtered].sort(
        (a, b) => (Number(a.budget) || 0) - (Number(b.budget) || 0),
      );
      break;
    case "deadline":
      filtered = [...filtered].sort(
        (a, b) => (Number(a.deadline) || 0) - (Number(b.deadline) || 0),
      );
      break;
    default:
      filtered = [...filtered].sort(
        (a, b) => {
          const timeA = new Date(b.createdAt || 0).getTime();
          const timeB = new Date(a.createdAt || 0).getTime();
          if (Number.isNaN(timeA) || Number.isNaN(timeB)) return 0;
          return timeA - timeB;
        },
      );
      break;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="page-title">Find Jobs</h1>
        <p className="page-subtitle">
          Browse available AI projects that match your skills
        </p>
      </div>

      {user?.role === "expert" && user?.hasProfile === false && (
        <div className="mb-6 p-4 bg-warning-light border border-warning/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warning flex-shrink-0" />
            <p className="text-sm font-medium text-foreground">
              You need a complete profile to submit proposals. You can browse jobs, but cannot apply yet.
            </p>
          </div>
          <Link
            to="/expert/edit-profile"
            className="whitespace-nowrap h-10 px-5 bg-warning text-warning-foreground rounded-xl hover:opacity-90 font-semibold text-sm transition-colors shadow-sm inline-flex items-center gap-2"
          >
            Create Profile
          </Link>
        </div>
      )}

      {/* Sticky Search & Filters Bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 mb-6 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-card focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 text-sm placeholder:text-muted-foreground/40 transition-shadow"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-4 border rounded-xl inline-flex items-center gap-2 text-sm font-medium transition-all ${
              showFilters || hasActiveFilters
                ? "border-accent bg-accent/6 text-accent shadow-sm"
                : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            )}
          </button>
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter("sortBy", e.target.value)}
            className="h-11 px-4 border border-border rounded-xl bg-card text-sm font-medium focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="budget_high">Budget: High to Low</option>
            <option value="budget_low">Budget: Low to High</option>
            <option value="deadline">Deadline: Soonest</option>
          </select>

          {/* Results count */}
          <span className="text-sm text-muted-foreground font-medium ml-auto">
            {filtered.length} job{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter("category", e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
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
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Min Budget
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={filters.minBudget || ""}
                onChange={(e) =>
                  updateFilter(
                    "minBudget",
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                placeholder="Any"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Max Budget
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={filters.maxBudget || ""}
                onChange={(e) =>
                  updateFilter(
                    "maxBudget",
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
                placeholder="Any"
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Required Skill
              </label>
              <select
                value={filters.skill}
                onChange={(e) => updateFilter("skill", e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
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
          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-muted/40 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-9 h-9 text-muted-foreground/25" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">
            No jobs found
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            {searchTerm || hasActiveFilters
              ? "Try adjusting your search terms or clearing the filters."
              : "No jobs are currently available. Check back soon for new opportunities."}
          </p>
          {(searchTerm || hasActiveFilters) && (
            <button
              onClick={() => {
                setSearchTerm("");
                clearFilters();
              }}
              className="h-9 px-4 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((job) => (
            <ProjectCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
