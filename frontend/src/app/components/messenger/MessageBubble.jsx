import { Image, File, FolderOpen, Download } from "lucide-react";

// =============================================================================
// MessageBubble — single message bubble in the chat area.
//
// Props:
//   message — { id, isOwn, text, attachment?, time }
//             attachment shape: { type, name, size }
// =============================================================================

export function MessageBubble({ message }) {
  return (
    <div
      className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
          message.isOwn
            ? "bg-blue-900 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        }`}
      >
        {/* Attachment display */}
        {message.attachment && (
          <div
            className={`mb-2 p-2 rounded-lg flex items-center gap-2 ${
              message.isOwn ? "bg-blue-800" : "bg-gray-200"
            }`}
          >
            {message.attachment.type === "image/png" ? (
              <Image className="w-5 h-5 flex-shrink-0" />
            ) : message.attachment.type === "folder" ? (
              <FolderOpen className="w-5 h-5 flex-shrink-0" />
            ) : (
              <File className="w-5 h-5 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {message.attachment.name}
              </p>
              <p className="text-[10px] opacity-70">
                {message.attachment.size}
              </p>
            </div>
            <Download className="w-4 h-4 flex-shrink-0 opacity-70 cursor-pointer" />
          </div>
        )}

        {/* Text */}
        {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}

        {/* Time */}
        <p
          className={`text-[10px] mt-1.5 ${
            message.isOwn ? "text-blue-200" : "text-gray-400"
          }`}
        >
          {message.time}
        </p>
      </div>
    </div>
  );
}
