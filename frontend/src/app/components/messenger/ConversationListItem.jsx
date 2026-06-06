// =============================================================================
// ConversationListItem — single item in the conversation sidebar list.
//
// Props:
//   conversation — { id, name, lastMessage }
//   isActive     — whether this conversation is currently selected
//   onClick      — callback when the item is clicked
// =============================================================================

export function ConversationListItem({ conversation, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left block p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors ${
        isActive ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-blue-700">
            {conversation.name?.[0] || "?"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{conversation.name}</p>
          <p className="text-xs text-gray-500 truncate">{conversation.lastMessage}</p>
        </div>
      </div>
    </button>
  );
}
