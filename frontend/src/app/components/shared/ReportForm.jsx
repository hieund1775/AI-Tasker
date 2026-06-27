          placeholder="Describe the issue in detail, timeline of events..."
          rows={4}
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
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
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-brand-primary resize-vertical ${
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
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              No evidence added yet. Click &quot;Add Evidence&quot; to upload
              images, documents, or screenshots.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="p-3 border border-gray-200 rounded-lg bg-gray-50/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <button
                  type="button"
                  onClick={() => removeEvidence(item.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition"
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
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand-primary"
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
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand-primary"
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