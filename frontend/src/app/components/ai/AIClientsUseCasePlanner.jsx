import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  X,
} from "lucide-react";
import { AIFileUploadZone } from "./AIFileUploadZone.jsx";
import api from "../../../services/api.js";

function parseUseCasesFromText(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const useCases = [];
  
  const regexPatterns = [
    /^\s*[-*\u2022]?\s*\d+[\.\)]\s*\*\*([^*]+)\*\*[:\-]?\s*(.*)$/,
    /^\s*[-*\u2022]?\s*\d+[\.\)]\s*([^:\-]+)[:\-]\s*(.*)$/,
    /^\s*[-*\u2022]\s*\*\*([^*]+)\*\*[:\-]?\s*(.*)$/,
    /^\s*[-*\u2022]\s*([^:\-]+)[:\-]\s*(.*)$/,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    let matched = false;
    for (const regex of regexPatterns) {
      const match = trimmed.match(regex);
      if (match) {
        let title = match[1].trim();
        let description = match[2] ? match[2].trim() : "";
        
        title = title.replace(/[\*_`\[\]]/g, "").trim();
        description = description.replace(/[\*_`\[\]]/g, "").trim();
        
        if (title.length > 2) {
          useCases.push({
            title: title,
            description: description || `Specification: ${title}`,
            originalDurationDays: ""
          });
          matched = true;
          break;
        }
      }
    }
    
    if (!matched && (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("\u2022") || /^\d+[\.\)]/.test(trimmed))) {
      const cleaned = trimmed.replace(/^[-*\u2022\d\.\)\s]+/, "").replace(/[\*_`\[\]]/g, "").trim();
      if (cleaned.length > 10) {
        const parts = cleaned.split(/[:\-]/);
        const title = parts[0].trim();
        const description = parts.slice(1).join(":").trim();
        if (title.length > 2) {
          useCases.push({
            title: title.slice(0, 60),
            description: description || cleaned,
            originalDurationDays: ""
          });
        }
      }
    }
  }
  
  if (useCases.length === 0 && text.trim().length > 15 && text.trim().length < 100) {
    useCases.push({
      title: text.trim().slice(0, 50),
      description: text.trim(),
      originalDurationDays: ""
    });
  }
  
  return useCases;
}

function parseUseCasesFromPayload(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((task, idx) => {
    const title = task.Title || task.title || `Use Case ${idx + 1}`;
    const description = task.Description || task.description || "";
    
    return {
      id: `uc-ai-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      title,
      description,
      originalDurationDays: task.Duration || task.duration || ""
    };
  });
}

