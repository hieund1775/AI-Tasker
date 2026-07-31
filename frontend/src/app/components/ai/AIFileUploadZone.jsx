import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image, File as LucideFileIcon } from "lucide-react";
import { getFileSizeErrorMessage, validateUploadFiles } from "../../lib/fileValidation.js";

const DEFAULT_ACCEPT_EXT = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.svg,.zip";

function getFileIcon(file) {
  if (!file) return FileText;
  const type = file.type || "";
  const name = (file.name || "").toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif)$/.test(name))
    return Image;
  if (
    type === "application/pdf" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(pdf|docx?)$/.test(name)
  )
    return FileText;
  if (/\.zip$/.test(name) || type.includes("zip")) return LucideFileIcon;
  return LucideFileIcon;
}

function getFileColor(file) {
  const type = file.type || "";
  const name = (file.name || "").toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif)$/.test(name))
    return "text-success";
  if (type === "application/pdf" || /\.pdf$/.test(name)) return "text-destructive";
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx?$/.test(name)
  )
    return "text-accent";
  if (/\.zip$/.test(name) || type.includes("zip")) return "text-warning";
  return "text-muted-foreground";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * AIFileUploadZone - Compact file upload for the AI Planner side panel.
 *
 * Props:
 *   files         - array of File objects
 *   onFilesChange - callback(File[]) when files are added/removed
 *   disabled      - disable interactions while AI is processing
 */
export function AIFileUploadZone({ files = [], onFilesChange, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState("");
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);

  const canAddMore = true; // no max in AI panel

  const handleDragEnter = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounter.current += 1;
      if (e.dataTransfer.items?.length > 0) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files || []);
      if (droppedFiles.length === 0) return;
      const validation = validateUploadFiles(droppedFiles);
      if (!validation.valid) {
        setSizeError(getFileSizeErrorMessage(validation.oversized[0]));
        return;
      }
      setSizeError("");

      onFilesChange([...files, ...droppedFiles]);
    },
    [disabled, files, onFilesChange],
  );

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;
      const validation = validateUploadFiles(selected);
      if (!validation.valid) {
        setSizeError(getFileSizeErrorMessage(validation.oversized[0]));
        e.target.value = "";
        return;
      }
      setSizeError("");
      onFilesChange([...files, ...selected]);
      e.target.value = "";
    },
    [files, onFilesChange],
  );

  const removeFile = useCallback(
    (index) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange],
  );

  const FileIcon = ({ file }) => {
    const Icon = getFileIcon(file);
    return <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${getFileColor(file)}`} />;
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input always available */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={DEFAULT_ACCEPT_EXT}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Compact drop zone - hidden when files exist */}
      {files.length === 0 && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={disabled ? undefined : handleBrowse}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBrowse();
            }
          }}
          className={`
            relative border-2 border-dashed rounded-xl px-3 py-5 text-center transition-colors
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
            ${isDragging
              ? "border-brand-primary bg-brand-primary-light/30"
              : sizeError
                ? "border-destructive/35 bg-destructive-light"
                : "border-input hover:border-brand-primary/50 hover:bg-secondary/60"
            }
          `}
        >
          <Upload
            className={`w-6 h-6 mx-auto mb-1.5 ${
              isDragging ? "text-brand-primary" : "text-muted-foreground/60"
            }`}
          />
          <p className="text-xs font-semibold text-muted-foreground">
            Drop files or <span className="text-brand-primary">browse</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            PDF, DOCX, TXT, Images - Requirements
          </p>
        </div>
      )}

      {sizeError && (
        <p className="text-[11px] font-medium text-destructive">{sizeError}</p>
      )}

      {/* File list - compact */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={`${file.name || "file"}-${file.lastModified || index}-${index}`}
              className="flex items-center justify-between bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon file={file} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground/80 truncate">
                    {file.name || "Unknown file"}
                  </p>
                  {file.size > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-1.5">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const url = URL.createObjectURL(file);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = file.name || "downloaded-file";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error("Failed to download file:", e);
                    }
                  }}
                  className="w-6 h-6 text-muted-foreground hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors inline-flex items-center justify-center"
                  title="Download file"
                >
                  <Upload className="w-3 h-3 rotate-180" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="w-6 h-6 text-muted-foreground hover:text-destructive hover:bg-destructive-light rounded-md transition-colors inline-flex items-center justify-center"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
