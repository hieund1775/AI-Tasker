import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  CheckCircle,
  Edit,
  MessageSquare,
  Briefcase,
  User,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { api } from "../../../services/api.js";
import { safeArray, safeNumberFormat } from "../../lib/safety.js";
import { useAuth } from "../../hooks/useAuth.js";
import { notificationService } from "../../../services/notificationHelper.js";

/**
 * PublicExpertProfile — unified expert profile component.
 *
 * Supports three viewer roles:
 *   "client"  — shows Hire/Invite + Send Message buttons
 *   "expert"  — shows Edit Profile button (own profile)
 *   "public"  — no private actions (read-only)
 *
 * Props:
 *   viewerRole   — "client" | "expert" | "public"
 *   expertId     — optional expert ID (for client/public views)
 */

export function PublicExpertProfile({ viewerRole = "public", expertId }) {
  // Resolve expertId from props or URL params
  const { id } = useParams();
  const resolvedId = expertId || id;
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [skillsList, setSkillsList] = useState([]);
  const [openPosts, setOpenPosts] = useState([]);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [interactions, setInteractions] = useState({});
  const [stats, setStats] = useState({
    completed: 0,
    cancel: 0,
    report: 0,
    success: "0",
    evaluate: 0,
  });

  useEffect(() => {
    const initialInteractions = {};
    completedProjects.forEach(proj => {
      try {
        const raw = localStorage.getItem(`review_expert_reply_${proj.id}`);
        if (raw) {
          initialInteractions[proj.id] = JSON.parse(raw);
        }
      } catch (e) {}
    });
    setInteractions(initialInteractions);
  }, [completedProjects]);

  // Helper to read local profile cache as backup for fields not supported by BE DTO yet
  const getLocalProfile = (userId) => {
    try {
      const raw = localStorage.getItem(`aitasker_expert_profile_${userId}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  };

  // Load expert profile
  useEffect(() => {
    let cancelled = false;

    async function fetchExpert() {
      try {
        if (resolvedId) {
          const [apiExpert, reviewData] = await Promise.all([
            api.experts.getById(resolvedId),
            api.reviews.getExpertReviews(resolvedId).catch((e) => {
              console.warn("Failed to load reviews for expert:", e);
              return null;
            })
          ]);
          if (!cancelled && apiExpert) {
            const localCache = getLocalProfile(resolvedId);
            setExpert({
              id: apiExpert.id || resolvedId,
              name: apiExpert.fullName || apiExpert.name,
              title: apiExpert.expertProfile?.jobTitle || apiExpert.specialization || "AI Expert",
              category: apiExpert.expertProfile?.category || apiExpert.category || localCache.category || "",
              specialization: apiExpert.expertProfile?.specialization || apiExpert.expertProfile?.major || apiExpert.specialization || localCache.specialization || "",
              location: apiExpert.expertProfile?.location || apiExpert.location || "Not updated",
              createdAt: apiExpert.createdAt || null,
              rating: (() => {
                let totalRating = 0;
                let ratedCount = 0;
                const tempReviews = (reviewData && reviewData.reviews) ? reviewData.reviews : (apiExpert.clientReviews || []);
                tempReviews.forEach((r) => {
                  const pId = r.projectId || r.id;
                  const rawEdited = pId ? (localStorage.getItem(`project_review_edited_${pId}`) || localStorage.getItem(`project_review_override_${pId}`)) : null;
                  let rVal = 0;
                  if (rawEdited) {
                    try { rVal = JSON.parse(rawEdited).rating || 0; } catch (e) {}
                  }
                  if (rVal > 0) {
                    totalRating += rVal;
                    ratedCount++;
                  } else if (r.rating > 0) {
                    totalRating += r.rating;
                    ratedCount++;
                  }
                });
                return ratedCount > 0 ? Number((totalRating / ratedCount).toFixed(1)) : 5.0;
              })(),
              reviews: reviewData ? reviewData.totalReviews : (apiExpert.reviews || apiExpert.reviewCount || 0),
              completedProjects: apiExpert.completedProjects || 0,
              hourlyRate: apiExpert.expertProfile?.hourlyRate || apiExpert.hourlyRate || localCache.hourlyRate,
              bio: apiExpert.expertProfile?.bio || apiExpert.bio || "",
              skills: apiExpert.expertProfile?.skills?.length ? apiExpert.expertProfile.skills : (apiExpert.skills?.length ? apiExpert.skills : (localCache.skills || [])),
              email: apiExpert.email || "",
              phone: apiExpert.phoneNumber || apiExpert.phone || apiExpert.expertProfile?.phone || "Not updated",
              website: apiExpert.expertProfile?.website || localCache.website || "",
              industry: apiExpert.expertProfile?.industry || localCache.industry || "",
              portfolioUrls: apiExpert.expertProfile?.portfolioUrls || localCache.portfolioUrls || "",
              portfolio: apiExpert.portfolio || [],
              clientReviews: (reviewData && reviewData.reviews)
                ? reviewData.reviews.map((r) => ({
                    projectId: r.projectId,
                    clientName: r.clientName || "Client",
                    rating: r.rating,
                    comment: r.comment || "",
                    date: r.createdAt,
                    expertReply: r.expertReply ? { replyText: r.expertReply, date: r.replyCreatedAt } : null,
                  }))
                : (apiExpert.clientReviews || []).map((r) => ({
                    projectId: r.projectId || r.id,
                    clientName: r.clientName || r.name || "Client",
                    rating: r.rating,
                    comment: r.comment || r.review || "",
                    date: r.date,
                    expertReply: r.expertReply ? { replyText: r.expertReply, date: r.replyCreatedAt } : null,
                  })),
            });

            // Map the completed projects list to display publicly below
            const allProjects = apiExpert.projects || apiExpert.Projects || [];
            const completedList = allProjects.filter((p) => {
              const status = (p.status || p.Status || "").toLowerCase();
              return ["completed", "complete", "resolved"].includes(status);
            });

            const dbReviewsList = reviewData ? (reviewData.reviews || []) : [];

            const detailedCompletedProjects = completedList.map((p) => {
              const pId = p.id || p.Id;
              const clientName = p.clientName || p.ClientName || "Client";
              const specialization = p.specializationName || p.SpecializationName || "";
              const skills = p.projectSkills || p.ProjectSkills || [];
              const category = p.category || p.Category || "";

              const startDateRaw = p.startDate || p.StartDate;
              const endDateRaw = p.endDate || p.EndDate;
              const formatDate = (dateStr) => {
                if (!dateStr) return "";
                try {
                  return new Date(dateStr).toLocaleDateString("vi-VN");
                } catch (e) {
                  return "";
                }
              };

              const startDate = formatDate(startDateRaw);
              const endDate = formatDate(endDateRaw);

              // 1. Original review
              const dbReview = dbReviewsList.find(r => r.projectId === pId);
              let review = null;
              if (dbReview) {
                review = {
                  rating: dbReview.rating,
                  comment: dbReview.comment,
                  createdAt: dbReview.createdAt
                };
              } else {
                const rawReview = localStorage.getItem(`project_review_${pId}`);
                if (rawReview) {
                  try {
                    review = JSON.parse(rawReview);
                  } catch (e) {}
                }
              }

              // 2. Edited review
              let editedReview = null;
              const rawEdited = localStorage.getItem(`project_review_edited_${pId}`) || localStorage.getItem(`project_review_override_${pId}`);
              if (rawEdited) {
                try {
                  editedReview = JSON.parse(rawEdited);
                } catch (e) {}
              }

              return {
                id: pId,
                title: p.title || p.Title || "",
                category: category,
                specialization: specialization,
                skills: skills,
                clientName: clientName,
                review: review,
                editedReview: editedReview,
                startDate: startDate,
                endDate: endDate,
              };
            });

            setCompletedProjects(detailedCompletedProjects);

            // Calculate stats (same as ExpertProfile)
            const cancelCount = allProjects.filter((p) => {
              const status = (p.status || p.Status || "").toLowerCase();
              return ["cancelled", "canceled", "cancel_done", "contract_cancelled", "stopped"].includes(status);
            }).length;
            const reportCount = allProjects.filter((p) => {
              const status = (p.status || p.Status || "").toLowerCase();
              return ["disputed"].includes(status);
            }).length;
            const totalForSuccess = completedList.length + cancelCount + reportCount;
            const successVal = totalForSuccess > 0 ? `${Math.round((completedList.length / totalForSuccess) * 100)}%` : "0%";

            // Calculate evaluate from reviews
            let totalRating = 0;
            let ratedCount = 0;
            completedList.forEach((p) => {
              const pId = p.id || p.Id;
              const rawEdited = localStorage.getItem(`project_review_edited_${pId}`) || localStorage.getItem(`project_review_override_${pId}`);
              let rVal = 0;
              if (rawEdited) {
                try { rVal = JSON.parse(rawEdited).rating || 0; } catch (e) {}
              }
              if (rVal > 0) {
                totalRating += rVal;
                ratedCount++;
              } else {
                const dbReview = dbReviewsList.find(r => r.projectId === pId);
                if (dbReview && dbReview.rating > 0) {
                  totalRating += dbReview.rating;
                  ratedCount++;
                }
              }
            });
            const evaluateVal = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1).replace(".0", "") : "0";

            setStats({
              completed: completedList.length,
              cancel: cancelCount,
              report: reportCount,
              success: successVal,
              evaluate: evaluateVal,
            });

            setCurrentPage(1);
          }
        }
      } catch (err) {
        console.error("Failed to load expert profile:", err);
      }
    }

    fetchExpert().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [resolvedId]);

  const [categoriesList, setCategoriesList] = useState([]);

  // Load skills & categories list to resolve IDs
  useEffect(() => {
    Promise.all([
      api.categoryTags.getSkills().catch(() => []),
      api.categoryTags.getCategories().catch(() => []),
    ]).then(([skills, categories]) => {
      if (Array.isArray(skills)) setSkillsList(skills);
      if (Array.isArray(categories)) setCategoriesList(categories);
    }).catch(err => console.error("Failed to load skills/categories list:", err));
  }, []);

  // Load open client job posts
  useEffect(() => {
    if (viewerRole === "client" && authUser?.id && showInvitePanel) {
      async function loadOpenPosts() {
        try {
          const posts = await api.users.getJobPosts(authUser.id);
          if (Array.isArray(posts)) {
            const filtered = await Promise.all(
              posts.map(async (post) => {
                // Exclude if already accepted / active / completed
                const statusLower = post.status?.toLowerCase() || "";
                if (statusLower === "accepted" || statusLower === "pending_escrow" || statusLower === "pending_pay" || statusLower === "in_progress" || statusLower === "in progress" || statusLower === "active" || statusLower === "completed") {
                  return null;
                }
                return post;
              })
            );
            setOpenPosts(filtered.filter(Boolean));
          }
        } catch (err) {
          console.error("Failed to load client job posts:", err);
        }
      }
      loadOpenPosts();
    }
  }, [viewerRole, authUser, showInvitePanel]);

  const handleInvite = async (project) => {
    try {
      setInviteLoading(true);

      // 1. No need to update JobPost directly since AssignedExpertId doesn't exist on backend.
      // We rely solely on the dummy proposal.

      // 2. Create proposal as a direct invitation (bidAmount = 0)
      const wbsData = project.useCases ? project.useCases.map(uc => ({
        Title: uc.title,
        Duration: uc.originalDurationDays || 1,
        MiniTasks: (uc.requirements || []).map(req => ({
          Title: req.title || "",
          Duration: Number(req.durationDays) || 1
        }))
      })) : [];

      const createdProposal = await api.proposals.create({
        jobPostId: project.id,
        expertId: resolvedId,
        bidAmount: 0,
        estimatedDays: project.deadline || 14,
        introduction: `Hi ${expert.name}, I would like to invite you to collaborate on my project: ${project.title}.`,
        coverLetter: JSON.stringify(wbsData)
      });

      await notificationService.notifyExpertInvited({
        expertUserId: resolvedId,
        clientName: authUser?.fullName || authUser?.name || "Client",
        jobTitle: project.title,
        jobPostId: project.id,
        proposalId: createdProposal?.id || createdProposal?.Id
      });

      // 3. Navigate to client/my-projects details view with inviteSuccess=true
      navigate(`/client/my-projects?projectId=${project.id}&view=details&inviteSuccess=true&expertName=${encodeURIComponent(expert.name || "Expert")}`);
    } catch (err) {
      console.error("Failed to send invitation:", err);
      alert(err.message || "Failed to send invitation. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  const getBackLink = () => {
    const r = authUser?.role?.toLowerCase();
    if (r === "client") return { to: "/client/experts", label: "Back to Experts" };
    if (r === "expert") return { to: "/expert/dashboard", label: "Back to Dashboard" };
    if (r === "admin" || r === "owner" || r === "staff") {
      return { to: `/${r === "staff" ? "admin" : r}/users`, label: "Back to Users" };
    }
    return { to: "/", label: "Back" };
  };

  const backLink = getBackLink();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={backLink.to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {backLink.label}
        </Link>
        <div className="animate-pulse bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-48" />
              <div className="h-4 bg-muted rounded w-32" />
            </div>
          </div>
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={backLink.to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {backLink.label}
        </Link>
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-sm">
          <User className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Expert not found
          </h3>
          <p className="text-sm text-muted-foreground">
            This profile may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const displayName = expert.name || "Expert";
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const resolvedSkills = (expert.skills || []).map(sk => {
    if (typeof sk === "string" && sk.startsWith("skill-")) {
      const match = skillsList.find(s => s.id === sk);
      return match ? match.name : sk;
    }
    return sk;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        to={backLink.to}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {backLink.label}
      </Link>

      <div className={`grid grid-cols-1 ${showInvitePanel ? 'lg:grid-cols-12' : ''} gap-6`}>
        {/* Main Profile Card */}
        <div className={showInvitePanel ? 'lg:col-span-8 space-y-6' : 'w-full space-y-6'}>
          <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              {/* Avatar + Name Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-semibold text-brand-primary">{initials}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
                  <p className="text-muted-foreground text-sm">{expert.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {viewerRole === "client" && (
                  <>
                    <button
                      onClick={() => setShowInvitePanel(!showInvitePanel)}
                      className="px-4 py-2 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" /> Hire / Invite
                    </button>
                    <Link
                      to={`/messenger/${expert.id || resolvedId}`}
                      className="px-4 py-2 border border-input rounded-lg hover:bg-secondary/60 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Send Message
                    </Link>
                  </>
                )}

                {viewerRole === "expert" && (
                  <Link
                    to="/expert/profile/edit"
                    className="px-4 py-2 border border-input rounded-lg hover:bg-secondary/60 text-sm font-medium inline-flex items-center gap-2 transition-colors flex-shrink-0"
                  >
                    <Edit className="w-4 h-4" /> Edit Profile
                  </Link>
                )}
              </div>
            </div>

            {/* Meta details */}
            {(() => {
              // Resolve Category name
              let resolvedCat = expert.category;
              const matchedCat = categoriesList.find(c => c.id === expert.category);
              if (matchedCat) {
                resolvedCat = matchedCat.name;
              }

              // Resolve Specialization name
              let resolvedSpec = expert.specialization;
              for (const cat of categoriesList) {
                const matchedSpec = cat.specializations?.find(s => s.id === expert.specialization);
                if (matchedSpec) {
                  resolvedSpec = matchedSpec.name;
                  break;
                }
              }

              return (
                <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-border/60">
                  {expert.location && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {expert.location}
                    </span>
                  )}
                  {expert.category && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      Category: {resolvedCat}
                    </span>
                  )}
                  {expert.specialization && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      Specialization: {resolvedSpec}
                    </span>
                  )}
                  {expert.createdAt && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Joined {new Date(expert.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {expert.rating != null && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 fill-warning text-warning" />
                      {expert.rating} ({expert.reviews || 0} reviews)
                    </span>
                  )}
                  {expert.hourlyRate != null && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      ${expert.hourlyRate}/hr
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Contact details */}
            {(expert.email || expert.phone || expert.website || expert.industry) && (
              <div className="mt-5 pt-5 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
                {expert.email && (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Email Address:</span> {expert.email}
                  </p>
                )}
                {expert.phone && (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Phone Number:</span> {expert.phone}
                  </p>
                )}
                {expert.website && (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Website:</span>{" "}
                    <a href={expert.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {expert.website}
                    </a>
                  </p>
                )}
                {expert.industry && (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Industry:</span> {expert.industry}
                  </p>
                )}
                {expert.portfolioUrls && (
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Portfolio URL:</span>{" "}
                    <a href={expert.portfolioUrls} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {expert.portfolioUrls}
                    </a>
                  </p>
                )}
              </div>
            )}

          </div>

          {/* Statistics cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              {
                label: "Completed",
                value: stats.completed,
                icon: CheckCircle,
                color: "text-success bg-success-light",
              },
              {
                label: "Cancel",
                value: stats.cancel,
                icon: XCircle,
                color: "text-destructive bg-destructive-light0/10",
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
                <p className="text-xl font-semibold text-foreground mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Skills card */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-6">
            {/* Skills */}
            {resolvedSkills.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {resolvedSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Completed Projects Card for Public View */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-8 mt-6">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-success/10 text-success rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-foreground font-sans">
                  Completed Projects
                </h2>
              </div>
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
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-semibold text-foreground text-base line-clamp-1 flex-1 text-left" title={proj.title}>
                            {proj.title}
                          </h3>
                          {proj.review && (
                            <div className="flex items-center gap-0.5 flex-shrink-0 bg-warning-light/10 px-2.5 py-1 rounded-lg">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < proj.review.rating ? "fill-warning text-warning" : "text-border"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
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
                            {(proj.startDate || proj.endDate) && (
                              <>
                                <span className="text-border">•</span>
                                <div>
                                  <span className="font-semibold text-foreground/80">Duration:</span>{" "}
                                  <span>{proj.startDate || "—"} to {proj.endDate || "—"}</span>
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

                        {proj.review?.comment && (
                          <div className="mt-3 p-3 bg-secondary/50 rounded-xl border border-border/40 text-xs text-muted-foreground relative pl-7 font-sans leading-relaxed text-left">
                            <span className="absolute left-2 text-base text-warning/70 font-semibold select-none leading-none">“</span>
                            {proj.review.comment}
                            {(proj.review.createdAt || proj.review.date) && (
                              <span className="block text-[10px] text-muted-foreground mt-1.5 text-right font-medium">
                                Reviewed on: {new Date(proj.review.createdAt || proj.review.date).toLocaleDateString("en-US")}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Show Expert response */}
                        {interactions[proj.id] && (
                          <div className="space-y-1.5 pl-4 border-l-2 border-brand-primary/20 mt-2">
                            {interactions[proj.id].replyText && (
                              <div className="p-3 bg-brand-primary-light/10 border border-brand-primary/20 rounded-xl text-xs text-foreground font-sans text-left space-y-1">
                                <span className="font-semibold text-brand-primary block">Expert Response (Thank You):</span>
                                <p className="text-muted-foreground">{interactions[proj.id].replyText}</p>
                                <span className="block text-[9px] text-muted-foreground text-right">{new Date(interactions[proj.id].date).toLocaleDateString("vi-VN")}</span>
                              </div>
                            )}
                            {interactions[proj.id].requestRevisionText && (
                              <div className="p-3 bg-warning-light/10 border border-warning/20 rounded-xl text-xs text-foreground font-sans text-left space-y-1">
                                <span className="font-semibold text-warning block">Expert Response & Revision Request:</span>
                                <p className="text-muted-foreground">{interactions[proj.id].requestRevisionText}</p>
                                <span className="block text-[9px] text-muted-foreground text-right">{new Date(interactions[proj.id].date).toLocaleDateString("vi-VN")}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Show Client's Edited Review at the bottom */}
                        {proj.editedReview && (
                          <div className="space-y-2 mt-3 pl-4 border-l-2 border-success/30">
                            {/* Edited Review Divider */}
                            <div className="flex items-center gap-2 py-1">
                              <span className="text-[10px] text-success font-semibold px-2 py-0.5 bg-success/10 rounded border border-success/20">
                                Edited Review
                              </span>
                              <div className="h-px bg-success/20 flex-1" />
                              <div className="flex items-center gap-0.5 bg-warning-light/10 px-2 py-0.5 rounded">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < proj.editedReview.rating ? "fill-warning text-warning" : "text-border"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {proj.editedReview.comment && (
                              <div className="p-3 bg-success/5 border border-success/10 rounded-xl text-xs text-muted-foreground relative pl-7 font-sans leading-relaxed text-left">
                                <span className="absolute left-2 text-base text-success/60 font-semibold select-none leading-none">“</span>
                                {proj.editedReview.comment}
                              </div>
                            )}
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

        {/* Right-hand invite panel */}
        {showInvitePanel && (
          <div className="lg:col-span-4 bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col justify-between h-fit min-h-[400px]">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 pb-2 border-b border-border/60">
                List All Projects
              </h2>
              {openPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No open projects without assigned experts found.
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {openPosts.map((post) => (
                    <div key={post.id} className="border border-border/60 rounded-xl p-3 flex flex-col justify-between gap-3 hover:border-brand-primary/20 transition-colors bg-secondary/50">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{post.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Budget: {safeNumberFormat(post.budget)}</p>
                      </div>
                      <button
                        onClick={() => handleInvite(post)}
                        disabled={inviteLoading}
                        className="w-full py-1.5 px-3 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-border/60">
              <Link
                to="/client/post-project"
                state={{ inviteExpert: expert }}
                className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                + New Post Project
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
