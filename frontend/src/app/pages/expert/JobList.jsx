import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Search,
  DollarSign,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { categoryTagService } from "../../../services/categoryTagService.js";

/**
 * Component hiển thị thông tin chi tiết một công việc (Job Card) cho Expert
 * Thiết kế Scannable theo chuẩn UI mới với Tailwind CSS.
 */
function ProjectCard({ job }) {
  const clientName = job.client || "Khách hàng ẩn danh";
  const categoryName = job.aiCategoryDomain?.name || job.category || "Chưa phân loại";
  const specializationName = job.specialization || "Chung";
  const skills = job.requiredSkills || job.jobPostSkills?.map(s => s.skill?.name) || [];

  // Định dạng hiển thị Hạn chót (dd/mm/yyyy)
  const formatDeadline = (deadline, createdAt) => {
    if (!deadline) return "N/A";
    const d = new Date(deadline);
    if (!isNaN(d.getTime()) && typeof deadline === "string" && deadline.includes("-")) {
      return d.toLocaleDateString("vi-VN");
    }
    const days = Number(deadline);
    if (!isNaN(days) && createdAt) {
      const created = new Date(createdAt);
      created.setDate(created.getDate() + days);
      return created.toLocaleDateString("vi-VN");
    }
    return `${deadline} ngày`;
  };

  // Định dạng ngày đăng (dd/mm/yyyy)
  const formatPostedDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("vi-VN");
  };

  return (
    <Link
      to={`/expert/jobs/${job.id}`}
      className="group block bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all duration-300 transform hover:-translate-y-0.5"
    >
      <div className="flex flex-col gap-4">
        {/* Hàng 1: Tiêu đề + Category & Specialization Badges */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg md:text-xl group-hover:text-brand-primary transition-colors leading-snug">
              {job.title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Category Tag */}
            <span className="px-3 py-1 bg-brand-primary-light text-brand-primary text-sm font-semibold rounded-full border border-brand-primary/20">
              📁 Danh mục: {categoryName}
            </span>
            {/* Specialization Tag */}
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-sm font-semibold rounded-full border border-purple-100">
              ⚡ Chuyên sâu: {specializationName}
            </span>
          </div>
        </div>

        {/* Hàng 2: Mô tả dự án */}
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Hàng 3: Grid thông tin chi tiết */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-3 border-t border-b border-gray-100 bg-gray-50/50 rounded-xl px-4">
          {/* Ngân sách */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-base">💰</span>
            <div>
              <span className="text-sm text-gray-400 block font-medium">Ngân sách (Budget)</span>
              <span className="font-semibold text-gray-900">${job.budget?.toLocaleString() || "N/A"}</span>
            </div>
          </div>

          {/* Hạn chót */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-base">📅</span>
            <div>
              <span className="text-sm text-gray-400 block font-medium">Hạn chót (Deadline)</span>
              <span className="font-semibold text-gray-900">{formatDeadline(job.deadline, job.createdAt)}</span>
            </div>
          </div>

          {/* Ngày đăng */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-base">🕒</span>
            <div>
              <span className="text-sm text-gray-400 block font-medium">Đăng ngày (Posted On)</span>
              <span className="font-semibold text-gray-900">{formatPostedDate(job.createdAt)}</span>
            </div>
          </div>

          {/* Khách hàng */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-base">👤</span>
            <div>
              <span className="text-sm text-gray-400 block font-medium">Khách hàng (Client)</span>
              <span className="font-semibold text-gray-900 truncate max-w-[150px] block">{clientName}</span>
            </div>
          </div>
        </div>

        {/* Hàng 4: Skills Tags và Nút Hành Động */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          {/* Mảng kỹ năng */}
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-500 block mb-1.5 uppercase tracking-wider">
              Kỹ năng yêu cầu (Skills)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {skills.length > 0 ? (
                skills.map((skillName, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded transition"
                  >
                    {skillName}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400 italic">Không có yêu cầu kỹ năng</span>
              )}
            </div>
          </div>

          {/* Nút Xem Chi Tiết */}
          <div className="flex justify-end items-center">
            <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-brand-primary group-hover:text-brand-primary transition-colors">
              Chi tiết công việc
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
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
      break;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Find Jobs</h1>
        <p className="text-gray-600">
          Browse available AI projects that match your skills
        </p>
      </div>

      {user?.role === "expert" && user?.hasProfile === false && (
        <div className="mb-6 p-4 bg-orange-100 border border-orange-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-orange-800 text-sm font-medium">
            Tài khoản chưa có Profile. Bạn có thể xem công việc, nhưng KHÔNG THỂ
            gửi báo giá.
          </p>
          {/* SỬA: CHUYỂN TỚI EDIT-PROFILE */}
          <Link
            to="/expert/edit-profile"
            className="whitespace-nowrap h-11 px-5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium text-[15px] transition-colors shadow-sm inline-flex items-center gap-2"
          >
            Tạo Profile Ngay
          </Link>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary text-[15px]"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-11 px-5 border rounded-xl inline-flex items-center gap-2 text-[15px] font-medium transition-colors ${showFilters || hasActiveFilters ? "border-brand-primary bg-brand-primary-light text-brand-primary" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters{" "}
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-brand-primary rounded-full" />
          )}
        </button>
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter("sortBy", e.target.value)}
          className="h-11 px-5 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary text-[15px] bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="budget_high">Budget: High to Low</option>
          <option value="budget_low">Budget: Low to High</option>
          <option value="deadline">Deadline: Soonest</option>
        </select>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 uppercase mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter("category", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm bg-white"
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
              <label className="block text-sm font-medium text-gray-500 uppercase mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 uppercase mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 uppercase mb-2">
                Required Skill
              </label>
              <select
                value={filters.skill}
                onChange={(e) => updateFilter("skill", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary text-sm bg-white"
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
              className="text-[15px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            No jobs found
          </h3>
          <p className="text-sm text-gray-400">
            {searchTerm || hasActiveFilters
              ? "Try adjusting your search or filters."
              : "No jobs are currently available. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((job) => (
            <ProjectCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
