import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { addSessionProposal } from "../lib/proposalStore.js";
import { useAuth } from "./useAuth.js";

// =============================================================================
// useProposalForm — encapsulates form state, attachment handling, and submit
// logic for the SendProposal page.
//
// Kept extractive: only moves logic that already existed in SendProposal.jsx;
// does not add new behaviour or fake data.
// =============================================================================

export function useProposalForm() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---- Fetch project + client info ----
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
    const p = null;
    if (p) {
      setProject(p);
      const c = null;
      if (c) setClient(c);
    }
  }, [projectId]);

  // ---- Form state ----
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

  // ---- Mock attachments ----
  const [attachments, setAttachments] = useState([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const handleAddAttachment = (type) => {
    const demoFiles = {
      image: { name: "portfolio-screenshot.png", type: "image/png", size: "245 KB" },
      file: { name: "resume-cv.pdf", type: "application/pdf", size: "1.2 MB" },
      folder: { name: "project-portfolio/", type: "folder", size: "3 files" },
    };
    const file = demoFiles[type];
    if (file) {
      setAttachments((prev) => [...prev, { ...file, id: Date.now() + Math.random() }]);
    }
    setShowAttachMenu(false);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ---- Submit ----
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const record = addSessionProposal({
      projectId,
      expertId: user?.id || "expert-current",
      proposalTitle: form.proposalTitle.trim(),
      professionalIntro: form.professionalIntro.trim(),
      technicalApproach: form.technicalApproach.trim(),
      timelineMilestones: form.timelineMilestones.trim(),
      dependencies: form.dependencies.trim(),
      bidAmount: Number(form.bidAmount) || 0,
      durationDays: Number(form.durationDays) || 1,
      attachments: [...attachments],
    });

    // Small delay for UX feedback
    setTimeout(() => {
      setSubmitting(false);
      navigate(`/expert/proposals/${record.id}`);
    }, 400);
  };

  return {
    // URL param
    projectId,

    // Fetched data
    project,
    client,

    // Form state
    form,
    updateField,

    // Attachment state
    attachments,
    showAttachMenu,
    setShowAttachMenu,
    handleAddAttachment,
    removeAttachment,

    // Submit
    submitting,
    handleSubmit,
  };
}
