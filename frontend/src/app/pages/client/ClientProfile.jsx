import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  User,
  Edit,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { buildClientProfileFromUser } from "../../lib/clientProfileStorage.js";

/**
 * Resolve the client user from auth. Returns the auth user directly.
 * TODO: Connect to real API for full profile data.
 */
function resolveClient(userFromAuth) {
  return userFromAuth || null;
}

export function ClientProfile() {
  const { id: paramId } = useParams();
  const { user: authUser } = useAuth();
  
  const targetId = paramId || authUser?.id;
  const isOwnProfile = !paramId || paramId === authUser?.id;

  const [client, setClient] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!targetId) return;
      try {
        const [apiUser, allJobPosts, clientProjects] = await Promise.all([
          api.users.getById(targetId),
          api.jobPosts.list().catch(() => []),
          api.projects.getByClient(targetId).catch(() => []),
        ]);

        if (!cancelled && apiUser) {
          const clientJobs = Array.isArray(allJobPosts) ? allJobPosts.filter(j => j.clientId === targetId) : [];
          
          let proposalsCount = 0;
          try {
            const proposalsLists = await Promise.all(
              clientJobs.map(j => api.proposals.getByJob(j.id).catch(() => []))
            );
            proposalsCount = proposalsLists.reduce((sum, list) => sum + (list ? list.length : 0), 0);
          } catch (err) {
            console.error("Failed to load proposals for client stats:", err);
          }

          const c = buildClientProfileFromUser(apiUser);
          setClient(c);

          const posted = clientJobs.length;
          const active = clientProjects.filter(p => String(p.status || "").toLowerCase().replace(/[\s_-]+/g, "") === "inprogress").length;
          const completed = clientProjects.filter(p => String(p.status || "").toLowerCase().replace(/[\s_-]+/g, "") === "completed").length;
          setStats({ posted, active, completed, proposals: proposalsCount });
        }
      } catch (err) {
        console.error("Failed to load client profile details:", err);
      }
    }

    fetchProfile().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [targetId]);

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
          {isOwnProfile && (
            <Link
              to="/client/profile/edit"
              className="h-10 px-4 bg-brand-primary text-brand-primary-foreground rounded-xl hover:bg-brand-primary-hover text-[15px] font-medium inline-flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit Profile
            </Link>
          )}
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

  const getBackLink = () => {
    const r = authUser?.role?.toLowerCase();
    if (r === "admin" || r === "owner" || r === "staff") {
      return { to: `/${r === "staff" ? "admin" : r}/users`, label: "Back to Users" };
    }
    return { to: "/", label: "Back" };
  };
  const backLink = getBackLink();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {!isOwnProfile && (
        <Link
          to={backLink.to}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> {backLink.label}
        </Link>
      )}
      {/* Profile header */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Avatar + name info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-brand-primary">{initials}</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground text-base">{client.email}</p>
            </div>
          </div>

          {isOwnProfile && (
            <Link
              to="/client/profile/edit"
              className="h-10 px-4 border border-input rounded-xl hover:bg-secondary text-[15px] font-medium inline-flex items-center gap-2 transition-colors flex-shrink-0"
            >
              <Edit className="w-4 h-4" /> Edit Profile
            </Link>
          )}
        </div>

        {/* Profile information */}
        <div className="mt-8 pt-8 border-t border-border-light space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address *</span>
              <span className="text-sm text-foreground font-semibold">{client.email || ""}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number *</span>
              <span className="text-sm text-foreground font-semibold">{client.profile?.phone || ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <p className="text-xl font-semibold text-foreground mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
