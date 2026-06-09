import { Image, File, FolderOpen, X } from "lucide-react";

// =============================================================================
// PendingAttachmentItem — single pending attachment preview before sending.
//
// Props:
//   attachment — { id, type, name }
//   onRemove   — callback(attachmentId)
// =============================================================================

function attachmentIcon(type) {
  if (type === "image/png") return <Image className="w-4 h-4 text-blue-500" />;
  if (type === "folder") return <FolderOpen className="w-4 h-4 text-amber-500" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

export function PendingAttachmentItem({ attachment, onRemove }) {
  return (
    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
      {attachmentIcon(attachment.type)}
      <span className="text-xs font-medium text-gray-700">{attachment.name}</span>
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="p-0.5 text-gray-400 hover:text-red-500"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
