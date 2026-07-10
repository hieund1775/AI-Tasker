import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  User,
  MapPin,
  Calendar,
  Edit,
  Briefcase,
  CheckCircle2,
  Clock,
  BarChart3,
  FileText,
} from "lucide-react";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";

/**
 * Resolve the client user from auth. Returns the auth user directly.
 * TODO: Connect to real API for full profile data.
 */
function resolveClient(userFromAuth) {
  return userFromAuth || null;
}

export function ClientProfile() {
  const { user: authUser } = useAuth();
  const [client, setClient] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!authUser?.id) return;
      try {
        const [apiUser, allJobPosts, clientProjects] = await Promise.all([
          api.users.getById(authUser.id),
          api.jobPosts.list().catch(() => []),
          api.projects.getByClient(authUser.id).catch(() => []),
        ]);

        if (!cancelled && apiUser) {
          let profile = {};
          try {
            profile = JSON.parse(apiUser.status);
          } catch (e) {
            profile = {
              bio: apiUser.status || "",
            };
          }

          const clientJobs = Array.isArray(allJobPosts) ? allJobPosts.filter(j => j.clientId === authUser.id) : [];
          
          let proposalsCount = 0;
          try {
            const proposalsLists = await Promise.all(
              clientJobs.map(j => api.proposals.getByJob(j.id).catch(() => []))
            );
            proposalsCount = proposalsLists.reduce((sum, list) => sum + (list ? list.length : 0), 0);
          } catch (err) {
            console.error("Failed to load proposals for client stats:", err);
          }

          const c = {
            fullName: apiUser.fullName || apiUser.name || apiUser.email?.split("@")[0] || "User",
            email: apiUser.email,
            createdAt: apiUser.createdAt,
            profile: {
              company: profile.companyName || "",
              phone: profile.phone || "",
              location: profile.location || "",
              website: profile.website || "",
              industry: profile.industry || "",
              bio: profile.bio || "",
            }
          };
          setClient(c);

          const posted = clientJobs.length;
          const active = clientProjects.filter(p => p.status?.toLowerCase() === "inprogress").length;
          const completed = clientProjects.filter(p => p.status?.toLowerCase() === "completed").length;
          const totalSpent = clientProjects.reduce((sum, p) => sum + (p.escrowBalance || 0), 0);

          setStats({ posted, active, completed, proposals: proposalsCount, totalSpent });
        }
      } catch (err) {
        console.error("Failed to load client profile details:", err);
      }
    }

    fetchProfile().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [authUser]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse bg-card rounded-2xl border border-border shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-accent rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 bg-accent rounded w-48" />
              <div className="h-4 bg-accent rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-accent rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Not-found state ----
  if (!client) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
          <User className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">Profile not available</h2>
          <p className="text-base text-muted-foreground mb-4">Complete your profile to get started.</p>
          <Link
            to="/client/profile/edit"
            className="h-11 px-5 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium inline-flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>
      </div>
    );
  }

  // ---- Main render ----
  const displayName = client.fullName || "Client";
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
      <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Avatar + name info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-brand-primary">{initials}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
              {client.profile?.company && (
                <p className="text-secondary-foreground font-medium">{client.profile.company}</p>
              )}
              <p className="text-muted-foreground text-base">{client.email}</p>
            </div>
          </div>

          <Link
            to="/client/profile/edit"
            className="h-11 px-5 border border-input rounded-xl hover:bg-secondary text-[15px] font-medium inline-flex items-center gap-2 transition-colors flex-shrink-0"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>

        {/* ── Profile Information ── */}
        <div className="mt-8 pt-8 border-t border-border-light space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Starred Fields */}
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Company Name *</span>
              <span className="text-sm text-foreground font-semibold">{client.profile?.company || ""}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Contact Person *</span>
              <span className="text-sm text-foreground font-semibold">{displayName || ""}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address *</span>
              <span className="text-sm text-foreground font-semibold">{client.email || ""}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number *</span>
              <span className="text-sm text-foreground font-semibold">{client.profile?.phone || ""}</span>
            </div>
          </div>

          <div className="border-t border-border-light pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Optional Fields */}
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location</span>
              <span className="text-sm text-secondary-foreground font-medium">{client.profile?.location || ""}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Website</span>
              {client.profile?.website ? (
                <a
                  href={client.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-primary hover:underline font-semibold"
                >
                  {client.profile.website}
                </a>
              ) : (
                <span className="text-sm text-secondary-foreground font-medium"></span>
              )}
            </div>
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Industry</span>
              <span className="text-sm text-secondary-foreground font-medium">{client.profile?.industry || ""}</span>
            </div>
          </div>

          <div className="border-t border-border-light pt-6">
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bio / About</span>
              <p className="text-base text-foreground leading-relaxed min-h-[40px] whitespace-pre-wrap">
                {client.profile?.bio || ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Statistics cards ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              label: "Projects Posted",
              value: stats.posted,
              icon: Briefcase,
              color: "text-brand-primary bg-brand-primary-light",
            },
            {
              label: "Active Projects",
              value: stats.active,
              icon: Clock,
              color: "text-warning bg-warning-light",
            },
            {
              label: "Completed",
              value: stats.completed,
              icon: CheckCircle2,
              color: "text-success bg-success-light",
            },
            {
              label: "Proposals Received",
              value: stats.proposals,
              icon: FileText,
              color: "text-chart-4 bg-muted",
            },
            {
              label: "Total Spent",
              value: <MoneyDisplay amount={stats.totalSpent} />,
              icon: BarChart3,
              color: "text-brand-green bg-success-light",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-4 shadow-sm"
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
      )}
    </div>
  );
}
