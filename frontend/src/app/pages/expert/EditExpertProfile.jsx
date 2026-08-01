import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { MoneyInput } from "../../components/shared/MoneyInput.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { toast } from "sonner";

export const getExpertProfileKey = (userId) => `aitasker_expert_profile_${userId}`;

export function getLocalExpertProfile(userId) {
  try {
    const raw = localStorage.getItem(getExpertProfileKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveLocalExpertProfile(userId, data) {
  localStorage.setItem(getExpertProfileKey(userId), JSON.stringify(data));
}

export function EditExpertProfile() {
  const navigate = useNavigate();
  const { user, completeExpertProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    jobTitle: "",
    category: "",
    specialization: "",
    email: "",
    phone: "",
    location: "",
    portfolioUrls: "",
    hourlyRate: "",
    bio: "",
    website: "",
    industry: "",
  });

  const [skills, setSkills] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allSkills, setAllSkills] = useState([]);

  // Fetch category and skill lists
  useEffect(() => {
    api.categoryTags.getCategoriesWithSpecializations().then((res) => setAllCategories(res || [])).catch(() => { });
    api.categoryTags.getSkills().then((res) => setAllSkills(res || [])).catch(() => { });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (user?.hasProfile === false) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phoneNumber || user.phone || "",
      }));
      return;
    }

    setLoading(true);
    api.users.getById(user.id)
      .then((res) => {
        if (res) {
          setFormData({
            name: res.fullName || "",
            email: res.email || "",
            phone: res.phoneNumber || res.status || "",
            jobTitle: res.expertProfile?.jobTitle || "",
            category: res.expertProfile?.category || res.expertProfile?.major || "",
            specialization: res.expertProfile?.specialization || res.expertProfile?.major || "",
            location: res.expertProfile?.location || "",
            portfolioUrls: res.expertProfile?.portfolioUrls || "",
            bio: res.expertProfile?.bio || "",
            hourlyRate: res.expertProfile?.hourlyRate || "",
            website: res.expertProfile?.website || "",
            industry: res.expertProfile?.industry || "",
          });
          if (res.expertProfile?.skills && res.expertProfile.skills.length > 0) {
            setSkills(res.expertProfile.skills);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load expert profile details:", err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const toggleSkill = (skillName) => {
    setSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (skills.length === 0) {
      setError("Please select at least one skill.");
      return;
    }
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      setError("Invalid phone number (must start with 0 and contain 10 digits).");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const apiPayload = {
        jobTitle: formData.jobTitle || "Not updated",
        major: formData.specialization || "Not updated",
        category: formData.category,
        specialization: formData.specialization,
        skills: skills,
        bio: formData.bio || "No introduction yet",
        portfolioUrls: formData.portfolioUrls || "",
        location: formData.location || "Not updated",
        phone: formData.phone,
        hourlyRate: Number(formData.hourlyRate) || 0,
        website: formData.website || "",
        industry: formData.industry || "",
      };

      // Save profile to backend - category, specialization, skills are persisted in the DB
      await Promise.all([
        api.users.update(user.id, {
          fullName: formData.name.trim(),
          email: formData.email.trim(),
          phoneNumber: formData.phone.trim(),
        }),
        completeExpertProfile(apiPayload),
      ]);

      const storedUser = sessionStorage.getItem("aitasker_user_info");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.name = formData.name.trim();
        sessionStorage.setItem("aitasker_user_info", JSON.stringify(u));
      }

      // Save dropped fields to localStorage as fallback
      const localProfile = {
        category: formData.category,
        specialization: formData.specialization,
        skills: skills,
        phone: formData.phone.trim(),
        website: formData.website || "",
        industry: formData.industry || "",
        hourlyRate: Number(formData.hourlyRate) || 0,
      };
      saveLocalExpertProfile(user.id, localProfile);
      // Dispatch custom event to sync with ExpertProfile.jsx
      window.dispatchEvent(new CustomEvent("expert_profile_updated"));

      toast.success("Profile saved successfully.");
      navigate("/expert/profile", { replace: true });
    } catch (err) {
      setError(err.message || "An error occurred while saving. Please try again!");
    } finally {
      setLoading(false);
    }
  };
  const uniqueCategories = Array.from(new Map(allCategories.map(c => [c.name, c])).values());
  const selectedCat = uniqueCategories.find((c) => c.id === formData.category || c.name === formData.category);
  const specializationsList = selectedCat ? Array.from(new Map((selectedCat.specializations || []).map(s => [s.name, s])).values()) : [];
  const uniqueSkills = Array.from(new Map(allSkills.map(s => [s.name, s])).values());

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title={user?.hasProfile === false ? "Complete profile to start" : "Edit Expert Profile"}
        subtitle="Update your expert profile, skills, and service information."
        actions={user?.hasProfile !== false ? (
          <Link
            to="/expert/profile"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-6"
      >
        {error && (
          <div className="p-3 bg-destructive-light text-destructive rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {/* Contact Person */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Contact Person <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            required
          />
        </div>

        {/* Professional Title */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Professional Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formData.jobTitle}
            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
            placeholder="e.g. Senior ML Engineer"
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            required
          />
        </div>

        {/* Category & Specialization Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => {
                const cat = e.target.value;
                setFormData(prev => ({ ...prev, category: cat, specialization: "" }));
                setSkills([]);
              }}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary bg-card"
              required
            >
              <option value="">-- Select Category --</option>
              {uniqueCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Specialization <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.specialization?.name || formData.specialization}
              onChange={(e) => {
                const spec = e.target.value;
                setFormData(prev => ({ ...prev, specialization: spec }));
                setSkills([]);
              }}
              disabled={!formData.category}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary bg-card disabled:bg-secondary/60"
              required
            >
              <option value="">-- Select Specialization --</option>
              {specializationsList.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Skills Selector (Togglable buttons) */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Skills <span className="text-destructive">*</span>
          </label>
          {!formData.category || !formData.specialization ? (
            <p className="text-sm text-muted-foreground">
              Please select a Category and Specialization to see available skills.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select skills that apply to your specialization:</p>
              <div className="flex flex-wrap gap-2">
                {uniqueSkills.map((sk) => {
                  const skName = sk.name;
                  const isSelected = skills.includes(skName);
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => toggleSkill(skName)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${isSelected
                          ? "bg-brand-primary border-brand-primary text-brand-primary-foreground shadow-sm"
                          : "bg-card border-input text-foreground/80 hover:border-brand-primary"
                        }`}
                    >
                      {skName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Email & Phone side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Email Address <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              disabled
              className="w-full px-4 py-2 border border-border bg-secondary/60 text-muted-foreground rounded-lg cursor-not-allowed font-medium outline-none"
              required
            />
          </div>
        </div>

        {/* Location & Website side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. New York, NY"
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="e.g. https://myportfolio.com"
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Industry & Portfolio URL side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g. IT, Software"
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Portfolio URL
            </label>
            <input
              type="url"
              value={formData.portfolioUrls}
              onChange={(e) => setFormData({ ...formData, portfolioUrls: e.target.value })}
              placeholder="e.g. https://github.com/myusername"
              className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Hourly Rate */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Hourly Rate (VND/hr)
          </label>
          <MoneyInput
            min="0"
            value={formData.hourlyRate}
            onValueChange={(value) => setFormData({ ...formData, hourlyRate: value })}
            placeholder="e.g. 500000"
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Bio <span className="text-destructive">*</span>
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            placeholder="Write a brief professional bio..."
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:border-brand-primary"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="h-10 px-4 text-[15px] rounded-xl bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover font-medium inline-flex items-center gap-2 justify-center disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {user?.hasProfile !== false && (
            <Link
              to="/expert/profile"
              className="h-10 px-4 text-[15px] rounded-xl border border-input hover:bg-secondary/60 font-medium inline-flex items-center justify-center"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
