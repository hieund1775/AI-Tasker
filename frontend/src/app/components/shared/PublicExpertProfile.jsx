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
} from "lucide-react";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

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

  // Load expert profile
  useEffect(() => {
    let cancelled = false;

    async function fetchExpert() {
      try {
        if (resolvedId) {
          const apiExpert = await api.experts.getById(resolvedId);
          if (!cancelled && apiExpert) {
            setExpert({
              id: apiExpert.id || resolvedId,
              name: apiExpert.fullName || apiExpert.name,
              title: apiExpert.expertProfile?.jobTitle || apiExpert.specialization || "AI Expert",
              category: apiExpert.expertProfile?.category || apiExpert.category || "",
              specialization: apiExpert.expertProfile?.specialization || apiExpert.expertProfile?.major || apiExpert.specialization || "",
              location: apiExpert.expertProfile?.location || apiExpert.location || "Chưa cập nhật",
              rating: apiExpert.rating || 5.0,
              reviews: apiExpert.reviews || apiExpert.reviewCount || 0,
              completedProjects: apiExpert.completedProjects || 0,
              hourlyRate: apiExpert.expertProfile?.hourlyRate || apiExpert.hourlyRate,
              bio: apiExpert.expertProfile?.bio || apiExpert.bio || "",
              skills: apiExpert.expertProfile?.skills || apiExpert.skills || [],
              email: apiExpert.email || "",
              phone: apiExpert.expertProfile?.phone || apiExpert.phone || apiExpert.status || "",
              portfolio: apiExpert.portfolio || [],
              clientReviews: (apiExpert.clientReviews || []).map((r) => ({
                clientName: r.clientName || r.name || "Client",
                rating: r.rating,
                comment: r.comment || r.review,
                date: r.date,
              })),
            });
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

  // Load skills list to resolve IDs
  useEffect(() => {
    api.get("/category-tags/skills")
      .then(res => {
        if (Array.isArray(res)) setSkillsList(res);
      })
      .catch(err => console.error("Failed to load skills list:", err));
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

      // 1. Assign expert to the job post directly in the database
      await api.jobPosts.update(project.id, {
        assignedExpertId: resolvedId,
      });

      // 2. Create proposal with isSubmitted: false to invoke client invitation flow
      const coverLetterObj = {
        proposalTitle: `Invitation to ${expert.name}`,
        professionalIntro: `Hi ${expert.name}, I would like to invite you to collaborate on my project: ${project.title}.`,
        technicalApproach: "Client invitation",
        timelineMilestones: "",
        dependencies: "",
        durationDays: 30,
        attachments: [],
      };
      await api.proposals.create({
        jobPostId: project.id,
        expertId: resolvedId,
        bidAmount: 0,
        coverLetter: JSON.stringify(coverLetterObj),
        isSubmitted: false,
      });

      // 3. Navigate to client/my-projects details view with inviteSuccess=true
      navigate(`/client/my-projects?projectId=${project.id}&view=details&inviteSuccess=true`);
    } catch (err) {
      console.error("Failed to send invitation:", err);
      alert(err.message || "Failed to send invitation. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  const getBackLink = () => {
    switch (viewerRole) {
      case "client":
        return { to: "/client/experts", label: "Back to Experts" };
      case "expert":
        return { to: "/expert/dashboard", label: "Back to Dashboard" };
      default:
        return { to: "/", label: "Back" };
    }
  };

  const backLink = getBackLink();

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={backLink.to}
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {backLink.label}
        </Link>
        <div className="animate-pulse bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          </div>
          <div className="h-20 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={backLink.to}
          className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {backLink.label}
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            Expert not found
          </h3>
          <p className="text-sm text-gray-400">
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
        className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> {backLink.label}
      </Link>

      <div className={`grid grid-cols-1 ${showInvitePanel ? 'lg:grid-cols-12' : ''} gap-6`}>
        {/* Main Profile Card */}
        <div className={showInvitePanel ? 'lg:col-span-8 space-y-6' : 'w-full space-y-6'}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              {/* Avatar + Name Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-brand-primary">{initials}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                  <p className="text-gray-700 font-medium">{expert.title}</p>
                  <p className="text-gray-500 text-sm">{expert.email}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {viewerRole === "client" && (
                  <>
                    <button
                      onClick={() => setShowInvitePanel(!showInvitePanel)}
                      className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" /> Hire / Invite
                    </button>
                    <Link
                      to={`/messenger/${expert.id || resolvedId}`}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" /> Send Message
                    </Link>
                  </>
                )}

                {viewerRole === "expert" && (
                  <Link
                    to="/expert/profile/edit"
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium inline-flex items-center gap-2 transition-colors flex-shrink-0"
                  >
                    <Edit className="w-4 h-4" /> Edit Profile
                  </Link>
                )}
              </div>
            </div>

            {/* Meta details */}
            <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-gray-100">
              {expert.location && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {expert.location}
                </span>
              )}
              {expert.category && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  Category: {expert.category}
                </span>
              )}
              {expert.specialization && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  Specialization: {expert.specialization}
                </span>
              )}
              {expert.rating != null && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {expert.rating} ({expert.reviews || 0} reviews)
                </span>
              )}
              {expert.hourlyRate != null && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                  <Clock className="w-4 h-4 text-gray-400" />
                  ${expert.hourlyRate}/hr
                </span>
              )}
            </div>

            {/* Contact details */}
            {(expert.email || expert.phone) && (
              <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
                {expert.email && (
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-700">Email Address:</span> {expert.email}
                  </p>
                )}
                {expert.phone && (
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-700">Phone Number:</span> {expert.phone}
                  </p>
                )}
              </div>
            )}

            {/* Bio */}
            {expert.bio && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">About</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{expert.bio}</p>
              </div>
            )}
          </div>

          {/* Detailed sections card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
            {/* Skills */}
            {resolvedSkills.length > 0 && (
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
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

            {/* Portfolio */}
            {expert.portfolio?.length > 0 && (
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">Portfolio</h3>
                <div className="grid gap-3">
                  {expert.portfolio.map((item, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors"
                    >
                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Client Reviews */}
            {expert.clientReviews?.length > 0 && (
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Client Reviews ({expert.clientReviews.length})
                </h3>
                <div className="space-y-3">
                  {expert.clientReviews.map((review, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {review.clientName}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: review.rating || 0 }, (_, j) => (
                            <Star
                              key={j}
                              className="w-4 h-4 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                      {review.date && (
                        <p className="text-xs text-gray-400 mt-1">{review.date}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right-hand invite panel */}
        {showInvitePanel && (
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col justify-between h-fit min-h-[400px]">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                List All Projects
              </h2>
              {openPosts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No open projects without assigned experts found.
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {openPosts.map((post) => (
                    <div key={post.id} className="border border-gray-100 rounded-xl p-3 flex flex-col justify-between gap-3 hover:border-brand-primary/20 transition-colors bg-gray-50/50">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{post.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">Budget: {post.budget?.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleInvite(post)}
                        disabled={inviteLoading}
                        className="w-full py-1.5 px-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100">
              <Link
                to="/client/post-project"
                state={{ inviteExpert: expert }}
                className="w-full py-2.5 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
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
