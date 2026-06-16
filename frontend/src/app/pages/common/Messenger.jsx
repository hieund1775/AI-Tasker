import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  Send,
  Plus,
  Image,
  File,
  FolderOpen,
  X,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ATTACH_OPTIONS = [
  { key: "image", label: "Upload Image", icon: Image, color: "text-blue-500", ext: ".png", mime: "image/png" },
  { key: "file", label: "Upload File", icon: File, color: "text-gray-600", ext: ".pdf", mime: "application/pdf" },
  { key: "folder", label: "Upload Folder", icon: FolderOpen, color: "text-amber-500", ext: "/", mime: "folder" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Messenger() {
  const { id: activeConvId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Target expert to start a conversation with
  const targetExpertId = searchParams.get("expertId");
  const targetJobPostId = searchParams.get("jobPostId");

  // State
  const [conversations, setConversations] = useState([]);
  const [activeMessages, setActiveMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Plus menu
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // Pending attachments
  const [pendingAttachments, setPendingAttachments] = useState([]);

  // ─── Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingConversations(true);
      const list = await api.chat.getConversations();
      setConversations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
    // Poll for new messages every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // ─── Load messages for active conversation ───────────────────────────────
  useEffect(() => {
    if (!activeConvId) {
      setActiveMessages([]);
      return;
    }
    async function loadMessages() {
      try {
        setLoadingMessages(true);
        const msgs = await api.chat.getMessages(activeConvId);
        setActiveMessages(Array.isArray(msgs) ? msgs : []);
        // Mark as read
        await api.chat.markRead(activeConvId).catch(() => {});
      } catch (err) {
        console.error("Failed to load messages:", err);
        setActiveMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    }
    loadMessages();
    // Poll for new messages every 5 seconds when viewing a conversation
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  // ─── Auto-create conversation when navigated with expertId ───────────────
  useEffect(() => {
    if (!targetExpertId || !user?.id) return;
    // Check if conversation already exists
    const existing = conversations.find(
      (c) => c.expertId === targetExpertId || c.clientId === targetExpertId
    );
    if (existing) {
      navigate(`/messenger/${existing.id}`, { replace: true });
      return;
    }
    // Create new conversation
    async function createConv() {
      try {
        // Determine correct client/expert IDs based on current user's role
        const isExpert = user.role === "Expert";
        const clientId = isExpert ? targetExpertId : user.id;
        const expertId = isExpert ? user.id : targetExpertId;

        const newConv = await api.chat.createConversation({
          clientId,
          expertId,
          jobPostId: targetJobPostId || null,
        });
        await loadConversations();
        navigate(`/messenger/${newConv.id}`, { replace: true });
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    }
    createConv();
  }, [targetExpertId, user?.id]);

  // ─── Scroll to bottom when messages change ───────────────────────────────
  const prevMessageCountRef = useRef(0);
  const didInitialLoadRef = useRef(false);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const currentCount = activeMessages.length;
    const prevCount = prevMessageCountRef.current;

    if (didInitialLoadRef.current && currentCount > prevCount) {
      container.scrollTop = container.scrollHeight;
    }
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
    }
    prevMessageCountRef.current = currentCount;
  }, [activeMessages.length]);

  useEffect(() => {
    didInitialLoadRef.current = false;
    prevMessageCountRef.current = 0;
  }, [activeConvId]);

  // ─── Close plus menu on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showPlusMenu) return;
    const handler = () => setShowPlusMenu(false);
    const id = setTimeout(() => document.addEventListener("click", handler), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handler);
    };
  }, [showPlusMenu]);

  // ─── Add attachment ──────────────────────────────────────────────────────
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

  // ─── Send message ────────────────────────────────────────────────────────
  const handleSend = async () => {
    const hasText = message.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;
    if (!activeConvId || !user?.id) return;

    // Build content with attachment info
    let content = message.trim();
    if (hasAttachments) {
      const attInfo = pendingAttachments.map((a) => `[Attachment: ${a.name} (${a.size})]`).join(", ");
      content = content ? `${content}\n${attInfo}` : attInfo;
    }

    // Optimistically add to UI
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversationId: activeConvId,
      senderId: user.id,
      senderName: user.fullName,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setActiveMessages((prev) => [...prev, optimistic]);
    setMessage("");
    setPendingAttachments([]);

    try {
      const sent = await api.chat.sendMessage({
        conversationId: activeConvId,
        senderId: user.id,
        content,
      });
      // Replace optimistic message with real one
      setActiveMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sent, senderName: user.fullName } : m))
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on failure
      setActiveMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  // ─── Handle Enter key ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Build enriched conversation list ────────────────────────────────────
  const enrichedConversations = conversations.map((conv) => {
    const otherName = user?.role === "Expert" ? conv.clientName : conv.expertName;
    const otherRole = user?.role === "Expert" ? "Client" : conv.expertName ? "Expert" : "";
    return {
      ...conv,
      displayName: otherName || "Unknown",
      displayRole: otherRole,
      initials: (otherName || "?")[0].toUpperCase(),
    };
  });

  const activeConversation = enrichedConversations.find((c) => c.id === activeConvId) || null;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex h-[calc(100vh-10rem)]">
        {/* Conversation List */}
        <div className="w-80 border-r border-gray-200 flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Messages</h2>
          </div>
          {loadingConversations ? (
            <div className="p-8 text-center flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400 animate-pulse">Loading conversations...</p>
            </div>
          ) : enrichedConversations.length === 0 ? (
            <div className="p-8 text-center flex-1 flex items-center justify-center">
              <div>
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start a conversation from a project or proposal.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {enrichedConversations.map((conv) => (
                <button
                  type="button"
                  onClick={() => navigate(`/messenger/${conv.id}`)}
                  key={conv.id}
                  className={`w-full text-left block p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                    conv.id === activeConvId ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-700">{conv.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {conv.displayName}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0" key={activeConvId || "empty"}>
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-gray-400">
                  Choose a conversation from the list to start messaging.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-700">
                      {activeConversation.initials}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {activeConversation.displayName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {activeConversation.displayRole}
                      {activeConversation.jobTitle ? ` · ${activeConversation.jobTitle}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages && activeMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-400 animate-pulse">Loading messages...</p>
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isOwn = msg.senderId === user?.id;
                    const time = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                            isOwn
                              ? "bg-blue-900 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-900 rounded-bl-md"
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-semibold text-blue-700 mb-0.5">
                              {msg.senderName || "User"}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1.5 ${
                              isOwn ? "text-blue-200" : "text-gray-400"
                            }`}
                          >
                            {time}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending attachments preview */}
              {pendingAttachments.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                    >
                      {att.type === "image/png" ? (
                        <Image className="w-4 h-4 text-blue-500" />
                      ) : att.type === "folder" ? (
                        <FolderOpen className="w-4 h-4 text-amber-500" />
                      ) : (
                        <File className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-xs font-medium text-gray-700">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removePendingAttachment(att.id)}
                        className="p-0.5 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="p-3 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {/* Plus button */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlusMenu((v) => !v);
                      }}
                      className="h-10 w-10 flex items-center justify-center bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                      title="Add attachment"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    {showPlusMenu && (
                      <div
                        className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20 min-w-[210px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ATTACH_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleAddAttachment(opt.key)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 inline-flex items-center gap-3 transition-colors"
                          >
                            <opt.icon className={`w-4 h-4 ${opt.color}`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Text input */}
                  <div className="flex-1 relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message... (Enter to send)"
                      rows={1}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none min-h-10 max-h-[120px]"
                    />
                  </div>

                  {/* Send button */}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!message.trim() && pendingAttachments.length === 0}
                    className="h-10 w-10 flex items-center justify-center bg-blue-900 text-white rounded-xl hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    title="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
