// =============================================================================
// CreateAdmin - Owner-only page to create new Admin accounts.
//
// Uses /api/users/register if backend supports passing role=admin,
// otherwise falls back to ownerService.createAdminAccount() placeholder.
// =============================================================================

import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Loader2, ArrowLeft, Shield, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { createAdminAccount } from "../../../services/ownerService.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [createdAdmin, setCreatedAdmin] = useState(null);

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------
  const validate = useCallback(() => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = "Please enter full name.";
    if (!formData.email.trim()) {
      errs.email = "Please enter email/username.";
    }
    if (!formData.phoneNumber.trim()) {
      errs.phoneNumber = "Please enter phone number.";
    } else if (!/^0[0-9]{9}$/.test(formData.phoneNumber)) {
      errs.phoneNumber = "Invalid format (10 digits, starting with 0).";
    }
    if (!formData.password) {
      errs.password = "Please enter a password.";
    } else if (formData.password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) return;

      setLoading(true);
      setFeedback(null);
      try {
        const result = await createAdminAccount({
          fullName: formData.fullName.trim(),
          username: formData.email.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          password: formData.password,
        });
        setCreatedAdmin(result);
        setFeedback("Admin account created successfully!");
        setFormData({ fullName: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
      } catch (err) {
        setFeedback(err.message || "Error creating Admin account.");
      } finally {
        setLoading(false);
      }
    },
    [formData, validate],
  );

  // -----------------------------------------------------------------------
  // Field update helper
  // -----------------------------------------------------------------------
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/owner/dashboard")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/80 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <PageHeader
        title="Create Admin Account"
        subtitle={`Create a new Admin account to manage disputes and users on the platform.${user?.email ? ` Owner only - ${user.email}` : ""}`}
        illustration={<Shield className="h-28 w-28" />}
      />

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
        {/* Feedback */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              createdAdmin
                ? "bg-success-light border border-success/20 text-success"
                : "bg-destructive-light border border-destructive/20 text-destructive"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="Enter Admin full name"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
                errors.fullName ? "border-destructive/35" : "border-input"
              }`}
              disabled={loading}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="admin@example.com"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
                errors.email ? "border-destructive/35" : "border-input"
              }`}
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Phone Number <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
              placeholder="0912345678"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
                errors.phoneNumber ? "border-destructive/35" : "border-input"
              }`}
              disabled={loading}
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-xs text-destructive">{errors.phoneNumber}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="At least 6 characters"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary pr-10 ${
                  errors.password ? "border-destructive/35" : "border-input"
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              Confirm Password <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
                errors.confirmPassword ? "border-destructive/35" : "border-input"
              }`}
              disabled={loading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Create Admin Account
              </>
            )}
          </button>
        </form>

        {/* After creation */}
        {createdAdmin && (
          <div className="mt-6 pt-6 border-t border-border/60">
            <p className="text-sm text-muted-foreground mb-3">
              Admin account has been created:
            </p>
            <button
              type="button"
              onClick={() => navigate("/owner/manage-admins")}
              className="w-full h-10 border border-accent/25 bg-brand-primary-light text-brand-primary rounded-lg hover:bg-brand-primary-light text-base font-semibold transition"
            >
              View Admin List
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateAdmin;
