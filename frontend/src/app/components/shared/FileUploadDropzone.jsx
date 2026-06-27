import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image, File, AlertCircle } from "lucide-react";

// ── Default accepted file types ──
const DEFAULT_ACCEPT_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/zip",
  "application/x-zip-compressed",
].join(",");

const DEFAULT_ACCEPT_EXT = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.svg,.zip";

// ── Type icon helpers ──
function getFileIcon(file) {
  if (!file) return FileText;
  const type = file.type || "";
  const name = (file.name || "").toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif)$/.test(name))
    return Image;
  if (
    type === "application/pdf" ||
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
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
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
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
 * FileUploadDropzone — Reusable drag & drop + browse file upload.
 *
 * Props:
 *   files       — array of File objects currently selected
 *   onFilesChange — callback(File[]) when files are added or removed
 *   disabled    — disable all interactions
 *   multiple    — allow multiple files (default true)
 *   accept      — accepted MIME types / extensions (default: PDF, DOCX, TXT, images, ZIP)
 *   maxFiles    — optional cap on total files
 *   error       — optional error message string (displays red border + text)
 *   label       — optional section label above the dropzone
 *   helperText  — optional description below the dropzone
 */
export function FileUploadDropzone({
  files = [],
  onFilesChange,
  disabled = false,
  multiple = true,
  accept,
  maxFiles,
  error,
  label,
  helperText,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);

  const acceptMime = accept || DEFAULT_ACCEPT_MIME;
  const acceptExt = accept || DEFAULT_ACCEPT_EXT;

  // Extract extensions for the input accept attribute
  const inputAccept = acceptExt.includes(",")
    ? acceptExt
    : accept || DEFAULT_ACCEPT_EXT;

  const canAddMore =
    !maxFiles || files.length < maxFiles;

  // ── Drag handlers ──
  const handleDragEnter = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled || !canAddMore) return;
      dragCounter.current += 1;
      if (e.dataTransfer.items?.length > 0) setIsDragging(true);
    },
    [disabled, canAddMore],
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
      if (disabled || !canAddMore) return;

      const droppedFiles = Array.from(e.dataTransfer.files || []);
      if (droppedFiles.length === 0) return;

      if (multiple) {
        const combined = [...files, ...droppedFiles];
        onFilesChange(maxFiles ? combined.slice(0, maxFiles) : combined);
      } else {
        onFilesChange([droppedFiles[0]]);
      }
    },
    [disabled, canAddMore, files, multiple, maxFiles, onFilesChange],
  );

  // ── Browse ──
  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length === 0) return;

      if (multiple) {
        const combined = [...files, ...selected];
        onFilesChange(maxFiles ? combined.slice(0, maxFiles) : combined);
      } else {
        onFilesChange([selected[0]]);
      }

      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [files, multiple, maxFiles, onFilesChange],
  );

  // ── Remove ──
  const removeFile = useCallback(
    (index) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange],
  );

  // ── Render ──
  const FileIcon = ({ file }) => {
    const Icon = getFileIcon(file);
    return <Icon className={`w-4 h-4 flex-shrink-0 ${getFileColor(file)}`} />;
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-gray-800">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={disabled || !canAddMore ? undefined : handleBrowse}
        role="button"
        tabIndex={disabled || !canAddMore ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowse();
          }
        }}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
          ${disabled || !canAddMore ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          ${isDragging
            ? "border-brand-primary bg-brand-primary-light/30"
            : error
              ? "border-red-300 bg-red-50/20"
              : "border-gray-300 hover:border-brand-primary/50 hover:bg-gray-50"
          }
        `}
      >
        <Upload
          className={`w-8 h-8 mx-auto mb-2 ${
            isDragging ? "text-brand-primary" : error ? "text-red-300" : "text-gray-300"
          }`}
        />
        <p className="text-sm font-semibold text-gray-700">
          Drag &amp; Drop files here
        </p>
        <p className="text-xs text-gray-400 mt-1">or</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleBrowse();
          }}
          disabled={disabled || !canAddMore}
          className="mt-2 h-10 min-h-10 px-4 bg-white border border-gray-300 rounded-[14px] text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          Browse Files
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={inputAccept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || !canAddMore}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className="text-xs text-gray-400">{helperText}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name || "file"}-${file.lastModified || index}-${index}`}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileIcon file={file} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name || "Unknown file"}
                  </p>
                  {file.size > 0 && (
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[8px] transition-colors inline-flex items-center justify-center flex-shrink-0 ml-2"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Max files note */}
      {maxFiles && files.length >= maxFiles && (
        <p className="text-xs text-gray-400">
          Maximum {maxFiles} file{maxFiles > 1 ? "s" : ""} reached.
        </p>
      )}
    </div>
  );
}

export default FileUploadDropzone;
