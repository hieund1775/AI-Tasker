import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import { safeArray, safeDateTimeFormat } from "../../lib/safety.js";
import { BackButton } from "../../components/shared/BackButton.jsx";
import api from "../../../services/api.js";
import {
  Send,
  Plus,
  Paperclip,
  X,
  Download,
  Eye,
  MessageSquare,
  FileText,
} from "lucide-react";
import { downloadFile } from "../../lib/downloadFileUtils.js";
import { getFileSizeErrorMessage, validateUploadFiles } from "../../lib/fileValidation.js";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// In-memory session messages - appended when user sends a message in the UI
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

// ---------------------------------------------------------------------------
// Attachment types for the plus menu
// ---------------------------------------------------------------------------

const ATTACH_OPTIONS = [
  { key: "file", label: "Upload File", icon: Paperclip, color: "text-brand-primary", ext: "*", mime: "*/*" },
];

function renderMessageText(text, isOwn) {
  if (!text) return null;
  const linkRegex = /📎\s*\[(.*?)\]\((.*?)\)/g;
  const matches = [...text.matchAll(linkRegex)];

  if (matches.length === 0) {
    return <p className="text-sm whitespace-pre-wrap break-words">{text}</p>;
  }

  const cleanText = text.replace(linkRegex, "").trim();

  return (
    <div className="space-y-2">
      {cleanText && <p className="text-sm whitespace-pre-wrap break-words">{cleanText}</p>}
      <div className="space-y-1.5 pt-1">
        {matches.map((m, idx) => {
          const fileName = m[1];
          const fileUrl = m[2];
          return (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(fileUrl, fileName);
              }}
              className={`p-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
                isOwn ? "bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground" : "bg-muted/70 hover:bg-muted text-foreground"
              }`}
              title={`Click to download ${fileName}`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium truncate flex-1">{fileName}</span>
              <Download className="w-3.5 h-3.5 shrink-0 opacity-80" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Messenger() {
  const { id: activeConvId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ---- Plus menu state ----
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSentFiles, setShowSentFiles] = useState(false);

  // ---- Pending attachments (before sending) ----
  const [pendingAttachments, setPendingAttachments] = useState([]);

  // ---- Sent attachments tracker ----
  const [sentAttachments, setSentAttachments] = useState([]);

  const { user } = useAuth();
  const demoUserId = user?.id;

  const [allMessages, setAllMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);

  // Fetch conversations
  const loadConversations = async () => {
    if (!demoUserId) return;
    try {
      // 1. L?y list cu?c h?i tho?i t? backend
      let convs = await api.chat.getUserConversations(demoUserId).catch(() => []);
      
      // 2. N?u trn URL cA3 id c?a user mA cha cA3 cu?c h?i tho?i nAo, thA t?o m?i/l?y
      if (activeConvId) {
        // Ki?m tra xem activeConvId hi?n t?i cA3 ph?i lA conversationId khA'ng
        let activeC = convs.find((c) => c.id === activeConvId);
        
        // If NOT, it might be UserId. Create or retrieve the conversation with that user.
        if (!activeC && activeConvId.length > 20) {
          const isClient = String(user?.role).toLowerCase() === "client";
          try {
            activeC = await api.chat.createConversation({
              clientId: isClient ? demoUserId : activeConvId,
              expertId: isClient ? activeConvId : demoUserId,
            });
            // Thm vAo list vA replace URL ? ch? th?ng ?n conversationId th?t
            if (activeC) {
              convs = [activeC, ...convs.filter(c => c.id !== activeC.id)];
              navigate(`/messenger/${activeC.id}`, { replace: true });
            }
          } catch (err) {
            console.error("Could not get/create conversation with user:", err);
          }
        }
      }

      // Convert backend format to frontend UI format
      const mappedList = convs.map((c) => {
        const isClient = String(demoUserId).toLowerCase() === String(c.clientId).toLowerCase();
        return {
          id: c.id,
          name: isClient ? c.expertName : c.clientName,
          role: isClient ? "Expert" : "Client",
          lastMessage: c.lastMessageContent || "No messages yet",
          messages: [], // S? fetch sau
        };
      });

      setConversations(mappedList);
      
      // Fetch tin nh?n cho conversation ang active
      if (activeConvId) {
        const activeC = mappedList.find(c => c.id === activeConvId);
        if (activeC) {
          const msgs = await api.chat.getMessages(activeC.id).catch(() => []);
          activeC.messages = msgs.map(m => ({
            id: m.id,
            text: m.content || "",
            time: safeDateTimeFormat(m.createdAt, { hour: "2-digit", minute: "2-digit" }, ""),
            isOwn: String(m.senderId).toLowerCase() === String(demoUserId).toLowerCase(),
          }));
          setActiveConversation({ ...activeC });
        }
      } else {
        setActiveConversation(null);
      }
    } catch (err) {
      console.error("Failed to load messenger data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    const timer = setInterval(loadConversations, 3000);
    return () => clearInterval(timer);
  }, [demoUserId, activeConvId]);

  // ---- Debug: log state changes ----
  useEffect(() => {
    console.log(
      "[Messenger] activeConvId:",
      activeConvId,
      "| demoUserId:",
      demoUserId,
      "| conversations:",
      conversations.length,
      "| activeConversation:",
      activeConversation?.name || "NONE"
    );
  }, [activeConvId, demoUserId, conversations.length, activeConversation]);

  // ---- Scroll to bottom ----
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const didInitialLoadRef = useRef(false);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const currentCount = activeConversation?.messages?.length || 0;
    const prevCount = prevMessageCountRef.current;

    if (didInitialLoadRef.current && currentCount > prevCount) {
      container.scrollTop = container.scrollHeight;
    }

    if (activeConversation && !didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
    }
    prevMessageCountRef.current = currentCount;
  }, [activeConversation?.messages?.length]);

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
    const id = setTimeout(() => document.addEventListener("click", handler), 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handler);
    };
  }, [showPlusMenu, showSentFiles]);

  // ---- Add attachment from plus menu ----
  const handleAddAttachment = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "*/*";
      fileInputRef.current.removeAttribute("webkitdirectory");
      fileInputRef.current.click();
    }
    setShowPlusMenu(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validation = validateUploadFiles(files);
    if (!validation.valid) {
      toast.error(getFileSizeErrorMessage(validation.oversized[0]));
      e.target.value = null;
      return;
    }
    
    const newAttachments = files.map((file) => {
      return {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: (file.size / 1024).toFixed(0) + " KB",
      };
    });
    
    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = null;
  };

  const removePendingAttachment = (id) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ---- Send message ----
  const handleSend = async () => {
    const hasText = message.trim().length > 0;
    const hasAttachments = pendingAttachments.length > 0;
    if (!hasText && !hasAttachments) return;
    if (!activeConvId) return;

    try {
      let attachmentText = "";
      const uploadedAtts = [];

      if (hasAttachments) {
        for (const att of pendingAttachments) {
          if (att.file instanceof File) {
            try {
              const formData = new FormData();
              formData.append("file", att.file);
              const uploadRes = await api.post("/JobPosts/upload-file", formData, { isFormData: true }).catch(() => null);
              const cleanUrl = uploadRes?.url || uploadRes?.Url || uploadRes?.fileUrl || uploadRes?.FileUrl || uploadRes?.data || "";
              const fileName = att.name || att.file.name;
              const finalUrl = cleanUrl ? (cleanUrl.includes("?") ? cleanUrl : `${cleanUrl}?name=${encodeURIComponent(fileName)}`) : "";
              
              if (finalUrl) {
                attachmentText += (attachmentText ? "\n" : "") + `📎 [${fileName}](${finalUrl})`;
                uploadedAtts.push({
                  id: att.id,
                  name: fileName,
                  fileUrl: finalUrl,
                  size: att.size,
                  type: att.type,
                });
              } else {
                attachmentText += (attachmentText ? "\n" : "") + `📎 [${fileName}]`;
                uploadedAtts.push(att);
              }
            } catch (upErr) {
              attachmentText += (attachmentText ? "\n" : "") + `📎 [${att.name}]`;
              uploadedAtts.push(att);
            }
          } else {
            attachmentText += (attachmentText ? "\n" : "") + `📎 [${att.name}]`;
            uploadedAtts.push(att);
          }
        }
      }

      const fullContent = [message.trim(), attachmentText].filter(Boolean).join("\n\n");

      const payload = {
        conversationId: activeConvId,
        senderId: demoUserId,
        content: fullContent,
      };

      await api.chat.sendMessage(payload);
      if (uploadedAtts.length > 0) {
        setSentAttachments((prev) => [...prev, ...uploadedAtts]);
      }
      setMessage("");
      setPendingAttachments([]);
      loadConversations();
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(err.message || "Failed to send message.");
    }
  };

  // ---- Handle Enter key ----
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---- Collect all sent attachments across conversations ----
  const allSentAttachments = sentAttachments;

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton
        fallback={`/${user?.role === "staff" ? "admin" : user?.role || "client"}/dashboard`}
        className="mb-4"
      >
        Back
      </BackButton>
      <div className="bg-card rounded-2xl border border-border shadow-sm flex h-[calc(100vh-10rem)]">
        {/* ================================================================ */}
        {/* Conversation List                                                   */}
        {/* ================================================================ */}
        <div className="w-80 border-r border-border flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Messages</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="p-8 text-center flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-muted/40 animate-pulse" />
                  <div className="relative w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground/60 mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                  Messages from your projects and proposals will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {conversations.map((conv) => (
                <button
                  type="button"
                  onClick={() => navigate(`/messenger/${conv.id}`)}
                  key={conv.id}
                  className={`w-full text-left block p-4 hover:bg-secondary/70 border-b border-border transition-all duration-150 ${
                    conv.id === activeConvId ? "bg-accent/5 border-l-[3px] border-l-accent shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]" : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-brand-primary">
                        {conv.name?.[0] || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{conv.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* Chat Area                                                           */}
        {/* ================================================================ */}
        <div className="flex-1 flex flex-col min-w-0" key={activeConvId || "empty"}>
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-muted/40 animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <Send className="w-9 h-9 text-muted-foreground/25" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground/60 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Choose a conversation from the list to start messaging. Your project and proposal contacts will appear here.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-foreground">
                        {activeConversation.name?.[0] || "?"}
                      </span>
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {activeConversation.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {activeConversation.role || "Client"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeConversation.messages?.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} animate-fade-in`}
                    style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                        msg.isOwn
                          ? "bg-gradient-to-br from-accent to-accent-hover text-primary-foreground rounded-br-md shadow-md"
                          : "bg-secondary text-foreground rounded-bl-md border border-border/60 shadow-sm"
                      }`}
                    >
                      {/* Attachment display */}
                      {msg.attachment && (
                        <div
                          className={`mb-2 p-2 rounded-lg flex items-center gap-2 ${
                            msg.isOwn ? "bg-primary/20" : "bg-muted"
                          }`}
                        >
                          <FileText className="w-5 h-5 flex-shrink-0 text-brand-primary" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {msg.attachment.name}
                            </p>
                            <p className="text-xs opacity-70">
                              {msg.attachment.size}
                            </p>
                          </div>
                          <Download className="w-4 h-4 flex-shrink-0 opacity-70 cursor-pointer" />
                        </div>
                      )}

                      {/* Text */}
                      {renderMessageText(msg.text, msg.isOwn)}

                      {/* Time */}
                      <p
                        className={`text-xs mt-1.5 ${
                          msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* ============================================================ */}
              {/* Input Area                                                      */}
              {/* ============================================================ */}

              {/* Pending attachments preview */}
              {pendingAttachments.length > 0 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-2 bg-brand-primary-light border border-accent/25 rounded-lg px-3 py-1.5"
                    >
                      <FileText className="w-4 h-4 text-brand-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-foreground/80">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removePendingAttachment(att.id)}
                        className="p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="p-3 border-t border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                  />
                  {/* Plus button with dropdown */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPlusMenu((v) => !v);
                        setShowSentFiles(false);
                      }}
                      className="h-10 w-10 flex items-center justify-center bg-secondary text-muted-foreground rounded-xl hover:bg-muted transition-colors"
                      title="Add attachment"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    {showPlusMenu && (
                      <div
                        className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-lg py-1 z-20 min-w-[210px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ATTACH_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleAddAttachment(opt.key)}
                            className="w-full text-left px-4 py-2.5 hover:bg-secondary text-sm text-foreground/80 inline-flex items-center gap-3 transition-colors"
                          >
                            <opt.icon className={`w-4 h-4 ${opt.color}`} />
                            {opt.label}
                          </button>
                        ))}
                        <div className="border-t border-border my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setShowSentFiles(true);
                            setShowPlusMenu(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-secondary text-sm text-foreground/80 inline-flex items-center gap-3 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-brand-green" />
                          View Sent Attachments
                        </button>
                      </div>
                    )}

                    {/* Sent attachments modal */}
                    {showSentFiles && (
                      <div
                        className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-lg py-2.5 px-4 z-20 w-[280px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-foreground">Sent Files</h4>
                          <button
                            type="button"
                            onClick={() => setShowSentFiles(false)}
                            className="text-muted-foreground hover:text-muted-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {allSentAttachments.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">
                            No attachments sent yet.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {allSentAttachments.map((att, idx) => (
                              <div
                                key={att.id || idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (att.fileUrl) downloadFile(att.fileUrl, att.name);
                                }}
                                className="flex items-center gap-2 bg-secondary/60 rounded-lg p-2 hover:bg-secondary cursor-pointer transition-colors"
                                title="Click to download"
                              >
                                <FileText className="w-4 h-4 text-brand-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground/80 truncate">
                                    {att.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{att.size}</p>
                                </div>
                                {att.fileUrl && <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-accent shrink-0" />}
                              </div>
                            ))}
                          </div>
                        )}
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
                      className="w-full px-4 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring text-sm resize-none min-h-10 max-h-[120px] bg-input-background"
                    />
                  </div>

                  {/* Send button */}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!message.trim() && pendingAttachments.length === 0}
                    className="h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors flex-shrink-0"
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
