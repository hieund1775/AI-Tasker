import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Search, Star, MapPin, SlidersHorizontal, X } from "lucide-react";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { Button } from "../../components/ui/button.jsx";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Checkbox group — reusable inner component
// ---------------------------------------------------------------------------

function CheckboxGroup({ title, options, selected, onToggle }) {
  if (!options || options.length === 0) return null;

  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
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
                className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary/50 accent-brand-primary"
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
// Component
// ---------------------------------------------------------------------------

export function ExpertList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Multi-select checkbox filters
  const [selectedCategories, setSelectedCategories] = useState(new Set());
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
        // Filter out experts (even if they don't have a complete profile)
        const expertsOnly = (res || [])
          .filter((u) => u.role?.toLowerCase() === "expert")
          .map((u) => {
            const profile = u.expertProfile || {};
            return {
              id: u.id,
              name: u.fullName,
              title: profile.jobTitle || profile.major || u.specialization || "AI Specialist",
              specialization: profile.major || u.specialization || "AI Specialist",
              category: profile.category || u.category || "AI & Computing",
              location: profile.location || "N/A",
              bio: profile.bio || u.bio || "No biography provided.",
              rating: 4.8,
              completedProjects: profile.completedProjects || 0,
              hourlyRate: profile.hourlyRate || 50,
              skills: profile.skills || [],
              avatar: null,
            };
          });
        setExperts(expertsOnly);
      } catch (err) {
        console.error("Failed to load experts list:", err);
      } finally {
        setLoading(false);
      }
    }
    loadExperts();
  }, []);

  // ---- Filter options derived from expert data -----------------------------

  // Category options: unique category items
  const categoryOptions = useMemo(() => {
    const items = new Set();
    experts.forEach((e) => {
      if (e.category) items.add(e.category);
    });
    return [...items].sort().map((cat) => ({
      value: cat,
      label: cat,
      count: experts.filter((e) => e.category === cat).length,
    }));
  }, [experts]);

  // Domain expertise: unique items from expert specializations (split by comma)
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

  // Core technology: unique skills across all experts
  const techOptions = useMemo(() => {
    const items = new Set();
    experts.forEach((e) => e.skills.forEach((s) => items.add(s)));
    return [...items].sort().map((skill) => ({
      value: skill,
      label: skill,
      count: experts.filter((e) => e.skills.includes(skill)).length,
    }));
  }, [experts]);

  // Rating tiers derived from actual expert ratings
  const ratingOptions = useMemo(() => {
    const tiers = [];
    const maxRating = Math.max(...experts.map((e) => e.rating), 0);
    if (maxRating >= 4) tiers.push({ value: "4", label: "4+ Stars" });
    if (maxRating >= 4.5) tiers.push({ value: "4.5", label: "4.5+ Stars" });
    if (maxRating >= 4.8) tiers.push({ value: "4.8", label: "4.8+ Stars" });
    return tiers;
  }, [experts]);

  // Experience tiers derived from actual completed project counts
  const experienceOptions = useMemo(() => {
    const tiers = [];
    const maxProjects = Math.max(...experts.map((e) => e.completedProjects), 0);
    if (maxProjects >= 20) tiers.push({ value: "20", label: "20+ projects" });
    if (maxProjects >= 30) tiers.push({ value: "30", label: "30+ projects" });
    if (maxProjects >= 40) tiers.push({ value: "40", label: "40+ projects" });
    return tiers;
  }, [experts]);

  // ---- Toggle helpers ------------------------------------------------------
  const toggleFilter = (setter) => (value) => {
    setter((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedCategories(new Set());
    setSelectedDomains(new Set());
    setSelectedTech(new Set());
    setSelectedRatings(new Set());
    setSelectedExperience(new Set());
  };

  const hasActiveFilters =
    selectedCategories.size > 0 ||
    selectedDomains.size > 0 ||
    selectedTech.size > 0 ||
    selectedRatings.size > 0 ||
    selectedExperience.size > 0;

  // ---- Filter logic --------------------------------------------------------
  const filtered = experts.filter((e) => {
    // Text search
    if (
      searchTerm &&
      !e.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !e.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    // Category filter
    if (selectedCategories.size > 0) {
      if (!selectedCategories.has(e.category)) return false;
    }

    // Domain filter (OR within group)
    if (selectedDomains.size > 0) {
      const domains = e.specialization.split(/,\s*/).map((s) => s.trim());
      if (!domains.some((d) => selectedDomains.has(d))) return false;
    }

    // Technology filter (OR within group)
    if (selectedTech.size > 0) {
      if (!e.skills.some((s) => selectedTech.has(s))) return false;
    }

    // Rating filter (OR within group — highest selected tier wins)
    if (selectedRatings.size > 0) {
      const minRequired = Math.min(...[...selectedRatings].map(Number));
      if (e.rating < minRequired) return false;
    }

    // Experience filter (OR within group — highest selected tier wins)
    if (selectedExperience.size > 0) {
      const minRequired = Math.min(...[...selectedExperience].map(Number));
      if (e.completedProjects < minRequired) return false;
    }

    return true;
  });

  // ---- Render --------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommended Experts</h1>
        <p className="text-gray-600">Browse and connect with skilled AI professionals</p>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 border rounded-xl inline-flex items-center gap-2 text-sm font-medium transition ${
            showFilters || hasActiveFilters
              ? "border-brand-primary bg-brand-primary-light text-brand-primary"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-brand-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[...selectedCategories].map((v) => (
            <span key={v} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}
              <button onClick={() => toggleFilter(setSelectedCategories)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...selectedDomains].map((v) => (
            <span key={v} className="px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}
              <button onClick={() => toggleFilter(setSelectedDomains)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...selectedTech].map((v) => (
            <span key={v} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}
              <button onClick={() => toggleFilter(setSelectedTech)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...selectedRatings].map((v) => (
            <span key={v} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              ★ {v}+
              <button onClick={() => toggleFilter(setSelectedRatings)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...selectedExperience].map((v) => (
            <span key={v} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}+ projects
              <button onClick={() => toggleFilter(setSelectedExperience)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-gray-400 hover:text-gray-600 ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter panel — checkbox groups */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <CheckboxGroup
              title="Select A category"
              options={categoryOptions}
              selected={selectedCategories}
              onToggle={toggleFilter(setSelectedCategories)}
            />
            <CheckboxGroup
              title="Area of expertise or Specialization"
              options={domainOptions}
              selected={selectedDomains}
              onToggle={toggleFilter(setSelectedDomains)}
            />
            <CheckboxGroup
              title="Required Skills"
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
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">No experts found</h3>
          <p className="text-base text-gray-400">
            {searchTerm || hasActiveFilters
              ? "Try adjusting your search or filters."
              : "No AI experts are currently available."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((expert) => (
            <div
              key={expert.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* ── Top: name + rating badge ── */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900 text-[15px] leading-snug">
                    {expert.name}
                  </h3>
                  <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                    {expert.rating}
                  </span>
                </div>

                {/* ── Title + location ── */}
                <p className="text-sm text-gray-500 mb-2.5">
                  {expert.title}
                  {expert.location ? (
                    <>
                      {" · "}
                      <span className="font-medium text-gray-600">
                        {expert.location}
                      </span>
                    </>
                  ) : null}
                </p>

                {/* ── Bio ── */}
                {expert.bio && (
                  <p className="text-base text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                    {expert.bio}
                  </p>
                )}

                {/* ── Skill tags ── */}
                {expert.skills?.length > 0 && (
                  <div className="mb-3">
                    <SkillTags
                      skills={expert.skills}
                      maxVisible={4}
                    />
                  </div>
                )}

                {/* ── Stats ── */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">
                      {expert.completedProjects}
                    </span>{" "}
                    projects
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">
                      ${expert.hourlyRate}
                    </span>
                    /hr
                  </span>
                </div>
              </div>

              {/* ── Action ── */}
              <Button
                variant="default"
                size="default"
                className="w-full mt-auto"
                asChild
              >
                <Link to={`/client/experts/${expert.id}`}>
                  View Profile
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
