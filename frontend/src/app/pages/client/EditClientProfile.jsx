import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function EditClientProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [clientId, setClientId] = useState(null);
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    industry: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);

  // ---- Load profile from API on mount ----
  useEffect(() => {
    if (!authUser?.id) return;
    setLoading(true);
    api.users.getById(authUser.id)
      .then((client) => {
        if (client) {
          setClientId(client.id);
          let profile = {};
          try {
            profile = JSON.parse(client.status);
          } catch (e) {
            profile = {
              bio: client.status || "",
            };
          }

          setFormData({
            companyName: profile.companyName || "",
            fullName: client.fullName || client.name || "",
            email: client.email || "",
            phone: profile.phone || "",
            location: profile.location || "",
            website: profile.website || "",
            industry: profile.industry || "",
            bio: profile.bio || "",
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
    setLoading(true);

    try {
      const statusPayload = {
        companyName: formData.companyName.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        website: formData.website.trim(),
        industry: formData.industry.trim(),
        bio: formData.bio.trim(),
      };

      await api.users.update(authUser.id, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        status: JSON.stringify(statusPayload),
      });

      // Update stored user details locally too
      const storedUser = localStorage.getItem("aitasker_user_info");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.name = formData.fullName.trim();
        localStorage.setItem("aitasker_user_info", JSON.stringify(u));
      }

      navigate("/client/profile");
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
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
      <div className="flex items-center gap-4 mb-6">
        <Link to="/client/profile" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6"
      >
        {[
          { key: "companyName", label: "Company Name", type: "text", required: true },
          { key: "fullName", label: "Contact Person", type: "text", required: true },
          { key: "email", label: "Email Address", type: "email", required: true },
          { key: "phone", label: "Phone Number", type: "tel", required: true },
          { key: "location", label: "Location", type: "text" },
          { key: "website", label: "Website", type: "url" },
          { key: "industry", label: "Industry", type: "text" },
        ].map(({ key, label, type, required }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              required={required}
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
            className="h-11 px-5 text-[15px] rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover font-medium inline-flex items-center gap-2 justify-center"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
          <Link
            to="/client/profile"
            className="h-11 px-5 text-[15px] rounded-xl border border-gray-300 hover:bg-gray-50 font-medium inline-flex items-center justify-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
