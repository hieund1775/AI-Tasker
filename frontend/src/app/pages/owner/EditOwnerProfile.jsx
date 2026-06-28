// =============================================================================
// EditOwnerProfile — Edit profile page for Owner role.
//
// Allows the Owner to update their display name, email, title, phone,
// location, and bio in the mock DB.
// =============================================================================

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Save } from "lucide-react";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { listUsers } from "../../../data/mockDatabase.js";

// ---------------------------------------------------------------------------
// Resolve owner user from mock DB
// ---------------------------------------------------------------------------

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

export function EditOwnerProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [ownerId, setOwnerId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);

  // ---- Load profile from mock DB on mount ----
  useEffect(() => {
    const owner = resolveOwner(authUser);
    if (!owner) {
      setLoading(false);
      return;
    }

    setOwnerId(owner.id);
    setFormData({
      fullName: owner.fullName || "",
      email: owner.email || "",
      phone: owner.profile?.phone || "",
      location: owner.profile?.location || "",
      title: owner.profile?.title || "",
      bio: owner.profile?.bio || "",
    });
    setLoading(false);
  }, [authUser]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const owner = resolveOwner(authUser);
    if (!owner) return;

    // Mutate the mock DB object in-place so OwnerProfile sees updates
    owner.fullName = formData.fullName.trim() || owner.fullName;
    owner.email = formData.email.trim() || owner.email;
    if (!owner.profile) owner.profile = {};
    owner.profile.title = formData.title.trim();
    owner.profile.phone = formData.phone.trim();
    owner.profile.location = formData.location.trim();
    owner.profile.bio = formData.bio.trim();

    navigate("/owner/profile");
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="bg-card rounded-2xl border border-border p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/owner/profile" className="mb-4">Back to Profile</BackButton>

      <h1 className="text-2xl font-bold text-foreground mb-6">Edit Owner Profile</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-6"
      >
        {[
          { key: "fullName", label: "Full Name", type: "text" },
          { key: "email", label: "Email Address", type: "email" },
          { key: "title", label: "Job Title", type: "text" },
          { key: "phone", label: "Phone Number", type: "tel" },
          { key: "location", label: "Location", type: "text" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              {label}
            </label>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Bio / About
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="h-11 px-5 text-[15px] rounded-xl bg-yellow-600 text-white hover:bg-yellow-700 font-medium inline-flex items-center gap-2 justify-center"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
          <Link
            to="/owner/profile"
            className="h-11 px-5 text-[15px] rounded-xl border border-input hover:bg-secondary/60 font-medium inline-flex items-center justify-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default EditOwnerProfile;
