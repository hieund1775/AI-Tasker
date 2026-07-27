import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  FileText,
  X,
} from "lucide-react";
import { AIProjectIllustration } from "../shared/illustrations/AIProjectIllustration.jsx";
import api from "../../../services/api.js";

function parseMiniTasksFromText(text, clientUseCases = []) {
  if (!text) return [];
  const lines = text.split("\n");
  
  const planUseCases = (clientUseCases || []).map(uc => {
    return {
      useCaseId: uc.id,
      useCaseTitle: uc.title || uc.nameAndDeadline || "Use Case",
      tasks: [
        {
          taskId: uc.id,
          taskTitle: uc.title || uc.nameAndDeadline || "Task",
          miniTasks: []
        }
      ]
    };
  });

  if (planUseCases.length === 0) return [];

  let currentUseCaseIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let foundUseCaseMatch = false;
    for (let i = 0; i < planUseCases.length; i++) {
      const ucTitle = planUseCases[i].useCaseTitle.toLowerCase();
      if (trimmed.toLowerCase().includes(ucTitle) || ucTitle.includes(trimmed.toLowerCase())) {
        currentUseCaseIndex = i;
        foundUseCaseMatch = true;
        break;
      }
    }

    if (foundUseCaseMatch) continue;

    if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("â€¢") || /^\d+[\.\)]/.test(trimmed)) {
      const cleanTitle = trimmed.replace(/^[-*â€¢\d\.\)\s]+/, "").replace(/[\*_`\[\]]/g, "").trim();
      if (cleanTitle.length > 2) {
        const currentUC = planUseCases[currentUseCaseIndex];
        if (currentUC && currentUC.tasks && currentUC.tasks[0]) {
          currentUC.tasks[0].miniTasks.push({
            id: `mt-ai-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            title: cleanTitle,
            description: ""
          });
        }
      }
    }
  }

  const totalParsed = planUseCases.reduce((sum, uc) => sum + uc.tasks[0].miniTasks.length, 0);
  if (totalParsed === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("â€¢")) {
        const cleanTitle = trimmed.replace(/^[-*â€¢\s]+/, "").replace(/[\*_`\[\]]/g, "").trim();
        if (cleanTitle.length > 2) {
          planUseCases[0].tasks[0].miniTasks.push({
            id: `mt-ai-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            title: cleanTitle,
            description: ""
          });
        }
      }
    }
  }

  return planUseCases;
}

// =============================================================================
function mapPayloadToProposalFormat(payload, clientUseCases = []) {
  if (!Array.isArray(payload)) return [];
  return payload.map((task, idx) => {
    let matchedUseCase = clientUseCases[0];
    const taskTitleLower = (task.Title || task.title || "").toLowerCase();
    for (const uc of clientUseCases) {
      const ucTitleLower = (uc.title || uc.nameAndDeadline || "").toLowerCase();
      if (taskTitleLower.includes(ucTitleLower) || ucTitleLower.includes(taskTitleLower)) {
        matchedUseCase = uc;
        break;
      }
    }
    const useCaseId = matchedUseCase?.id || `uc-fb-${Date.now()}-${idx}`;
    const useCaseTitle = matchedUseCase?.title || matchedUseCase?.nameAndDeadline || task.Title || task.title || "Use Case";
    return {
      useCaseId,
      useCaseTitle,
      tasks: [
        {
          taskId: useCaseId,
          taskTitle: useCaseTitle,
          miniTasks: (task.MiniTasks || task.miniTasks || []).map(mt => ({
            title: mt.Title || mt.title || "",
            description: ""
          }))
        }
      ]
    };
  });
}

// =============================================================================
// AIPlannerPanel â€” inline right-side panel with chat, file upload & plan preview.
// =============================================================================

/**
 * Props:
 *   onClose        â€” callback to close the panel
 *   projectInfo    â€” { title, category } for context
 *   onApplyTasks   â€” callback(tasks[]) when user clicks "Apply MiniTasks"
 *   existingTasks  â€” current tasks in the form
 *   clientUseCases â€” [{ id, title, tasks: [{id, title}] }] from the job post
 */
