import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  DollarSign,
  Clock,
  MapPin,
  User,
  Tag,
  Send,
  Calendar,
  ArrowLeft,
  Briefcase,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

export function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchJob() {
      setLoading(true);
      setError(null);
      try {
        const project = await api.jobPosts.getById(id);
        if (!project) {
          if (!cancelled) setError("Project not found.");
          return;
        }

        let clientInfo = null;
        if (project.clientId) {
          try {
            const clientUser = await api.users.getById(project.clientId);
            if (clientUser) {
              let parsedStatus = {};
              try {
                parsedStatus = JSON.parse(clientUser.status);
              } catch {
                parsedStatus = { companyName: "", location: "" };
              }
              clientInfo = {
                name: clientUser.fullName || clientUser.name || "Client",
                company: parsedStatus.companyName || "",
                location: parsedStatus.location || "",
              };
            }
          } catch (e) {
            console.error("Failed to load client details:", e);
          }
        }

        let invitationProposal = null;
        let hasSubmittedProp = false;
        if (user && user.role === "expert") {
          try {
            const proposals = await api.proposals.getByJob(project.id);
            invitationProposal = proposals.find(
              (p) => p.expertId === user.id && p.isSubmitted === false && p.status?.toLowerCase() !== "declined"
            );
            hasSubmittedProp = proposals.some(
              (p) => p.expertId === user.id && p.isSubmitted !== false && p.status?.toLowerCase() !== "declined" && p.status?.toLowerCase() !== "withdrawn"
            );
          } catch (e) {
            console.error("Failed to load proposals for job:", e);
          }
        }

        if (!cancelled) {
          setJob({
            ...project,
            client: clientInfo,
          });
          setInvitation(invitationProposal);
          setHasSubmitted(hasSubmittedProp);
        }
      } catch (apiError) {
        if (!cancelled) setError("Failed to load job details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  const handleAcceptInvite = () => {
    navigate(`/expert/jobs/${id}/proposal`);
  };

  const handleDeclineInvite = async () => {
    if (!invitation) return;
    try {
      // 1. Decline proposal invitation in database
      await api.proposals.updateStatus(invitation.id, "declined");

      // 2. Remove assignedExpertId from the job post
      await api.jobPosts.update(id, { assignedExpertId: null });

      alert("Bạn đã từ chối lời mời thành công!");
      setInvitation(null);
      setJob(prev => prev ? { ...prev, assignedExpertId: null, assignedExpert: null } : null);
    } catch (e) {
      console.error("Failed to decline invite:", e);
      alert("Lỗi khi từ chối lời mời. Vui lòng thử lại!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/jobs" className="mb-6">
          Back to Jobs
        </BackButton>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/expert/jobs" className="mb-6">
          Back to Jobs
        </BackButton>
        <div className="bg-white rounded-2xl border border-red-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            {error || "Job not found"}
          </h3>
          <p className="text-sm text-gray-500">
            This job may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const skills = job.jobPostSkills?.map((s) => s.skill?.name) || job.requiredSkills || [];

  const deadlineText = (() => {
    if (!job.deadline) return null;
    const num = Number(job.deadline);
    if (!isNaN(num) && num < 1000) return `${num} days`;
    try {
      return new Date(job.deadline).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(job.deadline);
    }
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/expert/jobs" className="mb-6">
        Back to Jobs
      </BackButton>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-8 space-y-6 text-left">
        {/* Title + Action Button Header */}
        <div className="flex justify-between items-start flex-wrap gap-4 border-b border-gray-100 pb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 truncate">{job.title}</h1>
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary-light text-brand-primary">
              Status: {job.status || "Open"}
            </span>
          </div>

          {user?.role === "expert" && !invitation && (
            <div className="flex-shrink-0">
              {hasSubmitted ? (
                <button
                  disabled
                  className="h-11 px-5 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl font-medium text-[15px] inline-flex items-center gap-2 cursor-not-allowed"
                >
                  <Send className="w-4 h-4" /> Proposal Submitted
                </button>
              ) : user.hasProfile ? (
                <button
                  type="button"
                  onClick={() => navigate(`/expert/jobs/${id}/proposal`)}
                  className="h-11 px-5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover font-medium text-[15px] inline-flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" /> Apply Now
                </button>
              ) : (
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    disabled
                    className="h-11 px-5 bg-gray-200 text-gray-400 rounded-xl font-medium text-[15px] inline-flex items-center gap-2 cursor-not-allowed opacity-60"
                  >
                    <Send className="w-4 h-4" /> Apply Now
                  </button>
                  <span className="text-xs text-red-500 font-medium">
                    Vui lòng{" "}
                    <Link to="/expert/profile/edit" className="underline hover:text-red-700">
                      hoàn thiện Profile
                    </Link>{" "}
                    để ứng tuyển.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {job.description || "No description provided."}
          </p>
        </div>

        {/* Invitation actions */}
        {invitation && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mt-4 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h4 className="text-sm font-bold text-emerald-900">Bạn được mời tham gia dự án này!</h4>
              <p className="text-xs text-emerald-700 mt-1">Vui lòng Chấp nhận (Accept) hoặc Từ chối (Decline) lời mời này.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAcceptInvite}
                className="h-11 px-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleDeclineInvite}
                className="h-11 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Use Cases */}
        {job.useCases && job.useCases.length > 0 && (
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Project Use Cases</h4>
            <div className="space-y-3">
              {job.useCases.map((uc, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-sm text-left">
                  <p className="font-bold text-gray-900">
                    Use Case #{i + 1}: <span className="font-semibold text-gray-700">{uc.nameAndDeadline}</span>
                  </p>
                  <p className="text-gray-600 leading-relaxed pl-3 border-l-2 border-slate-300">
                    {uc.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category & Specialization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</h4>
            <p className="text-sm text-gray-900 font-medium">
              {job.aiCategoryDomain?.name || job.category || "Artificial Intelligence"}
            </p>
          </div>
          {job.specialization && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Specialization / Area of expertise
              </h4>
              <p className="text-sm text-gray-900 font-medium">{job.specialization}</p>
            </div>
          )}
        </div>

        {/* Required Skills */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Required Skills</h4>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No required skills listed.</p>
          )}
        </div>

        {/* Stats Grid: Budget, Deadline, Posted On */}
        <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
          <div>
            <h4 className="text-xs text-gray-400 mb-0.5">Budget</h4>
            <p className="font-semibold text-gray-900">
              <MoneyDisplay amount={job.budget} />
            </p>
          </div>
          <div>
            <h4 className="text-xs text-gray-400 mb-0.5">Deadline</h4>
            <p className="font-semibold text-gray-900">{deadlineText || "—"}</p>
          </div>
          <div>
            <h4 className="text-xs text-gray-400 mb-0.5">Posted On</h4>
            <p className="font-semibold text-gray-900">
              {job.createdAt
                ? new Date(job.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Posted by Client */}
        {job.client && (
          <div className="border-t border-gray-100 pt-6 text-left">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Posted by Client
            </h4>
            <p className="text-sm text-gray-900 font-semibold">
              {job.client.name} {job.client.company ? `(${job.client.company})` : ""}
            </p>
            {job.client.location && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" /> {job.client.location}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

