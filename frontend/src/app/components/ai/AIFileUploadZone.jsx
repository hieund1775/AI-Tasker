import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image, File } from "lucide-react";

// ── Compact defaults for AI Planner panel ──
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
  if (/\.zip$/.test(name) || type.includes("zip")) return File;
  return File;
}

function getFileColor(file) {
  const type = file.type || "";
  const name = (file.name || "").toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif)$/.test(name))
    return "text-green-500";
  if (type === "application/pdf" || /\.pdf$/.test(name)) return "text-red-500";
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx?$/.test(name)
  )
    return "text-blue-500";
  if (/\.zip$/.test(name) || type.includes("zip")) return "text-amber-500";
  return "text-gray-400";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * AIFileUploadZone — Compact file upload for the AI Planner side panel.
 *
 * Props:
 *   files         — array of File objects
 *   onFilesChange — callback(File[]) when files are added/removed
 *   disabled      — disable interactions while AI is processing
 */
export function AIFileUploadZone({ files = [], onFilesChange, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
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
      {/* Compact drop zone */}
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
            : "border-gray-300 hover:border-brand-primary/50 hover:bg-gray-50"
          }
        `}
      >
        <Upload
          className={`w-6 h-6 mx-auto mb-1.5 ${
            isDragging ? "text-brand-primary" : "text-gray-300"
          }`}
        />
        <p className="text-xs font-semibold text-gray-600">
          Drop files or <span className="text-brand-primary">browse</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          PDF, DOCX, TXT, Images • Requirements
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={DEFAULT_ACCEPT_EXT}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File list — compact */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => (
            <div
              key={`${file.name || "file"}-${file.lastModified || index}-${index}`}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon file={file} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {file.name || "Unknown file"}
                  </p>
                  {file.size > 0 && (
                    <p className="text-[11px] text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="w-6 h-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors inline-flex items-center justify-center flex-shrink-0 ml-1.5"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
