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
import { AIFileUploadZone } from "./AIFileUploadZone.jsx";
import { AIProjectIllustration } from "../shared/illustrations/AIProjectIllustration.jsx";

// =============================================================================
// Mock AI — generates MiniTasks under existing Client Tasks, preserving
// Client Use Case and Task names. Never creates new Task titles.
// =============================================================================

function generateId() {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Build mock MiniTask plan grouped by use case → task.
 * @param {string} userMessage
 * @param {string[]} fileNames
 * @param {Array} clientUseCases — [{ id, title, tasks: [{id, title}] }]
 * @returns {{ useCases: Array, summary: string }}
 */
function buildMockPlan(userMessage, fileNames, clientUseCases = []) {
  const msg = (userMessage || "").toLowerCase();
  const hasFiles = fileNames.length > 0;
  const fileContext = hasFiles ? fileNames.join(", ") : "";

  // Base miniTask templates
  const baseMiniTaskSets = {
    analysis: [
      { title: "Review requirements & acceptance criteria" },
      { title: "Identify edge cases and constraints" },
      { title: "Document technical approach" },
    ],
    implementation: [
      { title: "Implement core logic" },
      { title: "Add error handling & validation" },
      { title: "Write unit tests" },
    ],
    integration: [
      { title: "Integrate with existing modules" },
      { title: "End-to-end testing" },
      { title: "Code review & cleanup" },
    ],
    delivery: [
      { title: "Prepare deployment package" },
      { title: "Write documentation" },
      { title: "Final QA check" },
    ],
  };

  let selectedTemplates = [baseMiniTaskSets.analysis, baseMiniTaskSets.implementation, baseMiniTaskSets.integration, baseMiniTaskSets.delivery];

  // Customize based on message context
  if (msg.includes("frontend") || msg.includes("ui") || msg.includes("react")) {
    selectedTemplates = [
      [{ title: "Review design mockups & component specs" }, { title: "Set up component structure" }],
      [{ title: "Implement UI components" }, { title: "Add styles & responsive layout" }, { title: "Wire up interactions" }],
      [{ title: "Connect to API endpoints" }, { title: "Add loading & error states" }],
      [{ title: "Cross-browser testing" }, { title: "Accessibility audit" }, { title: "Performance optimization" }],
    ];
  }
  if (msg.includes("backend") || msg.includes("api") || msg.includes("database")) {
    selectedTemplates = [
      [{ title: "Design data model & schema" }, { title: "Set up database migrations" }],
      [{ title: "Implement API endpoints" }, { title: "Add validation middleware" }, { title: "Write integration tests" }],
      [{ title: "Implement business logic" }, { title: "Add authentication/authorization" }],
      [{ title: "API documentation" }, { title: "Performance testing" }, { title: "Deployment config" }],
    ];
  }

  // Build for each use case → each task
  const useCases = (clientUseCases || []).map((uc) => {
    const ucTitle = uc.title || uc.nameAndDeadline || "Use Case";
    const existingTasks = uc.tasks && uc.tasks.length > 0
      ? uc.tasks
      : [{ id: `task-fb-${uc.id || generateId()}`, title: ucTitle, description: uc.description || "", source: "client_use_case_fallback", locked: true }];

    const tasks = existingTasks.map((task, tIdx) => {
      // Pick template set cyclically
      const templateSet = selectedTemplates[tIdx % selectedTemplates.length];
      const miniTasks = templateSet.map((mt) => ({
        id: generateId(),
        title: mt.title,
        description: mt.description || "",
        status: "pending",
        isCompleted: false,
      }));

      return {
        taskId: task.id,
        taskTitle: task.title,       // read-only, preserved
        taskSource: task.source || (tIdx < (uc.tasks?.length || 0) ? "client" : "client_use_case_fallback"),
        taskLocked: task.locked !== false,
        miniTasks,
      };
    });

    return { useCaseId: uc.id, useCaseTitle: ucTitle, tasks };
  });

  const totalTasks = useCases.reduce((s, uc) => s + uc.tasks.length, 0);
  const totalMiniTasks = useCases.reduce((s, uc) => s + uc.tasks.reduce((ss, t) => ss + t.miniTasks.length, 0), 0);

  let summary = `Generated ${totalMiniTasks} MiniTasks across ${totalTasks} Tasks in ${useCases.length} Use Cases.`;
  if (hasFiles) summary += ` Analyzed ${fileContext}.`;
  summary += " Client Use Cases and Task names are preserved.";

  return { useCases, summary };
}

// =============================================================================
// AIPlannerPanel — inline right-side panel with chat, file upload & plan preview.
// =============================================================================

/**
 * Props:
 *   onClose        — callback to close the panel
 *   projectInfo    — { title, category } for context
 *   onApplyTasks   — callback(tasks[]) when user clicks "Apply MiniTasks"
 *   existingTasks  — current tasks in the form
 *   clientUseCases — [{ id, title, tasks: [{id, title}] }] from the job post
 */
export function AIPlannerPanel({ onClose, projectInfo = {}, onApplyTasks, existingTasks = [], clientUseCases = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, generatedPlan]);

  // ── Send message ──
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", text: trimmed, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const fileNames = files.map((f) => f.name);
      const plan = buildMockPlan(trimmed, fileNames, clientUseCases);
      setGeneratedPlan(plan);
      setApplied(false);

      const aiMsg = { role: "ai", text: plan.summary, plan, timestamp: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1200 + Math.random() * 800);
  }, [input, loading, files]);

  // ── Apply plan ──
  const handleApply = useCallback(() => {
    if (generatedPlan?.useCases) {
      const result = onApplyTasks({ useCases: generatedPlan.useCases });
      // ponytail: only show "Applied" if tasks were actually updated
      if (result && result.updatedCount > 0) {
        setApplied(true);
      }
    }
  }, [generatedPlan, onApplyTasks]);

  // ── Regenerate ──
  const handleRegenerate = useCallback(() => {
    setLoading(true);
    setGeneratedPlan(null);
    setApplied(false);

    setTimeout(() => {
      const fileNames = files.map((f) => f.name);
      const plan = buildMockPlan(messages.map((m) => m.text).join(" "), fileNames);
      setGeneratedPlan(plan);

      const aiMsg = { role: "ai", text: "Regenerated plan:\n\n" + plan.summary, plan, timestamp: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1000 + Math.random() * 600);
  }, [messages, files]);

  // ── File upload handler ──
  const handleFilesChange = useCallback((newFiles) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      const names = newFiles.map((f) => f.name).join(", ");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "user" && last.text.includes("Uploaded file")) return prev;
        return [...prev, { role: "user", text: `Uploaded file(s): ${names}`, timestamp: Date.now() }];
      });
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3 bg-gradient-to-r from-accent/6 via-accent/3 to-primary/3">
        <div>
          <h2 className="text-sm font-bold text-foreground">🤖 AI MiniTask Planner</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Generate MiniTasks under existing Client Tasks
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          Close
        </button>
      </div>

      {/* ── Upload Requirements ── */}
      <div className="shrink-0 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          📎 Upload Requirements
        </p>
        <AIFileUploadZone files={files} onFilesChange={handleFilesChange} disabled={loading} />
      </div>

      {/* ── Chat / Messages ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
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
                className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
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
              <div className="bg-secondary rounded-xl rounded-bl-md px-4 py-3 border border-border/50">
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
                  <p className="text-xs font-bold text-foreground/70 uppercase tracking-wide">📋 {uc.useCaseTitle}</p>
                  {uc.tasks.map((t) => (
                    <div key={t.taskId} className="pl-2 border-l-2 border-accent/20 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">{t.taskTitle} <span className="text-muted-foreground font-normal">— {t.miniTasks.length} mini</span></p>
                      {t.miniTasks.slice(0, 3).map((m) => (
                        <p key={m.id} className="text-[11px] text-muted-foreground pl-2">• {m.title}</p>
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
                className={`h-10 min-h-10 px-4 text-sm font-semibold rounded-[14px] inline-flex items-center gap-1.5 transition-colors ${
                  applied
                    ? "bg-success/10 text-success cursor-default"
                    : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {applied ? "Applied ✓" : "Apply MiniTasks"}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={loading}
                className="h-10 min-h-10 px-4 text-sm font-semibold rounded-[14px] border border-border bg-card text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="h-10 min-h-10 px-4 text-sm font-semibold rounded-[14px] text-accent hover:text-accent-hover hover:bg-accent-light transition-colors inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Continue Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Chat input ── */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe technical approach — AI will generate MiniTasks..."
            disabled={loading}
            className="flex-1 h-10 px-4 border border-border rounded-[14px] bg-background text-sm placeholder:text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-50 transition-shadow"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 min-h-10 px-4 bg-primary text-primary-foreground rounded-[14px] hover:bg-primary-hover transition-colors inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
