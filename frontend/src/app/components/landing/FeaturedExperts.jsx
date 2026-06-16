import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Star, Award, MapPin } from "lucide-react";
import api from "../../../services/api.js";
import { LoadingSkeleton } from "../shared/LoadingSkeleton.jsx";

export function FeaturedExperts() {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExperts() {
      try {
        setLoading(true);
        const data = await api.get("/experts/featured?limit=6", {
          authenticated: false,
        });
        setExperts(Array.isArray(data) ? data : []);
      } catch {
        // Graceful fallback — show empty state
      } finally {
        setLoading(false);
      }
    }
    loadExperts();
  }, []);

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
    <section id="experts" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Featured Experts
          </h2>
          <p className="text-xl text-gray-600">
            Connect with top-rated AI professionals
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <LoadingSkeleton className="w-20 h-20 rounded-2xl" />
                  <div className="w-full">
                    <LoadingSkeleton className="h-5 w-2/3 mx-auto mb-2" />
                    <LoadingSkeleton className="h-4 w-1/2 mx-auto" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                  <LoadingSkeleton className="h-4 w-20" />
                  <LoadingSkeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : experts.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">
              No experts available
            </h3>
            <p className="text-sm text-gray-400">
              Check back soon for featured AI experts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {experts.map((expert) => (
              <div
                key={expert.userId}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer group hover:scale-105"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(expert.fullName)} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  >
                    <span className="text-white font-bold text-2xl">
                      {expert.fullName?.[0] || "?"}
                    </span>
                  </div>
                  <div className="w-full">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {expert.fullName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {expert.jobTitle || expert.major || "AI Specialist"}
                    </p>
                    {expert.location && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {expert.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {expert.skills?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {expert.skills.slice(0, 3).map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {skill.name || skill}
                      </span>
                    ))}
                    {expert.skills.length > 3 && (
                      <span className="px-2 py-0.5 text-gray-400 text-xs">
                        +{expert.skills.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-gray-900">
                      {typeof expert.successRate === "number"
                        ? expert.successRate.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({expert.completedProjects ?? 0})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-700 text-sm">
                    <span className="font-medium">
                      {expert.reputationCredit > 0
                        ? `${expert.reputationCredit.toFixed(1)} pts`
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {experts.length > 0 && (
          <div className="text-center mt-10">
            <Link
              to="/experts"
              className="inline-flex items-center gap-2 px-6 py-3 text-blue-900 font-medium border-2 border-blue-900 rounded-xl hover:bg-blue-50 transition-colors"
            >
              View All Experts
              <Award className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
