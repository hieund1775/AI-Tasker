import { enrichFileUrl, cleanFileName } from "../../services/api.js";

/**
 * Universal file download utility for AI-Tasker.
 * Automatically enriches URLs, attaches JWT authentication headers,
 * checks response status to prevent downloading corrupted 0-byte error files,
 * and falls back safely to direct tab opening if necessary.
 *
 * @param {string} rawUrl - The raw file URL or path
 * @param {string} [fileName] - Optional display filename for the saved file
 */
export async function downloadFile(rawUrl, fileName) {
  if (!rawUrl || rawUrl === "#") return;

  const getToken = () =>
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("jwt") ||
    localStorage.getItem("token") ||
    "";

  const cleanUrl = String(rawUrl).trim();
  const enrichedUrl = cleanUrl.startsWith("http") ? cleanUrl : enrichFileUrl(cleanUrl);
  const urlExtracted = cleanUrl.split("?")[0].split("/").pop().split("\\").pop() || "downloaded_file";
  const candidate = (fileName && fileName !== "#" && fileName !== "downloaded_file") ? fileName : urlExtracted;
  const cleanName = cleanFileName(candidate);

  try {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(enrichedUrl, { headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    // If response is HTML error page instead of actual file, fallback to window.open
    if (contentType.includes("text/html") && !cleanName.toLowerCase().endsWith(".html")) {
      window.open(enrichedUrl, "_blank");
      return;
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      window.open(enrichedUrl, "_blank");
      return;
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
  } catch (err) {
    console.warn("Blob download failed, opening directly in new tab:", err);
    window.open(enrichedUrl, "_blank");
  }
}

export default downloadFile;
