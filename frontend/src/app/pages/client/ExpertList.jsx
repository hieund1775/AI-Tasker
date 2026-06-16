import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import {
  Search,
  Star,
  MapPin,
  ArrowRight,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  Award,
} from "lucide-react";
import api from "../../../services/api.js";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";

// ---------------------------------------------------------------------------
// Checkbox group — reusable inner component
// ---------------------------------------------------------------------------

function CheckboxGroup({ title, options, selected, onToggle }) {
  if (!options || options.length === 0) return null;

  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
        {title}
      </h4>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const checked = selected.has(opt.value);
          return (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(opt.value)}
                className="w-4 h-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900 accent-blue-900"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                {opt.label}
              </span>
              {opt.count != null && (
                <span className="text-xs text-gray-400 ml-auto">{opt.count}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expert card
// ---------------------------------------------------------------------------

function ExpertCard({ expert, viewMode }) {
  const avatarGradient =
    expert.avatar ||
    ["from-blue-400 to-purple-500", "from-green-400 to-teal-500", "from-orange-400 to-red-500", "from-pink-400 to-rose-500"][
      Math.abs(expert.name?.charCodeAt(0) || 0) % 4
    ];

  if (viewMode === "grid") {
    return (
      <Link
        to={`/client/experts/${expert.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-purple-200 transition-all group"
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
          >
            <span className="text-white font-bold text-lg">
              {expert.name?.[0] || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-900 transition-colors">
              {expert.name}
            </h3>
            <p className="text-sm text-gray-500">{expert.specialization}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
              {expert.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {expert.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-gray-900 text-sm">{expert.rating}</span>
            <span className="text-xs text-gray-400">
              ({expert.completedProjects} projects)
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Link>
    );
  }

  // List view
  return (
    <Link
      to={`/client/experts/${expert.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-white font-bold text-base">
            {expert.name?.[0] || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
              {expert.name}
            </h3>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              {expert.rating}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {expert.specialization}
            {expert.location ? ` · ${expert.location}` : ""}
          </p>
          {expert.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {expert.skills.slice(0, 5).map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium"
                >
                  {s}
                </span>
              ))}
              {expert.skills.length > 5 && (
                <span className="text-[11px] text-gray-400">+{expert.skills.length - 5}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-semibold text-gray-900">
            {expert.completedProjects}+
          </div>
          <div className="text-xs text-gray-400">projects</div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ExpertListSkeleton({ viewMode }) {
  const cols = viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3";
  const cards = Array.from({ length: 6 });
  return (
    <div className={cols}>
      {cards.map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4 mb-4">
            <LoadingSkeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
            <div className="flex-1">
              <LoadingSkeleton className="h-5 w-2/3 mb-2" />
              <LoadingSkeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-100">
            <LoadingSkeleton className="h-4 w-24" />
            <LoadingSkeleton className="h-4 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExpertList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Multi-select checkbox filters
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [selectedTech, setSelectedTech] = useState(new Set());
  const [selectedRatings, setSelectedRatings] = useState(new Set());
  const [selectedExperience, setSelectedExperience] = useState(new Set());

  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExperts() {
      try {
        setLoading(true);
        const res = await api.experts.list();
        const expertsOnly = (Array.isArray(res) ? res : [])
          .filter((u) => u.role?.toLowerCase() === "expert" && u.expertProfile)
          .map((u) => ({
            id: u.id,
            name: u.fullName,
            specialization: u.expertProfile.major || "AI Specialist",
            location: u.expertProfile.location || "",
            rating: Number(u.expertProfile.successRate) || 0,
            completedProjects: 0,
            skills: u.expertProfile.skills || [],
            avatar: null,
          }));
        setExperts(expertsOnly);
      } catch (err) {
        console.error("Failed to load experts list:", err);
      } finally {
        setLoading(false);
      }
    }
    loadExperts();
  }, []);

  // ── Filter options derived from expert data ──

  const domainOptions = useMemo(() => {
    const items = new Set();
    experts.forEach((e) => {
      e.specialization.split(/,\s*/).forEach((s) => {
        if (s.trim()) items.add(s.trim());
      });
    });
    return [...items].sort().map((domain) => ({
      value: domain,
      label: domain,
      count: experts.filter((e) => e.specialization.includes(domain)).length,
    }));
  }, [experts]);

  const techOptions = useMemo(() => {
    const items = new Set();
    experts.forEach((e) => e.skills.forEach((s) => items.add(s)));
    return [...items].sort().map((skill) => ({
      value: skill,
      label: skill,
      count: experts.filter((e) => e.skills.includes(skill)).length,
    }));
  }, [experts]);

  const ratingOptions = useMemo(() => {
    const tiers = [];
    const maxRating = Math.max(...experts.map((e) => e.rating), 0);
    if (maxRating >= 4) tiers.push({ value: "4", label: "4+ Stars" });
    if (maxRating >= 4.5) tiers.push({ value: "4.5", label: "4.5+ Stars" });
    if (maxRating >= 4.8) tiers.push({ value: "4.8", label: "4.8+ Stars" });
    return tiers;
  }, [experts]);

  const experienceOptions = useMemo(() => {
    const tiers = [];
    const maxProjects = Math.max(...experts.map((e) => e.completedProjects), 0);
    if (maxProjects >= 10) tiers.push({ value: "10", label: "10+ projects" });
    if (maxProjects >= 20) tiers.push({ value: "20", label: "20+ projects" });
    if (maxProjects >= 30) tiers.push({ value: "30", label: "30+ projects" });
    return tiers;
  }, [experts]);

  // ── Toggle helpers ──

  const toggleFilter = (setter) => (value) => {
    setter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedDomains(new Set());
    setSelectedTech(new Set());
    setSelectedRatings(new Set());
    setSelectedExperience(new Set());
  };

  const hasActiveFilters =
    selectedDomains.size > 0 ||
    selectedTech.size > 0 ||
    selectedRatings.size > 0 ||
    selectedExperience.size > 0;

  // ── Filter logic ──

  const filtered = experts.filter((e) => {
    if (
      searchTerm &&
      !e.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !e.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    if (selectedDomains.size > 0) {
      const domains = e.specialization.split(/,\s*/).map((s) => s.trim());
      if (!domains.some((d) => selectedDomains.has(d))) return false;
    }
    if (selectedTech.size > 0) {
      if (!e.skills.some((s) => selectedTech.has(s))) return false;
    }
    if (selectedRatings.size > 0) {
      const minRequired = Math.min(...[...selectedRatings].map(Number));
      if (e.rating < minRequired) return false;
    }
    if (selectedExperience.size > 0) {
      const minRequired = Math.min(...[...selectedExperience].map(Number));
      if (e.completedProjects < minRequired) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Find AI Experts</h1>
        <p className="text-gray-500">
          {loading
            ? "Loading expert profiles..."
            : `${filtered.length} ${filtered.length === 1 ? "expert" : "experts"} available`}
        </p>
      </div>

      {/* ── Search + Controls row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

        {/* View toggle */}
        <div className="flex border border-gray-300 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 ${viewMode === "grid" ? "bg-blue-50 text-blue-900" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 ${viewMode === "list" ? "bg-blue-50 text-blue-900" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[...selectedDomains].map((v) => (
            <span key={v} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}
              <button onClick={() => toggleFilter(setSelectedDomains)(v)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {[...selectedTech].map((v) => (
            <span key={v} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}
              <button onClick={() => toggleFilter(setSelectedTech)(v)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {[...selectedRatings].map((v) => (
            <span key={v} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              ★ {v}+
              <button onClick={() => toggleFilter(setSelectedRatings)(v)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {[...selectedExperience].map((v) => (
            <span key={v} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              <Award className="w-3 h-3" /> {v}+
              <button onClick={() => toggleFilter(setSelectedExperience)(v)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-gray-400 hover:text-gray-600 ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <CheckboxGroup
              title="Domain Expertise"
              options={domainOptions}
              selected={selectedDomains}
              onToggle={toggleFilter(setSelectedDomains)}
            />
            <CheckboxGroup
              title="Core Technology"
              options={techOptions}
              selected={selectedTech}
              onToggle={toggleFilter(setSelectedTech)}
            />
            <CheckboxGroup
              title="Rating"
              options={ratingOptions}
              selected={selectedRatings}
              onToggle={toggleFilter(setSelectedRatings)}
            />
            <CheckboxGroup
              title="Experience"
              options={experienceOptions}
              selected={selectedExperience}
              onToggle={toggleFilter(setSelectedExperience)}
            />
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <ExpertListSkeleton viewMode={viewMode} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <Search className="w-14 h-14 text-gray-200 mx-auto mb-5" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">No experts found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            {searchTerm || hasActiveFilters
              ? "Try adjusting your search or clearing filters."
              : "No AI experts are currently available. Check back soon."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} viewMode="list" />
          ))}
        </div>
      )}
    </div>
  );
}
