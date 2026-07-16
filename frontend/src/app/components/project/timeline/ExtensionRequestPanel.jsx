// =============================================================================
// ExtensionRequestPanel — extension request form + status banner.
//
// Props (all optional — only relevant sections render):
//   role                  — "client" | "expert"
//   extensionRequest      — { status, requestedDays, reason, responseNote }
//   showExtensionForm     — boolean
//   extensionDays         — string
//   extensionReason       — string
//   rejectReason          — string
//   submitting            — boolean
//   hasPendingExtension   — boolean
//   onToggleForm          — () => void
//   onExtensionDaysChange — (value: string) => void
//   onExtensionReasonChange — (value: string) => void
//   onRejectReasonChange  — (value: string) => void
//   onSubmitRequest       — () => void
//   onApproveExtension    — () => void
//   onRejectExtension     — () => void
// =============================================================================

export function ExtensionRequestPanel({
  role,
  extensionRequest,
  showExtensionForm,
  extensionDays,
  extensionReason,
  rejectReason,
  submitting,
  hasPendingExtension,
  onToggleForm,
  onExtensionDaysChange,
  onExtensionReasonChange,
  onRejectReasonChange,
  onSubmitRequest,
  onApproveExtension,
  onRejectExtension,
}) {
  // Show nothing if there's no active extension and the form isn't open
  const hasActiveExtension =
    extensionRequest && extensionRequest.status !== "none";

  if (!showExtensionForm && !hasActiveExtension) return null;

  return (
    <>
      {/* Expert: extension request form */}
      {role === "expert" && showExtensionForm && (
        <div className="mb-8 bg-accent-light border border-accent/20 rounded-xl p-6">
          <h3 className="font-semibold text-accent text-lg">
            Request Project Extension
          </h3>
          <div className="grid md:grid-cols-3 gap-4 mt-5">
            <div>
              <label className="block text-sm font-medium text-accent mb-2">
                Days
              </label>
              <input
                type="number"
                min={1}
                value={extensionDays}
                onChange={(event) => onExtensionDaysChange(event.target.value)}
                className="w-full border border-accent/20 rounded-lg px-3 py-2 bg-input-background"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-accent mb-2">
                Reason
              </label>
              <input
                value={extensionReason}
                onChange={(event) => onExtensionReasonChange(event.target.value)}
                placeholder="Explain why you need more time..."
                className="w-full border border-accent/20 rounded-lg px-3 py-2 bg-input-background"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              disabled={
                !extensionReason.trim() ||
                Number(extensionDays) <= 0 ||
                submitting
              }
              onClick={onSubmitRequest}
              className="h-9 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:bg-muted disabled:cursor-not-allowed text-sm font-medium inline-flex items-center justify-center"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={onToggleForm}
              className="h-9 px-4 border border-border rounded-lg hover:bg-secondary text-sm font-medium inline-flex items-center justify-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Extension status banner */}
      {hasActiveExtension && (
        <div
          className={`mb-8 border rounded-xl p-6 ${
            extensionRequest.status === "pending"
              ? "bg-warning-light border-warning/20"
              : extensionRequest.status === "approved"
                ? "bg-success-light border-success/20"
                : "bg-destructive-light border-destructive/20"
          }`}
        >
          <h3 className="font-semibold text-foreground text-lg">
            Project Extension Request
          </h3>
          <p className="text-sm text-muted-foreground mt-3">
            Expert requested +{extensionRequest.requestedDays || 0}{" "}
            days
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Reason: {extensionRequest.reason}
          </p>
          <p className="text-sm font-medium text-foreground mt-3 capitalize">
            Status: {extensionRequest.status}
          </p>

          {extensionRequest.responseNote && (
            <p className="text-sm text-muted-foreground mt-2">
              Response: {extensionRequest.responseNote}
            </p>
          )}

          {role === "client" &&
            extensionRequest.status === "pending" && (
              <div className="mt-5">
                <textarea
                  value={rejectReason}
                  onChange={(event) => onRejectReasonChange(event.target.value)}
                  placeholder="Optional reject reason..."
                  className="w-full border border-input rounded-lg px-3 py-2 min-h-[90px] bg-input-background"
                />
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    type="button"
                    onClick={onApproveExtension}
                    disabled={submitting}
                    className="h-9 px-4 bg-success text-success-foreground rounded-lg hover:bg-success/90 disabled:opacity-50 text-sm font-medium inline-flex items-center justify-center"
                  >
                    {submitting ? "..." : "Approve Extension"}
                  </button>
                  <button
                    type="button"
                    onClick={onRejectExtension}
                    disabled={submitting}
                    className="h-9 px-4 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 text-sm font-medium inline-flex items-center justify-center"
                  >
                    {submitting ? "..." : "Reject Extension"}
                  </button>
                </div>
              </div>
            )}
        </div>
      )}
    </>
  );
}
