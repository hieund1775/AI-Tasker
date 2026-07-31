export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_LABEL = "10 MB";

export function formatUploadFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getOversizedFiles(files, maxBytes = MAX_UPLOAD_FILE_SIZE_BYTES) {
  return Array.from(files || []).filter((file) => file?.size > maxBytes);
}

export function getFileSizeErrorMessage(file) {
  const name = file?.name || "Selected file";
  const size = file?.size ? ` (${formatUploadFileSize(file.size)})` : "";
  return `${name}${size} is larger than ${MAX_UPLOAD_FILE_SIZE_LABEL}. Please remove it and upload another file.`;
}

export function validateUploadFiles(files) {
  const oversized = getOversizedFiles(files);
  if (oversized.length === 0) return { valid: true, oversized };
  return {
    valid: false,
    oversized,
    message: getFileSizeErrorMessage(oversized[0]),
  };
}

export function validateFormDataUploadFiles(formData) {
  if (!(formData instanceof FormData)) return { valid: true, oversized: [] };
  const FileCtor = typeof File !== "undefined" ? File : null;
  if (!FileCtor) return { valid: true, oversized: [] };
  const files = [];
  formData.forEach((value) => {
    if (value instanceof FileCtor) files.push(value);
  });
  return validateUploadFiles(files);
}
