import { Eye } from "lucide-react";

// =============================================================================
// AttachmentMenuDropdown — dropdown menu for adding attachments.
//
// Props:
//   options          — array of { key, label, icon: LucideIcon, color }
//   onSelect         — callback(optionKey) when an attachment type is chosen
//   onViewSentFiles  — callback when "View Sent Attachments" is clicked
// =============================================================================

export function AttachmentMenuDropdown({ options, onSelect, onViewSentFiles }) {
  return (
    <div
      className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[210px]"
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onSelect(opt.key)}
          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 inline-flex items-center gap-3 transition-colors"
        >
          <opt.icon className={`w-4 h-4 ${opt.color}`} />
          {opt.label}
        </button>
      ))}
      <div className="border-t border-gray-100 my-1" />
      <button
        type="button"
        onClick={onViewSentFiles}
        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 inline-flex items-center gap-3 transition-colors"
      >
        <Eye className="w-4 h-4 text-green-500" />
        View Sent Attachments
      </button>
    </div>
  );
}
