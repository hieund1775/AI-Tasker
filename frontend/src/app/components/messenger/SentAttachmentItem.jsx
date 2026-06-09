import { Image, File, FolderOpen } from "lucide-react";

// =============================================================================
// SentAttachmentItem — single row in the sent files modal.
//
// Props:
//   attachment — { type, name, size }
// =============================================================================

function attachmentIcon(type) {
  if (type === "image/png") return <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  if (type === "folder") return <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <File className="w-4 h-4 text-gray-500 flex-shrink-0" />;
}

export function SentAttachmentItem({ attachment }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
      {attachmentIcon(attachment.type)}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-700 truncate">
          {attachment.name}
        </p>
        <p className="text-[10px] text-gray-400">{attachment.size}</p>
      </div>
    </div>
  );
}
