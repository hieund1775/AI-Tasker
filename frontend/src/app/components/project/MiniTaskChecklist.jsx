import { useState, useRef } from "react";
import {
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  Paperclip,
  Upload,
  X,
  ExternalLink,
  Download,
  FileText,
} from "lucide-react";
import { EmptyState } from "../shared/EmptyState.jsx";
import { StatusBadge } from "../shared/StatusBadge.jsx";
import { cn } from "../../lib/utils.js";
import { safeDateTimeFormat } from "../../lib/safety.js";
import { getFileSizeErrorMessage, validateUploadFiles } from "../../lib/fileValidation.js";
import { toast } from "sonner";
import { api, enrichFileUrl } from "../../../services/api.js";

// Helpers for mini-task file resolution and blob downloads
function resolveMiniTaskFile(productFile) {
  if (!productFile) return null;
  let parsed = null;
  if (typeof productFile === "object" && productFile !== null) {
    parsed = productFile;
  } else if (typeof productFile === "string") {
    try {
      parsed = JSON.parse(productFile);
    } catch {
      // Legacy or plain text string
    }
  }

  if (parsed && typeof parsed === "object" && (parsed.url || parsed.path || parsed.fileUrl)) {
    const rawUrl = parsed.url || parsed.path || parsed.fileUrl;
    const cleanUrl = rawUrl.startsWith("http") ? rawUrl : enrichFileUrl(rawUrl);
    const name = parsed.name || parsed.originalName || rawUrl.split("/").pop().split("\\").pop();
    return {
      url: cleanUrl,
      rawUrl: rawUrl,
      name: name,
      size: parsed.size || null,
      type: parsed.type || "",
    };
  }

  const str = String(productFile).trim();
  if (!str) return null;
  const isUrl = str.startsWith("http") || str.startsWith("/") || str.includes("/");
  if (isUrl) {
    const cleanUrl = str.startsWith("http") ? str : enrichFileUrl(str);
    const name = str.split("/").pop().split("\\").pop();
    return {
      url: cleanUrl,
      rawUrl: str,
      name: name,
      size: null,
      type: "",
    };
  }

  return {
    url: null,
    rawUrl: null,
    name: str,
    size: null,
    type: "",
  };
}

