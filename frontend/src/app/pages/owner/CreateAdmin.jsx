// =============================================================================
// CreateAdmin — Owner-only page to create new Admin accounts.
//
// Uses /api/users/register if backend supports passing role=admin,
// otherwise falls back to ownerService.createAdminAccount() placeholder.
// =============================================================================

import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { Loader2, ArrowLeft, Shield, Eye, EyeOff } from "lucide-react";
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
      errs.email = "Please enter email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Invalid email format.";
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
          email: formData.email.trim(),
          password: formData.password,
        });
        setCreatedAdmin(result);
        setFeedback("Admin account created successfully!");
        setFormData({ fullName: "", email: "", password: "", confirmPassword: "" });
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
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/owner/dashboard")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Create Admin Account
            </h1>
            <p className="text-sm text-gray-500">
              Owner only — {user?.email || ""}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Create a new Admin account to manage disputes and users on the platform.
        </p>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              createdAdmin
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="Enter Admin full name"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
                errors.fullName ? "border-red-300" : "border-gray-300"
              }`}
              disabled={loading}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="admin@example.com"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
                errors.email ? "border-red-300" : "border-gray-300"
              }`}
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="At least 6 characters"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary pr-10 ${
                  errors.password ? "border-red-300" : "border-gray-300"
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
                errors.confirmPassword ? "border-red-300" : "border-gray-300"
              }`}
              disabled={loading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 text-base font-semibold inline-flex items-center justify-center gap-2 transition mt-2"
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
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-600 mb-3">
              Admin account has been created:
            </p>
            <button
              type="button"
              onClick={() => navigate("/owner/manage-admins")}
              className="w-full h-11 border border-blue-200 bg-brand-primary-light text-brand-primary rounded-[14px] hover:bg-brand-primary-light text-base font-semibold transition"
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