export function AIPlannerPanel({ onClose, projectInfo = {}, onApplyTasks, existingTasks = [], clientUseCases = [], jobPostId, expertId, autoPrompt, clearAutoPrompt }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [contextSummary, setContextSummary] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Load chat history on mount
  useEffect(() => {
    if (!jobPostId || !expertId) return;
    const loadHistory = async () => {
      try {
        const history = await api.ai.getExpertAiChatHistory(jobPostId, expertId);
        if (history && history.length > 0) {
          const loadedMsgs = [];
          history.forEach(item => {
            loadedMsgs.push({ role: "user", text: item.message, timestamp: new Date(item.createdAt).getTime() });
            loadedMsgs.push({ role: "ai", text: item.aiReply, timestamp: new Date(item.createdAt).getTime() });
          });
          setMessages(loadedMsgs);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };
    loadHistory();
  }, [jobPostId, expertId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generatedPlan]);

  // â”€â”€ Send message â”€â”€
  const handleSend = useCallback(async (customText) => {
    const textToSend = typeof customText === "string" ? customText : input;
    const trimmed = textToSend.trim();
    if (!trimmed) return;
    if (loading) return;

    const userMsgText = trimmed;
    const userMsg = { role: "user", text: userMsgText, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    if (typeof customText !== "string") {
      setInput("");
    }
    setLoading(true);

    try {
      // Build messages history matching C# AIMessageDto
      const historyPayload = messages.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text
      }));
      const enforcedPrompt = userMsgText + "\n\n[System Instruction: Do not ask for deadline, duration, or budget. Decompose it immediately into tasks and mini-tasks (intent: 'success', is_complete: true). Automatically assume reasonable implementation days (1-15 days per story) and generate the full list of tasks/minitasks immediately. Do not respond with intent 'collecting_info'.]";
      historyPayload.push({ role: "user", content: enforcedPrompt });

      // Call general backend AiChat endpoint matching C# AIChatRequest
      const response = await api.ai.sendSession({
        messages_history: historyPayload,
        context_summary: contextSummary || "",
        user_role: "expert",
        file_path: "",
        current_draft: {
          jobPostId: jobPostId,
          expertId: expertId,
          projectTitle: projectInfo?.title || ""
        }
      });

      const chatMessage = response?.chat_message || response?.ChatMessage || "";
      const payload = response?.payload || response?.Payload;
      const newContextSummary = response?.context_summary || response?.ContextSummary || "";

      // Save context_summary to maintain chat memory
      setContextSummary(newContextSummary);

      let parsedUseCases = [];
      if (payload && Array.isArray(payload)) {
        parsedUseCases = mapPayloadToProposalFormat(payload, clientUseCases);
      }

      const plan = parsedUseCases.length > 0 ? {
        useCases: parsedUseCases,
        summary: "Plan breakdown successful."
      } : null;

      setGeneratedPlan(plan);
      setApplied(false);

      const aiMsg = { 
        role: "ai", 
        text: chatMessage || (plan ? "Plan generated successfully." : "Received response from AI."), 
        plan, 
        timestamp: Date.now() 
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI backend call failed:", err);
      const errMsg = err?.message || "Cannot connect to AI backend.";
      const aiMsg = {
        role: "ai",
        text: `âŒ An error occurred while calling AI: ${errMsg}\nPlease try again later.`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, contextSummary, clientUseCases, jobPostId, expertId, projectInfo]);

  // Auto-trigger prompt if autoPrompt changes
  useEffect(() => {
    if (autoPrompt) {
      const promptText = `Please generate detailed tasks and mini-tasks breakdown for this specific User Story:
User Story: ${autoPrompt.title}
Description: ${autoPrompt.description}`;
      handleSend(promptText);
      if (clearAutoPrompt) {
        clearAutoPrompt();
      }
    }
  }, [autoPrompt, handleSend, clearAutoPrompt]);

  // â”€â”€ Apply plan â”€â”€
  const handleApply = useCallback(() => {
    if (generatedPlan?.useCases) {
      const result = onApplyTasks({ useCases: generatedPlan.useCases });
      if (result && result.updatedCount > 0) {
        setApplied(true);
      }
    }
  }, [generatedPlan, onApplyTasks]);

  // â”€â”€ Regenerate â”€â”€
  const handleRegenerate = useCallback(async () => {
    const userMsgs = messages.filter(m => m.role === "user");
    const lastUserMsg = userMsgs[userMsgs.length - 1];
    if (!lastUserMsg) return;

    setLoading(true);
    setGeneratedPlan(null);
    setApplied(false);

    try {
      const historyPayload = messages.map((m, idx) => {
        const isLastUser = m.role === "user" && idx === messages.map(msg => msg.role).lastIndexOf("user");
        return {
          role: m.role === "user" ? "user" : "assistant",
          content: isLastUser
            ? m.text + "\n\n[System Instruction: Do not ask for deadline, duration, or budget. Decompose it immediately into tasks and mini-tasks (intent: 'success', is_complete: true). Automatically assume reasonable implementation days (1-15 days per story) and generate the full list of tasks/minitasks immediately. Do not respond with intent 'collecting_info'.]"
            : m.text
        };
      });

      const response = await api.ai.sendSession({
        messages_history: historyPayload,
        context_summary: contextSummary || "",
        user_role: "expert",
        current_draft: {
          jobPostId: jobPostId,
          expertId: expertId,
          projectTitle: projectInfo?.title || ""
        }
      });

      const chatMessage = response?.chat_message || response?.ChatMessage || "";
      const payload = response?.payload || response?.Payload;
      const newContextSummary = response?.context_summary || response?.ContextSummary || "";

      setContextSummary(newContextSummary);

      let parsedUseCases = [];
      if (payload && Array.isArray(payload)) {
        parsedUseCases = mapPayloadToProposalFormat(payload, clientUseCases);
      }

      const plan = parsedUseCases.length > 0 ? {
        useCases: parsedUseCases,
        summary: "Plan regenerated successfully."
      } : null;

      setGeneratedPlan(plan);
      setApplied(false);

      const aiMsg = { 
        role: "ai", 
        text: chatMessage || "Plan has been updated.", 
        plan, 
        timestamp: Date.now() 
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI regenerate failed:", err);
      const errMsg = err?.message || "Cannot connect to AI backend.";
      const aiMsg = {
        role: "ai",
        text: `âŒ An error occurred while regenerating plan: ${errMsg}\nPlease try again later.`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages, contextSummary, clientUseCases, jobPostId, expertId, projectInfo]);

  return (
    <div className="h-full flex flex-col">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-2.5 bg-gradient-to-r from-accent/6 via-accent/3 to-primary/3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">ðŸ¤– AI MiniTask Planner</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Generate MiniTasks under existing Client Tasks
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

      {/* â”€â”€ Chat / Messages â”€â”€ */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2.5 space-y-4">
        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">Chat</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Messages */}
        <div className="space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-center py-8">
              <AIProjectIllustration size="sm" className="mx-auto mb-3" />
              <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Ask AI to generate your project plan.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Try: "Generate MiniTasks for all use cases"</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${msg.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md border border-border/50"
                  }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-xl rounded-bl-md px-4 py-2.5 border border-border/50">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-primary animate-pulse" />
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Generated Plan Preview */}
        {generatedPlan && (
          <div className="bg-gradient-to-br from-accent/8 via-accent/4 to-card rounded-xl border border-accent/15 p-4 space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">AI Generated MiniTasks</span>
            </div>

            <div className="space-y-3 max-h-[240px] overflow-y-auto">
              {generatedPlan.useCases.slice(0, 3).map((uc) => (
                <div key={uc.useCaseId} className="bg-secondary/40 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">ðŸ“‹ {uc.useCaseTitle}</p>
                  {uc.tasks.map((t) => (
                    <div key={t.taskId} className="pl-2 border-l-2 border-accent/20 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">{t.taskTitle} <span className="text-muted-foreground font-normal">â€” {t.miniTasks.length} mini</span></p>
                      {t.miniTasks.slice(0, 3).map((m) => (
                        <p key={m.id} className="text-[11px] text-muted-foreground pl-2">â€¢ {m.title}</p>
                      ))}
                      {t.miniTasks.length > 3 && (
                        <p className="text-[11px] text-muted-foreground/60 pl-2">+{t.miniTasks.length - 3} more</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {generatedPlan.useCases.length > 3 && (
                <p className="text-xs text-muted-foreground/60 pl-1">+{generatedPlan.useCases.length - 3} more use cases</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleApply}
                disabled={applied}
                className={`h-10 min-h-10 px-4 text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors ${applied
                    ? "bg-success/10 text-success cursor-default"
                    : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                  }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {applied ? "Applied âœ“" : "Apply MiniTasks"}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={loading}
                className="h-10 min-h-10 px-4 text-sm font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="h-10 min-h-10 px-4 text-sm font-semibold rounded-lg text-accent hover:text-accent-hover hover:bg-accent-light transition-colors inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Continue Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Chat input â”€â”€ */}
      <div className="shrink-0 border-t border-border px-4 py-2.5">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe technical approach â€” AI will generate MiniTasks..."
            disabled={loading}
            className="flex-1 h-10 px-4 border border-border rounded-lg bg-background text-sm placeholder:text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-50 transition-shadow"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 min-h-10 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
