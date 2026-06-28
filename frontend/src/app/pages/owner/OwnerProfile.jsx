// =============================================================================
// OwnerProfile — View profile page for Owner role.
//
// Shows the Owner's personal information with a link to edit.
// =============================================================================

import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  User,
  MapPin,
  Calendar,
  Edit,
  Shield,
} from "lucide-react";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { listUsers } from "../../../data/mockDatabase.js";

/**
 * Resolve the full owner user object from auth email → mock DB.
 * Falls back to the demo owner ID.
 */
function resolveOwner(userFromAuth) {
  if (userFromAuth?.email) {
    const found = listUsers().find(
      (u) => u.email === userFromAuth.email && u.role === "owner"
    );
    if (found) return found;
  }
  if (userFromAuth?.id) {
    const found = listUsers().find(
      (u) => u.id === userFromAuth.id && u.role === "owner"
    );
    if (found) return found;
  }
  // Fallback: return demo owner
  return listUsers().find((u) => u.id === "user-001") || null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OwnerProfile() {
  const { user: authUser } = useAuth();
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolved = resolveOwner(authUser);
    setOwner(resolved);
    setLoading(false);
  }, [authUser]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse bg-card rounded-2xl border border-border shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded w-48" />
              <div className="h-4 bg-muted rounded w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Not-found state ----
  if (!owner) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton fallback="/owner/dashboard" className="mb-4">Back to Dashboard</BackButton>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center">
          <User className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">Profile not available</h2>
          <p className="text-sm text-muted-foreground mb-4">Complete your profile to get started.</p>
          <Link
            to="/owner/profile/edit"
            className="h-10 px-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium inline-flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>
      </div>
    );
  }

  // ---- Main render ----
  const displayName = owner.fullName || owner.name || "Platform Owner";
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <BackButton fallback="/owner/dashboard" className="mb-2">Back to Dashboard</BackButton>

      {/* ── Profile header card ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Avatar + name info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-yellow-800">{initials}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  Owner
                </span>
              </div>
              {owner.profile?.title && (
                <p className="text-foreground/80 font-medium">{owner.profile.title}</p>
              )}
              <p className="text-muted-foreground text-sm">{owner.email}</p>
            </div>
          </div>

          <Link
            to="/owner/profile/edit"
            className="h-10 px-4 border border-input rounded-lg hover:bg-secondary/60 text-sm font-medium inline-flex items-center gap-2 transition-colors flex-shrink-0"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </Link>
        </div>

        {/* ── Meta details ── */}
        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-border/60">
          {owner.profile?.location && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {owner.profile.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Platform Owner
          </span>
          {owner.createdAt && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Joined{" "}
              {new Date(owner.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {/* ── About / bio ── */}
        {owner.profile?.bio && (
          <div className="mt-5 pt-5 border-t border-border/60">
            <h3 className="text-sm font-semibold text-foreground/80 mb-2">About</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{owner.profile.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerProfile;
