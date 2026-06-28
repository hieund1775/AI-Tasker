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

const DISPUTE_TYPES = [
  { value: "financial", label: "Financial / Payment Dispute" },
  { value: "quality", label: "Work Quality Dispute" },
  { value: "deadline", label: "Deadline Dispute" },
  { value: "scope", label: "Scope of Work Dispute" },
  { value: "other", label: "Other" },
];

export function ReportForm({
  project,
  onSubmit,
  onCancel,
  loading: externalLoading = false,
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [disputeType, setDisputeType] = useState("financial");
  const [desiredResolution, setDesiredResolution] = useState("");
  const [evidence, setEvidence] = useState([]); // { id, name, note, file? }
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitTime, setSubmitTime] = useState(new Date());

  const isLoading = externalLoading || submitting;

  // Real-time submission time
  useEffect(() => {
    const interval = setInterval(() => setSubmitTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    if (!reason.trim()) errs.reason = "Please enter a report reason.";
    if (!description.trim()) errs.description = "Please enter a detailed description.";
    if (!desiredResolution.trim())
      errs.desiredResolution = "Please enter your desired resolution.";
    if (evidence.length === 0)
      errs.evidence = "Please upload at least 1 piece of evidence.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [reason, description, desiredResolution, evidence]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) return;
      setSubmitting(true);
      try {
        await onSubmit?.({
          projectId: project?.id,
          reportName: project?.title || "",
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
    setEvidence((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", note: "", file: null },
    ]);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---- Auto-filled project info ---- */}
      <div className="bg-secondary/60 rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3">
          Project Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow label="Project Name" value={project.title || "—"} />
          <InfoRow label="Project ID" value={project.id || "—"} />
          <InfoRow
            label="Client"
            value={project.clientName || project.clientId || "—"}
          />
          <InfoRow
            label="Expert"
            value={project.expertName || project.expertId || "—"}
          />
          <InfoRow
            label="Funds in Escrow"
            value={<MoneyDisplay amount={project.budget || project.escrowAmount || 0} />}
          />
          <InfoRow label="Status" value={project.status || "—"} />
          <InfoRow
            label="Start Date"
            value={
              project.startDate
                ? formatDateTime(project.startDate)
                : "—"
            }
          />
          <InfoRow
            label="Deadline"
            value={
              project.deadline
                ? formatDateTime(project.deadline)
                : "—"
            }
          />
        </div>
      </div>

      {/* ---- Expert-entered fields ---- */}
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          Report Reason <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Client has not paid after project completion"
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary ${
            errors.reason ? "border-red-300" : "border-input"
          }`}
          disabled={isLoading}
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          Dispute Type <span className="text-red-500">*</span>
        </label>
        <select
          value={disputeType}
          onChange={(e) => setDisputeType(e.target.value)}
          className="w-full px-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:border-brand-primary"
          disabled={isLoading}
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
          Detailed Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail, timeline of events..."
          rows={4}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
            errors.description ? "border-red-300" : "border-input"
          }`}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">
          Desired Resolution <span className="text-red-500">*</span>
        </label>
        <textarea
          value={desiredResolution}
          onChange={(e) => setDesiredResolution(e.target.value)}
          placeholder="How would you like this to be resolved?"
          rows={2}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
            errors.desiredResolution ? "border-red-300" : "border-input"
          }`}
          disabled={isLoading}
        />
        {errors.desiredResolution && (
          <p className="mt-1 text-xs text-red-500">
            {errors.desiredResolution}
          </p>
        )}
      </div>

      {/* ---- Evidence upload ---- */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-foreground/80">
            Evidence <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addEvidence}
            disabled={isLoading}
            className="text-xs text-brand-primary hover:text-brand-primary-hover font-medium inline-flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            Add Evidence
          </button>
        </div>
        {errors.evidence && (
          <p className="mb-2 text-xs text-red-500">{errors.evidence}</p>
        )}

        {evidence.length === 0 && (
          <div className="border-2 border-dashed border-input rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No evidence added yet. Click &quot;Add Evidence&quot; to upload
              images, documents, or screenshots.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="p-3 border border-border rounded-lg bg-secondary/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <button
                  type="button"
                  onClick={() => removeEvidence(item.id)}
                  className="p-1 text-muted-foreground hover:text-red-500 transition"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={item.name}
                onChange={(e) =>
                  updateEvidence(item.id, "name", e.target.value)
                }
                placeholder="Evidence name (e.g. Chat screenshot)"
                className="w-full px-3 py-1.5 border border-input rounded text-sm focus:outline-none focus:border-brand-primary"
                disabled={isLoading}
              />

              <FileUploadDropzone
                files={item.file ? [item.file] : []}
                onFilesChange={(newFiles) =>
                  updateEvidence(item.id, "file", newFiles[0] || null)
                }
                multiple={false}
                disabled={isLoading}
                helperText="Upload image, PDF, DOCX, or TXT"
              />

              <input
                type="text"
                value={item.note}
                onChange={(e) =>
                  updateEvidence(item.id, "note", e.target.value)
                }
                placeholder="Note for this evidence (optional)"
                className="w-full px-3 py-1.5 border border-input rounded text-sm focus:outline-none focus:border-brand-primary"
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---- Submission info ---- */}
      <div className="bg-brand-primary-light rounded-xl p-3 border border-brand-primary/20 text-xs text-brand-primary">
        <p>
          <strong>Submitted by:</strong> Expert •{" "}
          <strong>Submission time:</strong> {formatDateTime(submitTime)}
        </p>
        <p className="mt-1">
          This report will be sent to Admin for dispute resolution review.
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
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2 transition"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting Report...
            </>
          ) : (
            "Submit Report"
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
