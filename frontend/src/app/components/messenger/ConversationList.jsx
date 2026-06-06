import { ConversationListItem } from "./ConversationListItem.jsx";

// =============================================================================
// ConversationList — sidebar panel listing all conversations.
//
// Props:
//   conversations          — array of conversation objects
//   activeConvId           — id of the currently selected conversation
//   onSelectConversation   — callback(conversationId) when an item is clicked
// =============================================================================

export function ConversationList({
  conversations,
  activeConvId,
  onSelectConversation,
}) {
  return (
    <div className="w-80 border-r border-gray-200 flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Messages</h2>
      </div>
      {conversations.length === 0 ? (
        <div className="p-8 text-center flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">No conversations yet</p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {conversations.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConvId}
              onClick={() => onSelectConversation(conv.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
