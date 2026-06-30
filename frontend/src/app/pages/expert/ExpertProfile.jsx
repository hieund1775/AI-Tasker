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
            label: "Active Contracts",
            value: stats.active,
            icon: Briefcase,
            color: "text-primary bg-primary-light",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            color: "text-success bg-success-light",
          },
          {
            label: "Success Rate",
            value: `${stats.successRate}%`,
            icon: TrendingUp,
            color: "text-accent bg-accent-light",
          },
          {
            label: "Pending Escrow",
            value: <MoneyDisplay amount={stats.pending} />,
            icon: Clock,
            color: "text-warning bg-warning-light",
          },
          {
            label: "Total Earned",
            value: <MoneyDisplay amount={stats.earned} />,
            icon: BarChart3,
            color: "text-success bg-success-light",
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
    </div>
  );
}
