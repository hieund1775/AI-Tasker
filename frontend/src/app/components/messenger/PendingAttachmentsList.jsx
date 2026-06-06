import { PendingAttachmentItem } from "./PendingAttachmentItem.jsx";

// =============================================================================
// PendingAttachmentsList — row of pending attachment previews above the input.
//
// Props:
//   attachments — array of pending attachment objects
//   onRemove    — callback(attachmentId)
// =============================================================================

export function PendingAttachmentsList({ attachments, onRemove }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="px-4 pb-2 flex flex-wrap gap-2">
      {attachments.map((att) => (
        <PendingAttachmentItem
          key={att.id}
          attachment={att}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
