import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "./useAuth.js";
import api from "../../services/api.js"; // Import API thật

export function useProposalForm() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);

  // 1. Fetch thông tin Project để hiển thị trên Form
  useEffect(() => {
    async function fetchProject() {
      try {
        const p = await api.projects.getById(projectId);
        setProject(p);
        if (p?.client) setClient(p.client);
      } catch (error) {
        console.error("Lỗi lấy thông tin dự án:", error);
      }
    }
    if (projectId) fetchProject();
  }, [projectId]);

  const [form, setForm] = useState({
    proposalTitle: "",
    professionalIntro: "",
    technicalApproach: "",
    timelineMilestones: "",
    dependencies: "",
    bidAmount: 0,
    durationDays: 14,
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [attachments, setAttachments] = useState([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Note: Việc upload file thật cần API xử lý multipart/form-data.
  // Tạm thời giữ logic UI cho file upload.
  const handleAddAttachment = (type) => {
    const demoFiles = {
      image: {
        name: "portfolio-screenshot.png",
        type: "image/png",
        size: "245 KB",
      },
      file: { name: "resume-cv.pdf", type: "application/pdf", size: "1.2 MB" },
      folder: { name: "project-portfolio/", type: "folder", size: "3 files" },
    };
    if (demoFiles[type]) {
      setAttachments((prev) => [
        ...prev,
        { ...demoFiles[type], id: Date.now() },
      ]);
    }
    setShowAttachMenu(false);
  };

  const removeAttachment = (id) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const [submitting, setSubmitting] = useState(false);

  // 2. Submit form nộp Báo giá lên Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        projectId,
        expertId: user?.id,
        proposalTitle: form.proposalTitle.trim(),
        professionalIntro: form.professionalIntro.trim(),
        technicalApproach: form.technicalApproach.trim(),
        timelineMilestones: form.timelineMilestones.trim(),
        dependencies: form.dependencies.trim(),
        bidAmount: Number(form.bidAmount) || 0,
        durationDays: Number(form.durationDays) || 1,
      };

      // GỌI API TẠO PROPOSAL THẬT
      const result = await api.proposals.create(payload);

      alert("Gửi báo giá thành công!");
      // Chuyển hướng tới trang chi tiết proposal vừa tạo
      navigate(`/expert/proposals/${result.id || ""}`);
    } catch (error) {
      alert(error.message || "Gửi báo giá thất bại. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    projectId,
    project,
    client,
    form,
    updateField,
    attachments,
    showAttachMenu,
    setShowAttachMenu,
    handleAddAttachment,
    removeAttachment,
    submitting,
    handleSubmit,
  };
}
