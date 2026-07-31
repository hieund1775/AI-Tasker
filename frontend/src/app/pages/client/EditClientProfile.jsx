import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { toast } from "sonner";
import { getLocalClientProfile, saveLocalClientProfile } from "../../lib/clientProfileStorage.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function EditClientProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    companyName: "",
    phone: "",
    location: "",
    website: "",
    industry: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- Load profile: API (fullName, email) + localStorage (remaining fields) ----
  useEffect(() => {
    if (!authUser?.id) return;
    setLoading(true);
    api.users.getById(authUser.id)
      .then((client) => {
        if (client) {
          // Safe fields from API
          const apiData = {
            fullName: client.fullName || client.name || "",
            email: client.email || "",
            phone: client.phoneNumber || client.PhoneNumber || "",
          };
          // Profile details from localStorage (phone, location, ...)
          const localProfile = getLocalClientProfile(authUser.id);

          setFormData({
            fullName: apiData.fullName,
            email: localProfile.email || apiData.email,
            companyName: localProfile.companyName || "",
            phone: localProfile.phone || apiData.phone,
            location: localProfile.location || "",
            website: localProfile.website || "",
            industry: localProfile.industry || "",
            bio: localProfile.bio || "",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load client details for editing:", err);
      })
      .finally(() => setLoading(false));
  }, [authUser]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authUser?.id) return;
    setSaving(true);

    try {
      // 1. Save fullName & email to API (safe, does not touch Status column)
      await api.users.update(authUser.id, {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phone.trim(),
      });

      // 2. Save remaining profile fields to localStorage
      saveLocalClientProfile(authUser.id, {
        email: formData.email.trim(),
        companyName: formData.companyName.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        website: formData.website.trim(),
        industry: formData.industry.trim(),
        bio: formData.bio.trim(),
      });

      // 3. Update fullName in auth localStorage
      const storedUser = sessionStorage.getItem("aitasker_user_info") || localStorage.getItem("aitasker_user_info");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.name = formData.fullName.trim();
        u.fullName = formData.fullName.trim();
        u.email = formData.email.trim();
        u.phoneNumber = formData.phone.trim();
        sessionStorage.setItem("aitasker_user_info", JSON.stringify(u));
        if (localStorage.getItem("aitasker_user_info")) {
          localStorage.setItem("aitasker_user_info", JSON.stringify(u));
        }
        window.dispatchEvent(new Event("aitasker_auth_sync"));
      }

      navigate("/client/profile");
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast.error(err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Edit Profile"
        subtitle="Update your client profile information."
        actions={(
          <Link to="/client/profile" className="text-muted-foreground hover:text-foreground" aria-label="Back to profile">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-6"
      >
        {[
          { key: "fullName", label: "Full Name", type: "text", required: true },
          { key: "email", label: "Email Address", type: "email", required: true },
          { key: "companyName", label: "Company Name", type: "text", required: true },
          { key: "phone", label: "Phone Number", type: "tel", required: true, pattern: "^0[0-9]{9}$" },
          { key: "location", label: "Location", type: "text" },
          { key: "website", label: "Website", type: "url" },
          { key: "industry", label: "Industry", type: "text" },
        ].map(({ key, label, type, required, pattern }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              {label} {required && <span className="text-destructive">*</span>}
            </label>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              required={required}
              pattern={pattern}
              title={key === "phone" ? "Use a 10-digit phone number that starts with 0." : undefined}
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
            disabled={saving}
            className="h-10 px-4 text-[15px] rounded-xl bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover font-medium inline-flex items-center gap-2 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link
            to="/client/profile"
            className="h-10 px-4 text-[15px] rounded-xl border border-input hover:bg-secondary/60 font-medium inline-flex items-center justify-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