export function AIClientsUseCasePlanner({
  onClose,
  onApplyPlan,
  existingFiles = [],
  initialTitle = "",
  initialDescription = ""
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState(existingFiles);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [contextSummary, setContextSummary] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);

    const welcomeMsg = {
      role: "ai",
      text: `Hello! I am your AI User Stories planning assistant.\n\nPlease upload your requirement document (BRD/SRS) above, or describe your project idea here (e.g., "I want to make a sales chatbot integrated with RAG").\n\nMy AI engine will decompose and normalize the Project User Stories for you to apply to the recruitment form!`,
      timestamp: Date.now()
    };
    setMessages([welcomeMsg]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generatedPlan]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && files.length === 0) return;
    if (loading) return;

    const userMsgText = trimmed || `Please analyze the attached document to generate User Stories: ${files.map(f => f.name).join(", ")}`;
    const userMsg = { role: "user", text: userMsgText, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let uploadedFilePath = null;
      if (files.length > 0) {
        try {
          const uploadRes = await api.ai.uploadChatFile(files[0]);
          uploadedFilePath = uploadRes?.file_path || uploadRes?.filePath || null;
        } catch (uploadErr) {
          console.warn("File upload failed, sending without file...", uploadErr);
        }
      }

      // Build message history payload matching C# AIMessageDto
      const historyPayload = messages.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text
      }));
      const enforcedPrompt = userMsgText + "\n\n[System Instruction: Do not ask for deadline, duration, or budget. Analyze the request/file and immediately decompose it into structured User Stories and tasks (intent: 'success', is_complete: true). Automatically assume reasonable implementation days (1-15 days per story) and generate the full list of use cases and tasks immediately. Do not respond with intent 'collecting_info' or request further timeline info.]";
      historyPayload.push({ role: "user", content: enforcedPrompt });

      // Call general backend AiChat endpoint matching C# AIChatRequest
      const response = await api.ai.sendSession({
        messages_history: historyPayload,
        context_summary: contextSummary || "",
        file_path: uploadedFilePath || "",
        user_role: "client",
        current_draft: {
          title: initialTitle || "",
          description: initialDescription || ""
        }
      });
      setFiles([]);

      // Map backend structured response to our planner format
      let plan = null;
      const chatMessage = response?.chat_message || response?.ChatMessage || "";
      const payload = response?.payload || response?.Payload;
      const newContextSummary = response?.context_summary || response?.ContextSummary || "";

      // Save context_summary to maintain chat memory
      setContextSummary(newContextSummary);

      if (payload && Array.isArray(payload)) {
        const stories = parseUseCasesFromPayload(payload);
        plan = {
          category: "Software Development",
          specialization: "Full Stack Development",
          skills: [],
          useCases: stories,
          introText: chatMessage || "Here is the proposed User Stories based on AI analysis:"
        };
      }

      const replyText = chatMessage || (plan ? "Here is the proposed User Stories based on AI analysis:" : "I have not gathered enough information to propose User Stories. Please describe your project in more detail.");

      setGeneratedPlan(plan);
      setApplied(false);

      const aiMsg = {
        role: "ai",
        text: replyText,
        plan: plan,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Backend AI chat failed:", err);
      const aiMsg = {
        role: "ai",
        text: "Sorry, an error occurred while connecting to the AI service. (Error code: " + (err.message || "Unknown") + ")",
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, files, messages, contextSummary, initialTitle, initialDescription]);

  const handleApply = useCallback(() => {
    if (generatedPlan) {
      onApplyPlan(generatedPlan);
      setApplied(true);
    }
  }, [generatedPlan, onApplyPlan]);

  const handleFilesChange = useCallback((newFiles) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      const names = newFiles.map((f) => f.name).join(", ");
      setMessages((prev) => [
        ...prev,
        { role: "user", text: `Attached document: ${names}`, timestamp: Date.now() }
      ]);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-2.5 bg-secondary/50">
        <div>
          <h2 className="text-sm font-semibold text-foreground">AI user story planner</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Plan user stories from documents and chat
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          Close
        </button>
      </div>

      {/* Upload Requirements */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border bg-card">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Upload BRD / SRS
        </p>
        <AIFileUploadZone files={files} onFilesChange={handleFilesChange} disabled={loading} />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2.5 space-y-4 bg-secondary/40">
        <div className="space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Send a message or upload a document to automatically generate use cases.</p>
              <p className="text-xs text-muted-foreground/60 mt-1 italic">Example: "I want to build a customer support chatbot with RAG"</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] w-fit px-4 py-2.5 rounded-xl text-sm leading-relaxed ${msg.role === "user"
                    ? "bg-brand-primary text-brand-primary-foreground rounded-br-md shadow-sm"
                    : "bg-card text-foreground rounded-bl-md border border-border shadow-sm"
                  }`}
              >
                <p className="whitespace-pre-wrap font-medium">{msg.text}</p>

                {msg.role === "ai" && msg.plan && (
                  <div className="mt-4 space-y-3 border-t border-border pt-3 w-full">
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-2.5">
                      <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
                        Predicted Category:
                      </p>
                      <p className="text-xs text-foreground font-semibold mt-0.5">
                        {msg.plan.category} ({msg.plan.specialization})
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Proposed use cases:
                      </p>
                      {msg.plan.useCases.map((uc, index) => (
                        <div key={index} className="bg-secondary/60 border border-border rounded-lg p-2.5 text-xs space-y-1">
                          <p className="font-semibold text-foreground">{uc.title}</p>
                          <p className="text-muted-foreground leading-normal">{uc.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-xl rounded-bl-md px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-primary animate-pulse" />
                  <span className="text-sm text-muted-foreground font-medium">AI is analyzing the document and requirements...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Plan Applicator / Submit Footer */}
      {generatedPlan && !loading && (
        <div className="shrink-0 bg-card border-t border-border p-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={applied}
            className={`w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-all ${applied
                ? "bg-success/10 text-success border border-success/20 cursor-default"
                : "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
              }`}
          >
            <Sparkles className="w-4 h-4" />
            {applied ? "Applied use cases to the form" : "Apply these use cases"}
          </button>
        </div>
      )}

      {/* Chat Input */}
      <div className="shrink-0 p-3 bg-card border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Describe your project or ask a question..."
            className="flex-1 px-4 py-2 border border-input rounded-xl text-sm focus:outline-none focus:border-brand-primary bg-card"
          />
          <button
            type="submit"
            disabled={(!input.trim() && files.length === 0) || loading}
            className="h-10 w-10 shrink-0 bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-brand-primary-foreground rounded-xl flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