async function downloadFileBlob(rawUrl, fileName) {
  if (!rawUrl || rawUrl === "#") return;
  const enriched = rawUrl.startsWith("http") ? rawUrl : enrichFileUrl(rawUrl);
  try {
    const response = await fetch(enriched);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName || enriched.split("/").pop() || "downloaded-file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    window.open(enriched, "_blank");
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// MiniTaskChecklist - reusable mini-task checklist with role-based permissions.
//
// Props:
//   miniTasks     - array of mini task objects
//   editable      - boolean (true for expert, false for client)
//   onToggle      - (taskId, miniTaskId) => void  (only called when editable)
//   onUpdate      - (miniTaskId, updates) => void (new prop for inline edit)
//   compact       - boolean (true for inline card display, false for full detail)
//   emptyMessage  - custom empty message (optional)
//   loading       - boolean, shows skeleton rows
// =============================================================================

export function MiniTaskChecklist({
  miniTasks = [],
  editable = false,
  isClosed = false,
  onToggle,
  onUpdate,
  compact = true,
  emptyMessage,
  loading = false,
}) {
  const isActuallyEditable = editable && !isClosed;
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLink, setEditLink] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFileObj, setExistingFileObj] = useState(null);
  const [fileError, setFileError] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2 rounded-lg bg-secondary"
          >
            <div className="w-4 h-4 rounded bg-muted" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!miniTasks || miniTasks.length === 0) {
    const defaultMessages = {
      expert: "Create mini-tasks to start tracking your work.",
      client: "The expert has not created mini-tasks yet.",
    };
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-muted-foreground italic">
          {emptyMessage || (editable ? defaultMessages.expert : defaultMessages.client)}
        </p>
      </div>
    );
  }

  const completedCount = miniTasks.filter(
    (mt) =>
      (mt.isCompleted === true || mt.status === "done" || mt.status === "completed") &&
      mt.status !== "needs_revision"
  ).length;
  const allComplete = completedCount === miniTasks.length && miniTasks.length > 0;

  const startEditing = (mini) => {
    setEditingId(mini.id);
    setEditTitle(mini.title || "");
    setEditLink(mini.productLink || "");
    const resolved = resolveMiniTaskFile(mini.productFile);
    setExistingFileObj(resolved);
    setSelectedFile(null);
    setFileError("");
  };

  const handleSave = async (miniId) => {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty!");
      return;
    }

    setUploadingFile(true);
    try {
      let finalProductFile = null;

      if (selectedFile) {
        // Upload real file to backend storage
        const formData = new FormData();
        formData.append("file", selectedFile);
        const result = await api.post("/JobPosts/upload-file", formData, { isFormData: true });
        if (result?.url) {
          finalProductFile = JSON.stringify({
            url: result.url,
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
          });
        } else {
          toast.error("File upload failed.");
          setUploadingFile(false);
          return;
        }
      } else if (existingFileObj) {
        finalProductFile = JSON.stringify({
          url: existingFileObj.rawUrl || existingFileObj.url,
          name: existingFileObj.name,
          size: existingFileObj.size,
          type: existingFileObj.type,
        });
      }

      await onUpdate?.(miniId, {
        title: editTitle.trim(),
        productLink: editLink.trim() || null,
        productFile: finalProductFile,
      });

      toast.success("Mini-task updated successfully.");
      setEditingId(null);
      setSelectedFile(null);
      setExistingFileObj(null);
      setFileError("");
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      setTimeout(() => {
        document.getElementById("project-progress")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update mini-task.");
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className={cn("space-y-1", !compact && "space-y-2")}>
      {allComplete && (
        <div className="flex items-center gap-2 text-sm text-success font-medium mb-2 px-1">
          <CheckSquare className="w-4 h-4" />
          All {miniTasks.length} mini-tasks completed
        </div>
      )}
      {miniTasks.map((mini, idx) => {
        const isDone =
          (mini.isCompleted === true ||
            mini.status === "done" ||
            mini.status === "completed") &&
          mini.status !== "needs_revision";
        const needsRevision = mini.status === "needs_revision";
        const isEditingThis = editingId === mini.id;

        return (
          <div
            key={mini.id || idx}
            className={cn(
              "flex items-start gap-3 rounded-lg transition-colors border border-transparent",
              compact ? "p-1.5" : "p-3 hover:bg-secondary/50 rounded-lg",
              editable && !isDone && !isEditingThis && "hover:bg-secondary"
            )}
          >
            {/* Checkbox (only show when not editing) */}
            {!isEditingThis &&
              (isActuallyEditable ? (
                <button
                  type="button"
                  onClick={() => onToggle?.(mini.id)}
                  className={cn(
                    "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    isDone
                      ? "bg-success border-success text-success-foreground"
                      : "border-input hover:border-primary/50"
                  )}
                  title={isDone ? "Mark as incomplete" : "Mark as complete"}
                >
                  {isDone && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ) : (
                <div
                  className={cn(
                    "flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center",
                    isDone
                      ? "bg-success border-success text-success-foreground"
                      : "border-border bg-muted"
                  )}
                >
                  {isDone && (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              ))}

            {/* Content / Edit Form */}
            {isEditingThis ? (
              <div className="flex-1 min-w-0 space-y-3 p-3 bg-secondary rounded-lg border border-border text-left">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Mini-task title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring bg-input-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Product link
                    </label>
                    <input
                      type="text"
                      value={editLink}
                      onChange={(e) => setEditLink(e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full px-3 py-1.5 text-sm border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring bg-input-background"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Attached File
                    </label>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const validation = validateUploadFiles([file]);
                          if (!validation.valid) {
                            const message = getFileSizeErrorMessage(file);
                            toast.error(message);
                            setFileError(message);
                            setSelectedFile(null);
                            e.target.value = "";
                            return;
                          }
                          setFileError("");
                          setSelectedFile(file);
                        }
                      }}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-primary/40 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate block">
                            {selectedFile.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setFileError("");
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive"
                          title="Remove file"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : existingFileObj ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-4 h-4 text-accent shrink-0" />
                          <span className="font-semibold text-foreground truncate block">
                            {existingFileObj.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] px-2 py-0.5 border border-border rounded hover:bg-secondary font-medium"
                          >
                            Change File
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExistingFileObj(null);
                              setFileError("");
                            }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive"
                            title="Remove attachment"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-border hover:border-primary/50 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-card/50"
                      >
                        <Upload className="w-4 h-4 text-primary" />
                        <span>Upload file from computer...</span>
                      </button>
                    )}
                    {fileError && (
                      <p className="mt-1.5 text-xs font-medium text-destructive">
                        {fileError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-2 border-t border-border">
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => {
                      setEditingId(null);
                      setSelectedFile(null);
                      setExistingFileObj(null);
                      setFileError("");
                    }}
                    className="px-2.5 py-1.5 border border-border text-foreground rounded-md hover:bg-secondary font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={uploadingFile}
                    onClick={() => handleSave(mini.id)}
                    className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary-hover font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadingFile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{uploadingFile ? "Uploading..." : "Save"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm",
                    isDone
                      ? "text-muted-foreground"
                      : "text-foreground font-medium"
                  )}
                >
                  {mini.title}
                </span>

                {!compact && mini.estimatedTime && (
                  <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                    Est: {mini.estimatedTime}
                  </p>
                )}

                {/* Deliverables details */}
                {(mini.productLink || mini.productFile) && (() => {
                  const fileInfo = resolveMiniTaskFile(mini.productFile);
                  return (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {mini.productLink && (
                        <a
                          href={mini.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 rounded-md font-medium transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Product link</span>
                        </a>
                      )}

                      {fileInfo && (fileInfo.url || fileInfo.name) && (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-secondary border border-border rounded-md text-foreground">
                          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-semibold truncate max-w-[200px]" title={fileInfo.name}>
                            {fileInfo.name}
                          </span>
                          {fileInfo.url && (
                            <div className="flex items-center gap-1 ml-1 border-l border-border pl-1.5">
                              <button
                                type="button"
                                onClick={() => downloadFileBlob(fileInfo.url, fileInfo.name)}
                                className="inline-flex items-center gap-1 p-1 px-1.5 hover:bg-card rounded text-primary hover:text-primary-hover font-medium transition-colors text-[11px]"
                                title="Download original file"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Revision info */}
                {needsRevision && (
                  <div className="mt-1.5 p-2 bg-warning-light border border-warning/20 rounded-md text-left">
                    <p className="text-sm font-semibold text-warning flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Needs Revision
                    </p>
                    {mini.revisionReason && (
                      <p className="text-sm text-warning mt-0.5">
                        Reason: {mini.revisionReason}
                      </p>
                    )}
                    {mini.revisionRequestedBy && (
                      <p className="text-sm text-warning mt-0.5">
                        Requested by: {mini.revisionRequestedBy}
                      </p>
                    )}
                    {mini.revisionRequestedAt && (
                      <p className="text-sm text-warning/70 mt-0.5 font-mono">
                        {safeDateTimeFormat(mini.revisionRequestedAt, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                )}
                {isDone && mini.completedAt && (
                  <div className="mt-1 text-left">
                    <p className="text-sm text-success">
                      Completed:{" "}
                      <span className="font-mono">
                        {safeDateTimeFormat(mini.completedAt, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                    {mini.completedBy && (
                      <p className="text-sm text-success/70">
                        by {mini.completedBy}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action tag */}
            {!isEditingThis && (
              <div className="flex-shrink-0 flex items-center gap-2">
                {compact && isDone && (
                  <span className="text-sm text-success font-medium">
                    Done
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
