import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { Search, Star, MapPin, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { SkillTags } from "../../components/shared/SkillTags.jsx";
import { Button } from "../../components/ui/button.jsx";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Checkbox group - reusable inner component
// ---------------------------------------------------------------------------

function CheckboxGroup({ title, options, selected, onToggle }) {
  if (!options || options.length === 0) return null;

  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
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
                className="w-4 h-4 rounded border-input text-brand-primary focus:ring-brand-primary/50 accent-brand-primary flex-shrink-0"
              />
              <span className="text-sm text-foreground/80 group-hover:text-foreground">
                {opt.label}
              </span>
              {opt.count != null && (
                <span className="text-xs text-muted-foreground ml-auto">{opt.count}</span>
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
  const [categoriesList, setCategoriesList] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    async function loadExperts() {
      try {
        setLoading(true);
        const [res, cats, skills] = await Promise.all([
          api.experts.list().catch(() => []),
          api.categoryTags.getCategories().catch(() => []),
          api.categoryTags.getSkills().catch(() => []),
        ]);
        
        setCategoriesList(cats || []);
        setSkillsList(skills || []);

        const expertsOnly = (res || [])
          .filter((u) => u.role?.toLowerCase() === "expert")
          .map((u) => {
            const profile = u.expertProfile || {};
            
            // Decode Expert Category Name
            let resolvedCatName = profile.category || u.category || "";
            const matchedCat = (cats || []).find(c => c.id === resolvedCatName);
            if (matchedCat) {
              resolvedCatName = matchedCat.name;
            }

            // Decode Expert Specialization Name
            let resolvedSpecName = profile.specialization || profile.major || u.specialization || "";
            let foundSpec = false;
            for (const cat of (cats || [])) {
              const matchedSpec = cat.specializations?.find(s => s.id === resolvedSpecName);
              if (matchedSpec) {
                resolvedSpecName = matchedSpec.name;
                foundSpec = true;
                break;
              }
            }
            if (!foundSpec && resolvedSpecName.match(/^[0-9a-fA-F-]{36}$/)) {
              resolvedSpecName = "AI Specialist";
            }

            if (resolvedCatName.match(/^[0-9a-fA-F-]{36}$/)) {
              resolvedCatName = "AI & Computing";
            }

            // Decode Expert Skills
            const resolvedExpertSkills = (profile.skills || []).map(sk => {
              if (typeof sk === "string" && sk.startsWith("skill-")) {
                const match = (skills || []).find(s => s.id === sk);
                return match ? match.name : sk;
              }
              return typeof sk === "string" ? sk : sk?.name || "";
            });

            return {
              id: u.id,
              name: u.fullName,
              title: profile.jobTitle || resolvedSpecName || "AI Specialist",
              specialization: resolvedSpecName || "AI Specialist",
              category: resolvedCatName || "AI & Computing",
              location: profile.location || "N/A",
              bio: profile.bio || u.bio || "No biography provided.",
              rating: null,
              completedProjects: profile.completedProjects || 0,
              hourlyRate: profile.hourlyRate || 0,
              skills: resolvedExpertSkills,
              avatar: null,
            };
          });
        setExperts(expertsOnly);

        // Load full profile + evaluate for each expert in parallel
        const expertIds = expertsOnly.map(e => e.id);
        if (expertIds.length > 0) {
          const [userResults, reviewResults] = await Promise.all([
            Promise.allSettled(expertIds.map(eid => api.users.getById(eid))),
            Promise.allSettled(expertIds.map(eid => api.reviews.getExpertReviews(eid))),
          ]);

          // Map full user data (completed projects from projects array, hourlyRate)
          const userMap = {};
          userResults.forEach((result, idx) => {
            if (result.status === "fulfilled" && result.value) {
              const u = result.value;
              const allProjects = u.projects || u.Projects || [];
              const completedCount = allProjects.filter(p =>
                ["completed", "complete", "resolved"].includes((p.status || p.Status || "").toLowerCase())
              ).length;
              userMap[expertIds[idx]] = {
                completedProjects: completedCount,
                hourlyRate: u.expertProfile?.hourlyRate || 0,
              };
            }
          });

          // Map evaluate (average rating)
          const ratingMap = {};
          reviewResults.forEach((result, idx) => {
            if (result.status === "fulfilled" && result.value) {
              const reviewsList = result.value.reviews || [];
              if (reviewsList.length > 0) {
                const totalRating = reviewsList.reduce((sum, r) => sum + (r.rating || 0), 0);
                const avg = (totalRating / reviewsList.length).toFixed(1).replace(".0", "");
                ratingMap[expertIds[idx]] = avg;
              }
            }
          });

          setExperts(prev => prev.map(e => ({
            ...e,
            rating: ratingMap[e.id] || null,
            completedProjects: userMap[e.id]?.completedProjects ?? e.completedProjects,
            hourlyRate: userMap[e.id]?.hourlyRate ?? e.hourlyRate,
          })));
        }
      } catch (err) {
        console.error("Failed to load experts list:", err);
      } finally {
        setLoading(false);
      }
    }
    loadExperts();
  }, []);

  // ---- Filter options derived from expert data -----------------------------

  // Category options: retrieve fully from Backend categories API (Filter duplicates)
  const categoryOptions = useMemo(() => {
    const list = [];
    categoriesList.forEach((cat) => {
      if (cat.name && !list.some(item => item.value === cat.name)) {
        list.push({
          value: cat.name,
          label: cat.name,
          count: experts.filter((e) => e.category === cat.name).length,
        });
      }
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [categoriesList, experts]);

  // Domain expertise: retrieve fully from Backend categories API
  // Only retrieve specializations officially belonging to Backend categories
  const domainOptions = useMemo(() => {
    const list = [];
    categoriesList.forEach((cat) => {
      if (Array.isArray(cat.specializations)) {
        cat.specializations.forEach((spec) => {
          if (spec.name && !spec.name.match(/^[0-9a-fA-F-]{36}$/)) {
            // Count actual matching experts
            const count = experts.filter((e) => e.specialization === spec.name).length;
            
            if (!list.some(item => item.value === spec.name)) {
              list.push({
                value: spec.name,
                label: spec.name,
                count: count,
              });
            }
          }
        });
      }
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [categoriesList, experts]);

  // Core technology (Skills): retrieve fully from Backend skills API (Filter duplicates)
  const techOptions = useMemo(() => {
    const list = [];
    skillsList.forEach((skill) => {
      if (skill.name && !skill.name.match(/^[0-9a-fA-F-]{36}$/)) { // Only use real skill names
        if (!list.some(item => item.value === skill.name)) {
          list.push({
            value: skill.name,
            label: skill.name,
            count: experts.filter((e) => e.skills.includes(skill.name)).length,
          });
        }
      }
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [skillsList, experts]);

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
    setCurrentPage(1);
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

    // Rating filter (OR within group - highest selected tier wins)
    if (selectedRatings.size > 0) {
      const minRequired = Math.min(...[...selectedRatings].map(Number));
      if (e.rating < minRequired) return false;
    }

    // Experience filter (OR within group - highest selected tier wins)
    if (selectedExperience.size > 0) {
      const minRequired = Math.min(...[...selectedExperience].map(Number));
      if (e.completedProjects < minRequired) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.max(Math.ceil(filtered.length / itemsPerPage), 1);
  const activePage = currentPage > totalPages ? 1 : currentPage;
  const paginatedExperts = filtered.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  // ---- Render --------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Recommended Experts"
        subtitle="Browse and connect with skilled AI professionals"
      />

      {/* Search + Filter toggle */}
      <div className="page-filter-toolbar">
        <div className="page-filter-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search by name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-input-background pl-10 pr-4 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="page-filter-controls">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-10 px-4 border rounded-xl inline-flex items-center gap-2 text-sm font-medium transition-colors ${showFilters || hasActiveFilters
              ? "border-primary bg-primary-light text-primary"
              : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="page-filter-chips">
          {[...selectedCategories].map((v) => (
            <span key={v} className="px-3 py-1 bg-success-light text-success rounded-full text-xs font-medium inline-flex items-center gap-1">
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
            <span key={v} className="px-3 py-1 bg-accent-light text-accent rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}
              <button onClick={() => toggleFilter(setSelectedTech)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...selectedRatings].map((v) => (
            <span key={v} className="px-3 py-1 bg-warning-light text-warning rounded-full text-xs font-medium inline-flex items-center gap-1">
              Star {v}+
              <button onClick={() => toggleFilter(setSelectedRatings)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {[...selectedExperience].map((v) => (
            <span key={v} className="px-3 py-1 bg-success-light text-success rounded-full text-xs font-medium inline-flex items-center gap-1">
              {v}+ projects
              <button onClick={() => toggleFilter(setSelectedExperience)(v)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter panel - checkbox groups */}
      {showFilters && (
        <div className="page-filter-panel">
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
          <div className="flex justify-end mt-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground/60 mb-2">No experts found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm || hasActiveFilters
              ? "Try adjusting your search or filters."
              : "No AI experts are currently available."}
          </p>
        </div>
      ) : (
        <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedExperts.map((expert) => (
            <div
              key={expert.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-foreground text-[15px] leading-snug">
                    {expert.name}
                  </h3>
                  {expert.rating && Number(expert.rating) > 0 ? (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-success-light text-success rounded-full text-xs font-semibold inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-success text-success" />
                      {expert.rating}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                      None
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-2.5">
                  {expert.title}
                  {expert.location ? (
                    <>
                      {" - "}
                      <span className="font-medium text-foreground/70">
                        {expert.location}
                      </span>
                    </>
                  ) : null}
                </p>

                {expert.bio && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                    {expert.bio}
                  </p>
                )}

                {expert.skills?.length > 0 && (
                  <div className="mb-3">
                    <SkillTags
                      skills={expert.skills}
                      maxVisible={4}
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {expert.completedProjects}
                    </span>{" "}
                    completed projects
                  </span>
                  <span className="text-muted-foreground/60">-</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {expert.hourlyRate}
                    </span>{" "}
                    USD/hr
                  </span>
                </div>
              </div>

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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing {(activePage - 1) * itemsPerPage + 1} to {Math.min(activePage * itemsPerPage, filtered.length)} of {filtered.length} experts
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="h-9 px-3 border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      activePage === i + 1
                        ? "bg-brand-primary text-brand-primary-foreground shadow-sm"
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={activePage === totalPages}
                className="h-9 px-3 border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
