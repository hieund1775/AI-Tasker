import { useState, useEffect } from "react";
import { Link } from "react-router";
import { HeroSection } from "../../components/landing/HeroSection.jsx";
import { HowItWorks } from "../../components/landing/HowItWorks.jsx";
import { FeaturedExperts } from "../../components/landing/FeaturedExperts.jsx";
import { Footer } from "../../components/layout/Footer.jsx";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import {
  Users,
  Briefcase,
  Award,
  ArrowRight,
  Search,
  CheckCircle2,
  DollarSign,
  Clock,
} from "lucide-react";
import api from "../../../services/api.js";

/**
 * HomePage — public landing page for the AI Tasker marketplace.
 *
 * Fetches real platform stats and featured projects from P0B backend APIs.
 * Composes HeroSection, HowItWorks, FeaturedExperts, and Footer components.
 */
export function HomePage() {
  const [stats, setStats] = useState(null);
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setStatsLoading(true);
        const data = await api.get("/platform/stats", { authenticated: false });
        setStats(data);
      } catch {
        // Graceful fallback — stats section hidden if API unavailable
      } finally {
        setStatsLoading(false);
      }
    }

    async function loadFeaturedProjects() {
      try {
        setProjectsLoading(true);
        const data = await api.get("/projects/featured?limit=6", {
          authenticated: false,
        });
        setFeaturedProjects(Array.isArray(data) ? data : []);
      } catch {
        // Graceful fallback — show empty state
      } finally {
        setProjectsLoading(false);
      }
    }

    loadStats();
    loadFeaturedProjects();
  }, []);

  const formatBudget = (amount) => {
    const n = Number(amount);
    if (!n) return "—";
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* ── Navbar ── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">AI</span>
            </div>
            <span className="text-[22px] font-semibold text-blue-900">Tasker</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/experts"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              Browse Experts
            </Link>
            <Link
              to="/jobs"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              Browse Jobs
            </Link>
            <Link
              to="/login"
              className="px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:text-blue-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold text-[15px] shadow-sm transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <HeroSection />

      {/* ── Platform Stats ── */}
      {stats && !statsLoading && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                {
                  icon: Users,
                  value: stats.totalExperts ?? 0,
                  label: "AI Experts",
                  color: "text-blue-600",
                },
                {
                  icon: Briefcase,
                  value: stats.totalClients ?? 0,
                  label: "Clients",
                  color: "text-purple-600",
                },
                {
                  icon: Award,
                  value: stats.totalOpenJobs ?? 0,
                  label: "Open Jobs",
                  color: "text-amber-600",
                },
                {
                  icon: CheckCircle2,
                  value: stats.totalCompletedProjects ?? 0,
                  label: "Completed Projects",
                  color: "text-green-600",
                },
              ].map((item, i) => (
                <div key={i} className="p-4">
                  <item.icon
                    className={`w-8 h-8 ${item.color} mx-auto mb-2 opacity-80`}
                  />
                  <div className="text-3xl font-bold text-gray-900">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : item.value}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Community Section ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Join Our Growing Community
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A thriving marketplace connecting businesses with skilled AI
              professionals for projects of every scale.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              {
                icon: Users,
                label: "For Clients",
                desc: "Post your AI project and get matched with qualified experts ready to deliver results.",
              },
              {
                icon: Award,
                label: "For Experts",
                desc: "Showcase your AI skills, find meaningful projects, and grow your freelance career.",
              },
              {
                icon: Briefcase,
                label: "Secure Payments",
                desc: "Work with confidence — our escrow system protects both clients and experts.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="text-center p-6 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-blue-900" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.label}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <HowItWorks />

      {/* ── Featured Projects ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Featured Projects
            </h2>
            <p className="text-xl text-gray-600">
              Discover exciting opportunities on our marketplace
            </p>
          </div>

          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 p-6"
                >
                  <LoadingSkeleton className="h-5 w-2/3 mb-3" />
                  <LoadingSkeleton className="h-4 w-full mb-2" />
                  <LoadingSkeleton className="h-4 w-3/4 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <LoadingSkeleton className="h-5 w-16 rounded-md" />
                    <LoadingSkeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <LoadingSkeleton className="h-4 w-20" />
                    <LoadingSkeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProjects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-500 mb-2">
                No featured projects
              </h3>
              <p className="text-sm text-gray-400">
                Check back soon for exciting AI project opportunities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((project) => (
                <Link
                  key={project.id}
                  to={
                    project.type === "Job"
                      ? `/jobs?id=${project.id}`
                      : `/projects/${project.id}`
                  }
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-purple-200 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900 text-[15px] leading-snug line-clamp-2 group-hover:text-blue-900 transition-colors">
                      {project.title}
                    </h3>
                    {project.categoryName && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[11px] font-medium">
                        {project.categoryName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                  {project.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.skills.slice(0, 4).map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[11px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {project.skills.length > 4 && (
                        <span className="px-2 py-0.5 text-gray-400 text-[11px]">
                          +{project.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-semibold text-gray-900 inline-flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        {formatBudget(project.budget)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {project.status}
                      </span>
                    </div>
                    {project.clientName && (
                      <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                        {project.clientName}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Featured Experts ── */}
      <FeaturedExperts />

      {/* ── CTA ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900 to-purple-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            Join our marketplace today and connect with top AI talent for your
            next project.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup?role=client"
              className="px-8 py-3.5 bg-white text-blue-900 rounded-xl hover:bg-blue-50 font-semibold text-base inline-flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              Sign Up as Client
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/signup?role=expert"
              className="px-8 py-3.5 bg-transparent text-white border-2 border-white/30 rounded-xl hover:bg-white/10 font-semibold text-base inline-flex items-center justify-center gap-2 transition-all"
            >
              Become an Expert
              <Users className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
