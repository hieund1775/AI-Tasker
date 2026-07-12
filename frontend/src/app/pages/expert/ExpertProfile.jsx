import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Briefcase,
  MapPin,
  Clock,
  Edit,
  Mail,
  Phone,
  Globe,
  Tag,
  CheckCircle2,
  Calendar,
  BarChart3,
  TrendingUp,
  Wallet,
  AlertTriangle,
  XCircle,
  Star,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

import { getLocalExpertProfile } from "./EditExpertProfile.jsx";

export function ExpertProfile() {
  const { user: authUser } = useAuth();

  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    completed: 0,
    cancel: 0,
    report: 0,
    success: "0",
    evaluate: 0,
  });

  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;

    async function fetchProfile() {
      try {
        setLoading(true);
        const apiUser = await api.users.getById(authUser.id);
        if (!cancelled && apiUser) {
          // Tải toàn bộ danh mục để phân giải GUID thành Tên hiển thị
          let allCats = [];
          try {
            allCats = await api.categoryTags.getCategories();
          } catch (e) {
            console.error("Failed to load categories for name resolution:", e);
          }

          const profile = apiUser.expertProfile || {};
          const localProfile = getLocalExpertProfile(authUser.id);

          const rawCategory = profile.category || localProfile.category || "";
          const rawSpecialization = profile.specialization || profile.major || localProfile.specialization || "";

          // Tìm name tương ứng với GUID
          const matchedCategoryObj = allCats.find(c => c.id === rawCategory);
          const categoryName = matchedCategoryObj ? matchedCategoryObj.name : rawCategory;

          let specializationName = rawSpecialization;
          if (matchedCategoryObj && matchedCategoryObj.specializations) {
            const matchedSpecObj = matchedCategoryObj.specializations.find(s => s.id === rawSpecialization);
            if (matchedSpecObj) {
              specializationName = matchedSpecObj.name;
            }
          }

          setExpert({
            fullName: apiUser.fullName || apiUser.name || "Expert",
            email: apiUser.email || "",
            createdAt: apiUser.createdAt,
            profile: {
              category: categoryName,
              specialization: specializationName,
              skills: (profile.skills && profile.skills.length > 0) ? profile.skills : (localProfile.skills || []),
              phone: profile.phone || apiUser.phoneNumber || apiUser.status || "",
              location: profile.location || "",
              website: profile.website || localProfile.website || "",
              industry: profile.industry || localProfile.industry || "",
              bio: profile.bio || "",
              jobTitle: profile.jobTitle || "AI Expert",
              hourlyRate: profile.hourlyRate || localProfile.hourlyRate || 0,
              portfolioUrls: profile.portfolioUrls || profile.PortfolioUrls || localProfile.portfolioUrls || "",
            }
          });

          const allProjects = apiUser.projects || apiUser.Projects || [];
          
          const completedList = allProjects.filter((p) => {
            const status = (p.status || p.Status || "").toLowerCase();
            return ["completed", "complete", "resolved"].includes(status);
          });
          const completedCount = completedList.length;

          const cancelCount = allProjects.filter((p) => {
            const status = (p.status || p.Status || "").toLowerCase();
            return ["cancelled", "canceled", "cancel_done", "contract_cancelled", "stopped"].includes(status);
          }).length;

          const reportCount = allProjects.filter((p) => {
            const status = (p.status || p.Status || "").toLowerCase();
            return ["disputed"].includes(status);
          }).length;

          const totalForSuccess = completedCount + cancelCount + reportCount;
          const successVal = totalForSuccess > 0 ? `${Math.round((completedCount / totalForSuccess) * 100)}%` : "0%";

          setStats({
            completed: completedCount,
            cancel: cancelCount,
            report: reportCount,
            success: successVal,
            evaluate: 0,
          });

          // Fetch full project details for completed projects to get clientName and projectSkills (skills)
          const detailedCompletedProjects = await Promise.all(
            completedList.map(async (p) => {
              try {
                const fullProj = await api.projects.getById(p.id || p.Id);
                const clientName = fullProj?.clientName || fullProj?.ClientName || "";
                
                let skills = [];
                if (fullProj?.projectSkills) {
                  skills = fullProj.projectSkills.map(ps => ps.skillName || ps.SkillName).filter(Boolean);
                }
                
                let category = fullProj?.category || p.category || "";
                let specialization = "";
                
                const jpId = p.jobPostId || p.JobPostId || fullProj?.jobPostId || fullProj?.JobPostId;
                if (jpId) {
                  try {
                    const jobPost = await api.jobPosts.getById(jpId);
                    if (jobPost) {
                      specialization = jobPost.specializationName || "";
                      if (!category) category = jobPost.category || "";
                      if (skills.length === 0 && jobPost.requiredSkills) {
                        skills = jobPost.requiredSkills;
                      }
                    }
                  } catch (e) {
                    console.error("Failed to fetch job post details for completed project:", e);
                  }
                }
                
                return {
                  id: p.id || p.Id,
                  title: p.title || p.Title || fullProj?.title || "",
                  category: category,
                  specialization: specialization,
                  skills: skills,
                  clientName: clientName || "Client",
                };
              } catch (e) {
                console.error("Failed to fetch full details for completed project:", e);
                return {
                  id: p.id || p.Id,
                  title: p.title || p.Title || "",
                  category: p.category || "",
                  specialization: "",
                  skills: [],
                  clientName: "Client",
                };
              }
            })
          );
          setCompletedProjects(detailedCompletedProjects);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Failed to load expert profile:", err);
      }
    }

    fetchProfile().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [authUser]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse bg-card rounded-xl border border-border p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-secondary rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 bg-secondary rounded w-48" />
              <div className="h-4 bg-secondary rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-secondary rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h2 className="text-xl font-semibold text-foreground/60 mb-2">Profile not available</h2>
          <p className="text-sm text-muted-foreground mb-5">Complete your profile to get started.</p>
          <Link
            to="/expert/profile/edit"
            className="h-11 px-5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>
      </div>
    );
  }

  const displayName = expert.fullName || "Expert";
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Profile header card ── */}
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Avatar + name info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              {expert.profile?.jobTitle && (
                <p className="text-foreground font-medium">{expert.profile.jobTitle}</p>
              )}
              <p className="text-muted-foreground text-sm">{expert.email}</p>
            </div>
          </div>

          <Link
            to="/expert/profile/edit"
            className="h-11 px-5 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-medium inline-flex items-center gap-2 transition-colors flex-shrink-0"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>

        {/* ── Meta details ── */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-border">
          {expert.profile?.location && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-muted-foreground/60" />
              {expert.profile.location}
            </span>
          )}
          {expert.profile?.category && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Briefcase className="w-4 h-4 text-muted-foreground/60" />
              Category: {expert.profile.category}
            </span>
          )}
          {expert.profile?.specialization && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground/60" />
              Specialization: {expert.profile.specialization}
            </span>
          )}
          {expert.profile?.hourlyRate > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-muted-foreground/60" />
              ${expert.profile.hourlyRate}/hr
            </span>
          )}
          {expert.createdAt && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground/60" />
              Joined{" "}
              {new Date(expert.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* ── Contact & Professional Info ── */}
        <div className="mt-8 pt-8 border-t border-border space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number *</span>
              <span className="text-sm text-foreground font-semibold">{expert.profile?.phone || ""}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Website</span>
              {expert.profile?.website ? (
                <a
                  href={expert.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline font-semibold"
                >
                  {expert.profile.website}
                </a>
              ) : (
                <span className="text-sm text-foreground/70 font-medium"></span>
              )}
            </div>
            <div>
              <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Industry</span>
              <span className="text-sm text-foreground/70 font-medium">{expert.profile?.industry || ""}</span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Portfolio URL</span>
              {expert.profile?.portfolioUrls ? (
                <a
                  href={expert.profile.portfolioUrls}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline font-semibold"
                >
                  {expert.profile.portfolioUrls}
                </a>
              ) : (
                <span className="text-sm text-foreground/70 font-medium"></span>
              )}
            </div>
          </div>
        </div>

        {/* ── Skills Section ── */}
        {expert.profile?.skills && expert.profile.skills.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border text-left">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {expert.profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-light text-primary rounded-full text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── About / bio ── */}
        {expert.profile?.bio && (
          <div className="mt-5 pt-5 border-t border-border text-left">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About / Bio</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{expert.profile.bio}</p>
          </div>
        )}
      </div>

      {/* ── Statistics cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            color: "text-success bg-success-light",
          },
          {
            label: "Cancel",
            value: stats.cancel,
            icon: XCircle,
            color: "text-red-500 bg-red-500/10",
          },
          {
            label: "Report",
            value: stats.report,
            icon: AlertTriangle,
            color: "text-warning bg-warning-light",
          },
          {
            label: "Success Rate",
            value: stats.success,
            icon: TrendingUp,
            color: "text-accent bg-accent-light",
          },
          {
            label: "Evaluate",
            value: stats.evaluate,
            icon: Star,
            color: "text-primary bg-primary-light",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border p-4 shadow-sm text-left"
          >
            <div
              className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-2.5`}
            >
              <stat.icon className="w-[18px] h-[18px]" />
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-foreground mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Completed Projects Section ── */}
      <div className="bg-card rounded-xl border border-border p-8 text-left space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Completed Projects
          </h2>
          <span className="px-2.5 py-0.5 bg-success/10 text-success rounded-full text-xs font-semibold">
            {completedProjects.length} Projects
          </span>
        </div>

        {completedProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No completed projects yet.</p>
        ) : (() => {
          const totalPages = Math.max(Math.ceil(completedProjects.length / 5), 1);
          const activePage = currentPage > totalPages ? 1 : currentPage;
          const startIndex = (activePage - 1) * 5;
          const paginatedProjects = completedProjects.slice(startIndex, startIndex + 5);

          return (
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                {paginatedProjects.map((proj, idx) => (
                  <div key={proj.id || idx} className="p-5 bg-secondary/30 rounded-xl border border-border/60 hover:border-brand-primary/40 transition-colors space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-foreground text-base line-clamp-1" title={proj.title}>
                        {proj.title}
                      </h3>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-semibold text-foreground/80">Client:</span>
                        <span>{proj.clientName}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-muted-foreground">
                        <div>
                          <span className="font-semibold text-foreground/80">Category:</span>{" "}
                          <span>{proj.category || "—"}</span>
                        </div>
                        {proj.specialization && (
                          <>
                            <span className="text-border">•</span>
                            <div>
                              <span className="font-semibold text-foreground/80">Specialization:</span>{" "}
                              <span>{proj.specialization}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {proj.skills && proj.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {proj.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-primary-light text-primary rounded-md text-[10px] font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {completedProjects.length > 5 && (
                <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={activePage === 1}
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                    <span>Page</span>
                    <span className="text-foreground">{activePage}</span>
                    <span>of</span>
                    <span className="text-foreground">{totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={activePage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
