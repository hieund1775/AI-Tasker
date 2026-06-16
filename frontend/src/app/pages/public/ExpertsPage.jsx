import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Search, Star, MapPin, ArrowRight } from "lucide-react";
import api from "../../../services/api.js";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";

/**
 * ExpertsPage — public expert discovery page.
 * Connects to backend API to list and search expert profiles.
 * This is a read-only public view without client-specific actions.
 */
export function ExpertsPage() {
  const [searchTerm, setSearchTerm] = useState("");
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
          }));
        setExperts(expertsOnly);
      } catch (err) {
        console.error("Failed to load public experts:", err);
      } finally {
        setLoading(false);
      }
    }
    loadExperts();
  }, []);

  const availableSkills = [...new Set(experts.flatMap((e) => e.skills || []))].sort();

  const filtered = experts.filter(
    (e) =>
      !searchTerm ||
      e?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e?.specialization?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getAvatarGradient = (name) => {
    const gradients = [
      "from-blue-400 to-purple-500",
      "from-green-400 to-teal-500",
      "from-orange-400 to-red-500",
      "from-pink-400 to-rose-500",
    ];
    return gradients[Math.abs((name || "?").charCodeAt(0)) % gradients.length];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Experts</h1>
        <p className="text-gray-500 mt-1">
          {loading
            ? "Loading profiles..."
            : `Discover ${filtered.length} AI ${filtered.length === 1 ? "professional" : "professionals"}`}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 text-sm"
        />
      </div>

      {/* Skills quick filter */}
      {!loading && availableSkills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableSkills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => setSearchTerm(skill)}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 hover:text-gray-900 transition-colors"
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start gap-4 mb-4">
                <LoadingSkeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <LoadingSkeleton className="h-5 w-2/3 mb-2" />
                  <LoadingSkeleton className="h-4 w-1/2" />
                </div>
              </div>
              <LoadingSkeleton className="h-4 w-3/4 mb-3" />
              <div className="flex gap-2">
                <LoadingSkeleton className="h-6 w-16 rounded-full" />
                <LoadingSkeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
          <Search className="w-14 h-14 text-gray-200 mx-auto mb-5" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">No experts found</h3>
          <p className="text-sm text-gray-400">
            {searchTerm
              ? "Try adjusting your search terms."
              : "No AI experts are currently available. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((expert) => (
            <Link
              to={`/expert/profile/${expert.id}`}
              key={expert.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarGradient(expert.name)} flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <span className="text-white font-bold text-lg">
                    {expert.name?.[0] || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-900 transition-colors">
                    {expert.name}
                  </h3>
                  <p className="text-sm text-gray-600">{expert.specialization}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    {expert.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {expert.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400" />
                      {expert.rating}
                    </span>
                    <span className="text-gray-400">
                      ({expert.completedProjects} projects)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(expert.skills || []).slice(0, 3).map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {s}
                      </span>
                    ))}
                    {(expert.skills || []).length > 3 && (
                      <span className="px-2 py-0.5 text-gray-400 text-xs">
                        +{expert.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-blue-500 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
