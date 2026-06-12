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
import { Loader2, Upload, X, FileText, Image } from "lucide-react";
import { formatDateTime } from "../../lib/dateUtils.js";
import { MoneyDisplay } from "../shared/MoneyDisplay.jsx";

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
      <div className="p-6 text-center text-gray-500">
        Project information not found.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---- Auto-filled project info ---- */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Report Reason <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Client has not paid after project completion"
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-blue-900 ${
            errors.reason ? "border-red-300" : "border-gray-300"
          }`}
          disabled={isLoading}
        />
        {errors.reason && (
          <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dispute Type <span className="text-red-500">*</span>
        </label>
        <select
          value={disputeType}
          onChange={(e) => setDisputeType(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-900"
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Detailed Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail, timeline of events..."
          rows={4}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-blue-900 resize-vertical ${
            errors.description ? "border-red-300" : "border-gray-300"
          }`}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Desired Resolution <span className="text-red-500">*</span>
        </label>
        <textarea
          value={desiredResolution}
          onChange={(e) => setDesiredResolution(e.target.value)}
          placeholder="How would you like this to be resolved?"
          rows={2}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-blue-900 resize-vertical ${
            errors.desiredResolution ? "border-red-300" : "border-gray-300"
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
          <label className="block text-sm font-medium text-gray-700">
            Evidence <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addEvidence}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" />
            Add Evidence
          </button>
        </div>
        {errors.evidence && (
          <p className="mb-2 text-xs text-red-500">{errors.evidence}</p>
        )}

        {evidence.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              No evidence added yet. Click &quot;Add Evidence&quot; to upload
              images, documents, or screenshots.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50/50"
            >
              <div className="flex-shrink-0 mt-1">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    updateEvidence(item.id, "name", e.target.value)
                  }
                  placeholder="Evidence name (e.g. Chat screenshot)"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-900"
                  disabled={isLoading}
                />
                <input
                  type="file"
                  onChange={(e) =>
                    updateEvidence(item.id, "file", e.target.files?.[0] || null)
                  }
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isLoading}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <input
                  type="text"
                  value={item.note}
                  onChange={(e) =>
                    updateEvidence(item.id, "note", e.target.value)
                  }
                  placeholder="Note for this evidence (optional)"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-900"
                  disabled={isLoading}
                />
              </div>
              <button
                type="button"
                onClick={() => removeEvidence(item.id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition"
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Submission info ---- */}
      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-xs text-blue-700">
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
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
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
      <span className="text-gray-500">{label}:</span>{" "}
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default ReportForm;
