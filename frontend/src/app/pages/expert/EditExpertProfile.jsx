import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router"; // (Lưu ý: react-router-dom nếu bạn dùng bản 6)
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js"; // Lấy hook Auth
import api from "../../../services/api.js";

export function EditExpertProfile() {
  const navigate = useNavigate();
  const { user, completeExpertProfile } = useAuth(); // Lôi cờ và hàm API ra

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Bổ sung các key chuẩn theo Swagger: jobTitle, major, portfolioUrls
  // Các key cũ của bạn (name, email...) vẫn giữ nguyên để không vỡ UI
  const [formData, setFormData] = useState({
    name: "",
    jobTitle: "",
    major: "",
    email: "",
    phone: "",
    location: "",
    portfolioUrls: "",
    hourlyRate: "",
    bio: "",
  });

  const [skills, setSkills] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    if (user?.hasProfile === false) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
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
            phone: res.status || "",
            jobTitle: res.expertProfile?.jobTitle || "",
            major: res.expertProfile?.major || "",
            location: res.expertProfile?.location || "",
            portfolioUrls: res.expertProfile?.portfolioUrls || "",
            bio: res.expertProfile?.bio || "",
            hourlyRate: "",
          });
          if (res.expertProfile?.major) {
            setSkills([res.expertProfile.major]);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load expert profile details:", err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const removeSkill = (skill) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiPayload = {
        jobTitle: formData.jobTitle || "Chưa cập nhật",
        major: formData.major || "Chưa cập nhật",
        bio: formData.bio || "Chưa có giới thiệu",
        portfolioUrls: formData.portfolioUrls || "",
        location: formData.location || "Chưa cập nhật",
      };

      await Promise.all([
        api.users.update(user.id, { fullName: formData.name.trim() }),
        completeExpertProfile(apiPayload),
      ]);

      const storedUser = localStorage.getItem("aitasker_user_info");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        u.name = formData.name.trim();
        localStorage.setItem("aitasker_user_info", JSON.stringify(u));
      }

      alert("Hồ sơ đã được lưu thành công!");
      navigate("/expert/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi lưu. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        {/* Nút Back: Nếu chưa có profile thì không cho back, bắt buộc phải điền */}
        {user?.hasProfile !== false && (
          <Link
            to="/expert/profile"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}

        {/* Đổi Title linh hoạt theo trạng thái */}
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.hasProfile === false
            ? "Hoàn thiện hồ sơ để bắt đầu"
            : "Edit Expert Profile"}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6"
      >
        {/* Hiển thị lỗi nếu API trả về */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Mảng render input đã được chèn thêm các trường Swagger yêu cầu */}
        {[
          { key: "name", label: "Full Name" },
          { key: "jobTitle", label: "Professional Title" }, // Thay title -> jobTitle
          { key: "major", label: "Major / Specialization" }, // Thêm major
          { key: "email", label: "Email Address" },
          { key: "phone", label: "Phone Number" },
          { key: "location", label: "Location" },
          { key: "portfolioUrls", label: "Portfolio URL" }, // Thêm portfolioUrls
          { key: "hourlyRate", label: "Hourly Rate (USD)" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label}
            </label>
            <input
              type="text"
              value={formData[key]}
              onChange={(e) =>
                setFormData({ ...formData, [key]: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
              required={
                ["jobTitle", "major", "location"].includes(key) &&
                user?.hasProfile === false
              } // Bắt buộc nhập mấy trường này nếu là lần đầu
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            required={user?.hasProfile === false}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Skills
          </label>
          {skills.length === 0 ? (
            <p className="text-sm text-gray-400">
              No skills added. Add skills to improve your profile visibility.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm inline-flex items-center gap-2"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />{" "}
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {/* Ẩn nút Cancel nếu đang bị bắt buộc tạo profile */}
          {user?.hasProfile !== false && (
            <Link
              to="/expert/profile"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
