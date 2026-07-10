import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Save } from "lucide-react";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { listUsers } from "../../../data/mockDatabase.js";

// ---------------------------------------------------------------------------
// Resolve admin user from mock DB
// ---------------------------------------------------------------------------
function resolveAdmin(userFromAuth) {
  if (userFromAuth?.email) {
    const found = listUsers().find(
      (u) => u.email === userFromAuth.email && u.role === "admin"
    );
    if (found) return found;
  }
  if (userFromAuth?.id) {
    const found = listUsers().find(
      (u) => u.id === userFromAuth.id && u.role === "admin"
    );
    if (found) return found;
  }
  // Fallback: return demo admin
  return listUsers().find((u) => u.id === "user-002") || null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function EditAdminProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [adminId, setAdminId] = useState(null);
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
    const admin = resolveAdmin(authUser);
    if (!admin) {
      setLoading(false);
      return;
    }

    setAdminId(admin.id);
    setFormData({
      fullName: admin.fullName || "",
      email: admin.email || "",
      phone: admin.profile?.phone || "",
      location: admin.profile?.location || "",
      title: admin.profile?.title || "",
      bio: admin.profile?.bio || "",
    });
    setLoading(false);
  }, [authUser]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const admin = resolveAdmin(authUser);
    if (!admin) return;

    // Mutate the mock DB object in-place so AdminProfile sees updates
    admin.fullName = formData.fullName.trim() || admin.fullName;
    admin.email = formData.email.trim() || admin.email;
    if (!admin.profile) admin.profile = {};
    admin.profile.title = formData.title.trim();
    admin.profile.phone = formData.phone.trim();
    admin.profile.location = formData.location.trim();
    admin.profile.bio = formData.bio.trim();

    navigate("/admin/profile");
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/admin/profile" className="mb-4">Back to Profile</BackButton>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Admin Profile</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6"
      >
        {[
          { key: "fullName", label: "Full Name", type: "text" },
          { key: "email", label: "Email Address", type: "email" },
          { key: "title", label: "Job Title", type: "text" },
          { key: "phone", label: "Phone Number", type: "tel" },
          { key: "location", label: "Location", type: "text" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label}
            </label>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio / About
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover text-base font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/profile")}
            className="h-11 px-5 border border-gray-300 rounded-[14px] hover:bg-gray-50 text-base font-semibold inline-flex items-center gap-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
