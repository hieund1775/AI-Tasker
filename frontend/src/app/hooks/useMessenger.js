import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router";

// ---------------------------------------------------------------------------
// In-memory session messages — appended when user sends a message in the UI
// ---------------------------------------------------------------------------
const _sessionMessages = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect the current user based on the conversation participants. */
function detectCurrentUser(convId, conversations) {
  if (!convId) return null;
  const conv = conversations.find((c) => c.id === convId);
  if (!conv) return null;
  return conv.participants[0];
}

// =============================================================================
// useMessenger — encapsulates all state, effects, derived values, refs, and
// action handlers for the Messenger page.
//
// Kept extractive: only moves logic that already existed in Messenger.jsx;
// does not add new behaviour or fake data.
// =============================================================================

export function useMessenger() {
  const { id: activeConvId } = useParams();

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  // ---- Plus menu state ----
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSentFiles, setShowSentFiles] = useState(false);

  // ---- Pending attachments (before sending) ----
  const [pendingAttachments, setPendingAttachments] = useState([]);

  // ---- Sent attachments tracker ----
  const [sentAttachments, setSentAttachments] = useState([]);

  // ---- Session messages state (re-render trigger) ----
  const [sessionMsgs, setSessionMsgs] = useState([..._sessionMessages]);

  // ---- Determine demo user ----
  const rawConversations = [];
  const allConvIds = new Set(rawConversations.map((c) => c.id));

  // If activeConvId is not in expert conversations, try client conversations
  const demoUserId = allConvIds.has(activeConvId)
    ? detectCurrentUser(activeConvId, rawConversations)
    : null;

  // ---- Build conversation list ----
  const demoConvs = [];

  const conversations = demoConvs.map((conv) => {
    const otherUserId = conv.participants.find((p) => p !== demoUserId);
    const otherUser = otherUserId ? null : null;
    const msgs = [];

    // Merge session messages for this conversation
    const extraMsgs = _sessionMessages.filter((m) => m.conversationId === conv.id);

    const allMsgs = [...msgs, ...extraMsgs].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );

    const lastMsg = allMsgs.length > 0 ? allMsgs[allMsgs.length - 1] : null;
    const lastText = lastMsg?.text || (lastMsg?.attachment ? "📎 Attachment" : "No messages yet");

    return {
      id: conv.id,
      projectId: conv.projectId,
      name: otherUser?.fullName || otherUserId || "Unknown",
      role: otherUser?.profile?.title || otherUser?.role || "",
      lastMessage: lastText,
      messages: allMsgs.map((m) => ({
        id: m.id,
        text: m.text || "",
        attachment: m.attachment || null,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isOwn: m.senderId === demoUserId,
      })),
    };
  });

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  // ---- Debug: log state changes to help diagnose "no input box" issues ----
  useEffect(() => {
    console.log(
      "[Messenger] activeConvId:",
      activeConvId,
      "| demoUserId:",
      demoUserId,
      "| conversations:",
      conversations.length,
      "| activeConversation:",
      activeConversation?.name || "NONE (empty state)",
    );
  }, [activeConvId, demoUserId, conversations.length, activeConversation]);

  // ---- Scroll to bottom — only when new messages are added, NOT on initial load ----
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const didInitialLoadRef = useRef(false);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const currentCount = activeConversation?.messages?.length || 0;
    const prevCount = prevMessageCountRef.current;

    // Only scroll if messages were added AFTER the conversation was already loaded
    if (didInitialLoadRef.current && currentCount > prevCount) {
      container.scrollTop = container.scrollHeight;
    }

    // Mark initial load complete and update count tracker
    if (activeConversation && !didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
    }
    prevMessageCountRef.current = currentCount;
  }, [activeConversation?.messages?.length]);

  // Reset initial-load tracker when conversation changes
  useEffect(() => {
    didInitialLoadRef.current = false;
    prevMessageCountRef.current = 0;
  }, [activeConvId]);

  // ---- Close plus menu on outside click ----
  useEffect(() => {
    if (!showPlusMenu && !showSentFiles) return;
    const handler = () => {
      setShowPlusMenu(false);
      setShowSentFiles(false);
    };
    // Small delay to avoid catching the click that opened the menu
    const id = setTimeout(() => document.addEventListener("click", handler), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handler);
    };
  }, [showPlusMenu, showSentFiles]);

  // ---- Add attachment from plus menu ----
  const handleAddAttachment = (type) => {
    const mockFiles = {
      image: { name: `image-${Date.now().toString(36)}.png`, type: "image/png", size: "245 KB" },
      file: { name: `document-${Date.now().toString(36)}.pdf`, type: "application/pdf", size: "1.8 MB" },
      folder: { name: `project-files-${Date.now().toString(36)}/`, type: "folder", size: "3 files" },
    };
    const file = mockFiles[type];
    if (file) {
      setPendingAttachments((prev) => [...prev, { ...file, id: `att-${Date.now()}` }]);
    }
    setShowPlusMenu(false);
  };

  const removePendingAttachment = (id) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ---- Send message ----
  const handleSend = () => {
    const hasText = message.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;
    if (!activeConvId) return;

    const newMsg = {
      id: `session-msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      conversationId: activeConvId,
      senderId: demoUserId,
      receiverId: activeConversation?.name || "recipient",
      text: message.trim(),
      attachment: hasAttachments ? { ...pendingAttachments[0] } : null,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    _sessionMessages.push(newMsg);
    if (hasAttachments) {
      setSentAttachments((prev) => [...prev, ...pendingAttachments.map((a) => ({ ...a, messageId: newMsg.id }))]);
    }

    setMessage("");
    setPendingAttachments([]);
    setSessionMsgs([..._sessionMessages]);
  };

  // ---- Handle Enter key ----
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return {
    // State
    message,
    setMessage,
    showPlusMenu,
    setShowPlusMenu,
    showSentFiles,
    setShowSentFiles,
    pendingAttachments,
    sentAttachments,

    // Refs
    messagesEndRef,
    messagesContainerRef,

    // URL param
    activeConvId,

    // Derived
    conversations,
    activeConversation,

    // Handlers
    handleSend,
    handleKeyDown,
    handleAddAttachment,
    removePendingAttachment,
  };
}
