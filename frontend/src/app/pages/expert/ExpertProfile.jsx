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
  DollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

export function ExpertProfile() {
  const { user: authUser } = useAuth();

  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    earned: 0,
    pending: 0,
    successRate: 0,
  });

  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;

    async function fetchProfile() {
      try {
        setLoading(true);
        const apiUser = await api.users.getById(authUser.id);
        if (!cancelled && apiUser) {
          const profile = apiUser.expertProfile || {};
          
          setExpert({
            fullName: apiUser.fullName || apiUser.name || "Expert",
            email: apiUser.email || "",
            createdAt: apiUser.createdAt,
            profile: {
              category: profile.category || "",
              specialization: profile.specialization || profile.major || "",
              skills: profile.skills || [],
              phone: profile.phone || apiUser.status || "",
              location: profile.location || "",
              website: profile.website || "",
              industry: profile.industry || "",
              bio: profile.bio || "",
              jobTitle: profile.jobTitle || "AI Expert",
              hourlyRate: profile.hourlyRate || 0,
            }
          });

          const allProjects = apiUser.projects || [];
          const active = allProjects.filter(
            (p) => p.status?.toLowerCase() === "in_progress" || p.status?.toLowerCase() === "in progress"
          ).length;
          const completed = allProjects.filter(
            (p) => p.status?.toLowerCase() === "completed" || p.status?.toLowerCase() === "complete"
          ).length;
          
          const totalAssigned = active + completed;
          const successRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
          const earned = apiUser.wallet?.totalEarned || 0;
          const pending = apiUser.wallet?.pendingBalance || 0;

          setStats({ active, completed, earned, pending, successRate });
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
        <div className="animate-pulse bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-500 mb-2">Profile not available</h2>
          <p className="text-base text-gray-400 mb-4">Complete your profile to get started.</p>
          <Link
            to="/expert/profile/edit"
            className="h-11 px-5 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium inline-flex items-center gap-2"
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Avatar + name info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-brand-primary">{initials}</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {expert.profile?.jobTitle && (
                <p className="text-gray-700 font-medium">{expert.profile.jobTitle}</p>
              )}
              <p className="text-gray-500 text-base">{expert.email}</p>
            </div>
          </div>

          <Link
            to="/expert/profile/edit"
            className="h-11 px-5 border border-gray-300 rounded-xl hover:bg-gray-50 text-[15px] font-medium inline-flex items-center gap-2 transition-colors flex-shrink-0"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>

        {/* ── Meta details ── */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-gray-100">
          {expert.profile?.location && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="w-4 h-4 text-gray-400" />
              {expert.profile.location}
            </span>
          )}
          {expert.profile?.category && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Briefcase className="w-4 h-4 text-gray-400" />
              Category: {expert.profile.category}
            </span>
          )}
          {expert.profile?.specialization && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              Specialization: {expert.profile.specialization}
            </span>
          )}
          {expert.profile?.hourlyRate > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-4 h-4 text-gray-400" />
              ${expert.profile.hourlyRate}/hr
            </span>
          )}
          {expert.createdAt && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="w-4 h-4 text-gray-400" />
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
        <div className="mt-8 pt-8 border-t border-gray-100 space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Phone Number *</span>
              <span className="text-sm text-gray-900 font-semibold">{expert.profile?.phone || ""}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Website</span>
              {expert.profile?.website ? (
                <a
                  href={expert.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-primary hover:underline font-semibold"
                >
                  {expert.profile.website}
                </a>
              ) : (
                <span className="text-sm text-gray-700 font-medium"></span>
              )}
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Industry</span>
              <span className="text-sm text-gray-700 font-medium">{expert.profile?.industry || ""}</span>
            </div>
          </div>
        </div>

        {/* ── Skills Section ── */}
        {expert.profile?.skills && expert.profile.skills.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100 text-left">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {expert.profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-brand-primary-light text-brand-primary rounded-full text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── About / bio ── */}
        {expert.profile?.bio && (
          <div className="mt-5 pt-5 border-t border-gray-100 text-left">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">About / Bio</h3>
            <p className="text-base text-gray-600 leading-relaxed">{expert.profile.bio}</p>
          </div>
        )}
      </div>

      {/* ── Statistics cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: "Active Contracts",
            value: stats.active,
            icon: Briefcase,
            color: "text-brand-primary bg-brand-primary-light",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            color: "text-green-600 bg-green-100",
          },
          {
            label: "Success Rate",
            value: `${stats.successRate}%`,
            icon: TrendingUp,
            color: "text-purple-600 bg-purple-100",
          },
          {
            label: "Pending Escrow",
            value: <MoneyDisplay amount={stats.pending} />,
            icon: Clock,
            color: "text-amber-600 bg-amber-100",
          },
          {
            label: "Total Earned",
            value: <MoneyDisplay amount={stats.earned} />,
            icon: DollarSign,
            color: "text-emerald-600 bg-emerald-100",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-left"
          >
            <div
              className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-2.5`}
            >
              <stat.icon className="w-[18px] h-[18px]" />
            </div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
