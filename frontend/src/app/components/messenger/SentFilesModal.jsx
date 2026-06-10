import { X } from "lucide-react";
import { SentAttachmentItem } from "./SentAttachmentItem.jsx";

// =============================================================================
// SentFilesModal — panel showing all sent attachments.
//
// Props:
//   attachments — array of sent attachment objects
//   onClose     — callback to close the modal
// =============================================================================

export function SentFilesModal({ attachments, onClose }) {
  return (
    <div
      className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg py-3 px-4 z-20 w-[280px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">Sent Files</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {attachments.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">
          No attachments sent yet.
        </p>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {attachments.map((att, idx) => (
            <SentAttachmentItem
              key={att.id || idx}
              attachment={att}
            />
          ))}
        </div>
      )}
    </div>
  );
}
