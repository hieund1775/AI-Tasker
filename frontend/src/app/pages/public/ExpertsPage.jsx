import { useState } from "react";
import { Link } from "react-router";
import { Search, Star, MapPin, ArrowRight } from "lucide-react";

/**
 * ExpertsPage — public expert discovery/browsing page.
 * TODO: Connect to backend API to list and search experts.
 * This page is kept as a future API-ready placeholder.
 *
 * Note: ExpertList (pages/client/) is the client-facing expert list.
 * ExpertsPage is a public-facing variant without client-specific actions.
 */
export function ExpertsPage() {
  const [searchTerm, setSearchTerm] = useState("");

    const experts = []
    .filter((u) => u.role === "expert")
    .map((u) => ({
      id: u.id,
      name: u.fullName,
      avatar: "from-blue-400 to-purple-500",
      specialization: u.profile?.specialization || u.profile?.title || "",
      location: u.profile?.location || "",
      rating: u.profile?.rating || 0,
      reviews: u.profile?.reviewCount || 0,
      skills: u.profile?.skills || [],
    }));

  // Available skills for filter chips
  const availableSkills = [...new Set(experts.flatMap((e) => e.skills || []))].sort();

  const filtered = experts.filter((e) =>
    !searchTerm ||
    e?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e?.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">AI Experts</h1>
        <p className="text-muted-foreground mt-1">Discover top AI professionals for your projects</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:border-ring text-sm"
        />
      </div>

      {/* Skills filter */}
      {availableSkills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableSkills.map((skill) => (
            <button
              key={skill}
              type="button"
              className="px-3 py-1 bg-secondary text-muted-foreground rounded-full text-sm hover:bg-secondary transition-colors"
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No experts found</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms." : "No AI experts are currently available. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((expert) => (
            <Link
              to={`/expert/profile/${expert?.id}`}
              key={expert?.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-sm hover:border-accent transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${expert?.avatar || 'from-blue-400 to-purple-500'} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-lg">{expert?.name?.[0] || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{expert?.name}</h3>
                  <p className="text-sm text-muted-foreground">{expert?.specialization}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    {expert?.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{expert.location}</span>
                    )}
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400" />{expert?.rating}</span>
                    <span className="text-muted-foreground">({expert?.reviews})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(expert?.skills || []).slice(0, 3).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-secondary text-muted-foreground rounded text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
