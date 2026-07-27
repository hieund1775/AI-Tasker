          placeholder="Describe the issue in detail, timeline of events..."
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
        <label className="block text-sm font-medium text-foreground mb-1">
          Desired Resolution <span className="text-destructive">*</span>
        </label>
        <textarea
          value={desiredResolution}
          onChange={(e) => setDesiredResolution(e.target.value)}
          placeholder="How would you like this to be resolved?"
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
          <label className="block text-sm font-medium text-foreground">
            Evidence <span className="text-destructive">*</span>
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
          <p className="mb-2 text-xs text-destructive">{errors.evidence}</p>
        )}

        {evidence.length === 0 && (
          <div className="border-2 border-dashed border-input rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground/70">
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
                <FileText className="w-5 h-5 text-muted-foreground/70 mt-0.5" />
                <button
                  type="button"
                  onClick={() => removeEvidence(item.id)}
                  className="p-1 text-muted-foreground/70 hover:text-destructive transition"
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
          <strong>Submitted by:</strong> {reporterRole === "client" ? "Client" : "Expert"} •{" "}
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
          className="px-5 py-2.5 border border-input rounded-lg text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 bg-destructive text-primary-foreground rounded-lg text-sm font-medium hover:bg-destructive disabled:opacity-50 inline-flex items-center gap-2 transition"
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
