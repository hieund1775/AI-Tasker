// =============================================================================
// ReportForm — dispute report submission form for Expert.
//
// Automatically pulls data from the associated project:
//   - Report name (defaults to project name)
//   - Project ID, Client info, Expert info
//   - Full escrow amount, current project status
//   - Project deadline, start date
//   - Submission time (updated in real time)
//
// Expert must enter:
//   - Report reason
//   - Detailed description
//   - Dispute type
//   - Desired resolution
//   - Upload evidence (at least 1 required)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { formatDateTime } from "../../lib/dateUtils.js";
import { MoneyDisplay } from "../shared/MoneyDisplay.jsx";
import { FileUploadDropzone } from "../shared/FileUploadDropzone.jsx";
import api from "../../../services/api.js";

const DISPUTE_TYPES = [
  { value: "financial", label: "Financial / Payment Dispute" },
  { value: "quality", label: "Work Quality Dispute" },
  { value: "deadline", label: "Deadline Dispute" },
  { value: "scope", label: "Scope of Work Dispute" },
  { value: "overdue", label: "OverDue" },
  { value: "other", label: "Other" },
];

export function ReportForm({
  project,
  onSubmit,
  onCancel,
  loading: externalLoading = false,
  submitLabel = "Submit Report",
  role = "expert",
  isResponse = false,
  initialDisputeType = "",
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [disputeType, setDisputeType] = useState(initialDisputeType || "financial");
  const [desiredResolution, setDesiredResolution] = useState("");
  const [evidence, setEvidence] = useState([]); // { id, name, note, file? }
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitTime, setSubmitTime] = useState(new Date());

  useEffect(() => {
    if (initialDisputeType) {
      setDisputeType(initialDisputeType);
    }
  }, [initialDisputeType]);

  const [clientUser, setClientUser] = useState(null);
  const [expertUser, setExpertUser] = useState(null);

  const isLoading = externalLoading || submitting;

  // Real-time submission time
  useEffect(() => {
    const interval = setInterval(() => setSubmitTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch client & expert details
  useEffect(() => {
    if (!project) return;
    async function fetchUsers() {
      try {
        if (project.clientId) {
          const client = await api.users.getById(project.clientId);
          setClientUser(client);
        }
        if (project.assignedExpertId || project.expertId) {
          const expId = project.assignedExpertId || project.expertId;
          const expert = await api.users.getById(expId);
          setExpertUser(expert);
        }
      } catch (err) {
        console.error("Failed to fetch users in ReportForm:", err);
      }
    }
    fetchUsers();
  }, [project]);

  const validate = useCallback(() => {
    const errs = {};
    if (!reason.trim()) errs.reason = isResponse ? "Please enter response reason." : "Please enter a report reason.";
    if (!description.trim()) errs.description = isResponse ? "Please enter detailed response content." : "Please enter a detailed description.";
    if (!desiredResolution.trim())
      errs.desiredResolution = isResponse ? "Please enter desired resolution." : "Please enter your desired resolution.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [reason, description, desiredResolution, isResponse]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      try {
        await onSubmit?.({
          projectId: project?.projectId || project?.id,
          reportName: projectTitle !== "—" ? projectTitle : (project?.title || ""),
          reason,
          description,
          disputeType,
          desiredResolution,
          evidence,
          submittedAt: new Date().toISOString(),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [validate, onSubmit, project, reason, description, disputeType, desiredResolution, evidence],
  );

  const addEvidence = useCallback(() => {
    setEvidence((prev) => {
      if (prev.length >= 1) return prev;
      return [{ id: Date.now().toString(), name: "", note: "", file: null }];
    });
  }, []);

  const removeEvidence = useCallback((id) => {
    setEvidence((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEvidence = useCallback((id, field, value) => {
    setEvidence((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    );
  }, []);

  if (!project) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Project information not found.
      </div>
    );
  }

  // Pre-calculate display deadline and start date
  const rawStartDate = project.startDate || project.StartDate || project.createdAt || project.CreatedAt;
  const displayStartDate = rawStartDate ? formatDateTime(rawStartDate) : "—";

  const displayDeadline = (() => {
    const rawDeadline = project.endDate || project.EndDate || project.deadline || project.Deadline;
    if (!rawDeadline) return "—";
    const num = Number(rawDeadline);
    if (!Number.isNaN(num) && num < 1000) {
      const d = new Date(rawStartDate || new Date());
      d.setDate(d.getDate() + num);
      return formatDateTime(d.toISOString());
    }
    return formatDateTime(rawDeadline);
  })();

  const clientName =
    clientUser?.fullName ||
    clientUser?.name ||
    project.clientName ||
    (typeof project.client === "string" ? project.client : project.client?.fullName || project.client?.name) ||
    "—";

  const expertName =
    expertUser?.fullName ||
    expertUser?.name ||
    project.expertName ||
    (typeof project.expert === "string" ? project.expert : project.expert?.fullName || project.expert?.name) ||
    "—";

  const projectTitle =
    project.title ||
    project.Title ||
    project.projectTitle ||
    project.ProjectTitle ||
    project.projectName ||
    project.ProjectName ||
    project.name ||
    project.Name ||
    project.reportName ||
    project.ReportName ||
    "—";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---- Auto-filled project info ---- */}
      <div className="bg-secondary/60 rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3">
          Project Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow label="Project Name" value={projectTitle} />
          <InfoRow label="Client" value={clientName} />
          <InfoRow label="Expert" value={expertName} />
          <InfoRow
            label="Funds in Escrow"
            value={<MoneyDisplay amount={project.budget || project.escrowAmount || 0} />}
          />
          <InfoRow label="Status" value={project.status || "—"} />
          <InfoRow label="Start Date" value={displayStartDate} />
          <InfoRow label="Deadline" value={displayDeadline} />
        </div>
      </div>

      {/* ---- Entered fields ---- */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          {isResponse ? "Response Reason" : "Report Reason"} <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isResponse ? "e.g. Deliverable completed but client has not released funds" : "e.g. Client has not paid after project completion"}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
            errors.reason ? "border-destructive/35" : "border-input"
          }`}
          disabled={isLoading}
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-destructive">{errors.reason}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          Dispute Type <span className="text-destructive">*</span>
        </label>
        <select
          value={disputeType}
          onChange={(e) => setDisputeType(e.target.value)}
          className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:border-brand-primary bg-secondary/30 disabled:opacity-80 disabled:cursor-not-allowed"
          disabled={isLoading || isResponse}
        >
          {DISPUTE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          {isResponse ? "Detailed Response Content" : "Detailed Description"} <span className="text-destructive">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isResponse ? "Describe explanation in detail..." : "Describe the issue in detail, timeline of events..."}
          rows={4}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
            errors.description ? "border-destructive/35" : "border-input"
          }`}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-destructive">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          {isResponse ? "Desired Resolution" : "Desired Resolution"} <span className="text-destructive">*</span>
        </label>
        <textarea
          value={desiredResolution}
          onChange={(e) => setDesiredResolution(e.target.value)}
          placeholder={isResponse ? "e.g. Request full payout release from escrow" : "How would you like this to be resolved?"}
          rows={2}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
            errors.desiredResolution ? "border-destructive/35" : "border-input"
          }`}
          disabled={isLoading}
        />
        {errors.desiredResolution && (
          <p className="mt-1 text-xs text-destructive">
            {errors.desiredResolution}
          </p>
        )}
      </div>

      {/* ---- Evidence upload ---- */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground/80">
            {isResponse ? "Documents / Evidence (Max 1 file - Optional)" : "Evidence (Max 1 file - Optional)"}
          </label>
          {evidence.length < 1 && (
            <button
              type="button"
              onClick={addEvidence}
              disabled={isLoading}
              className="text-xs text-brand-primary hover:text-brand-primary-hover font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Add Evidence
            </button>
          )}
        </div>
        {errors.evidence && (
          <p className="mb-2 text-xs text-destructive">{errors.evidence}</p>
        )}

        {evidence.length === 0 && (
          <div className="border-2 border-dashed border-input rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No evidence added yet. Click &quot;Add Evidence&quot; to upload 1 screenshot or document.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="p-3 border border-border rounded-lg bg-secondary/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Evidence Attachment
                </span>
                <button
                  type="button"
                  onClick={() => removeEvidence(item.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <FileUploadDropzone
                files={item.file ? [item.file] : []}
                onFilesChange={(newFiles) => {
                  const f = newFiles[0] || null;
                  setEvidence((prev) =>
                    prev.map((e) =>
                      e.id === item.id
                        ? { ...e, file: f, name: f ? f.name : "" }
                        : e
                    )
                  );
                }}
                multiple={false}
                maxFiles={1}
                disabled={isLoading}
                helperText="Upload 1 image, PDF, DOCX, or TXT"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---- Submission info ---- */}
      <div className="bg-brand-primary-light rounded-xl p-3 border border-brand-primary/20 text-xs text-brand-primary">
        <p>
          <strong>Submitted by:</strong> {role === "client" ? "Client" : "Expert"} •{" "}
          <strong>Submission time:</strong> {formatDateTime(submitTime)}
        </p>
        <p className="mt-1">
          {isResponse ? "This response will be sent to Admin for dispute review." : "This report will be sent to Admin for dispute resolution review."}
        </p>
      </div>

      {/* ---- Actions ---- */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2.5 border border-input rounded-lg text-sm font-medium text-foreground/80 hover:bg-secondary/60 disabled:opacity-50 transition"
        >
          {isResponse ? "Cancel" : "Cancel"}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 bg-destructive text-primary-foreground rounded-lg text-sm font-medium hover:bg-destructive disabled:opacity-50 inline-flex items-center gap-2 transition"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isResponse ? "Submitting Response..." : "Submitting Report..."}
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function InfoRow({ label, value }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export default ReportForm;
