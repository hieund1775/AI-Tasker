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

// =============================================================================
// Mock AI — simulates an AI response that generates task/milestone structures.
// Replace with real API call when backend is available.
// =============================================================================

function generateId() {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildMockPlan(userMessage, fileNames) {
  const msg = (userMessage || "").toLowerCase();
  const hasFiles = fileNames.length > 0;
  const fileContext = hasFiles ? fileNames.join(", ") : "";

  let tasks = [
    {
      id: generateId(),
      title: "Requirement Analysis",
      miniTasks: [
        { id: generateId(), title: "Gather and document requirements" },
        { id: generateId(), title: "Define project scope" },
        { id: generateId(), title: "Prepare technical specification" },
      ],
    },
    {
      id: generateId(),
      title: "Backend Development",
      miniTasks: [
        { id: generateId(), title: "Database design & schema creation" },
        { id: generateId(), title: "API development & documentation" },
        { id: generateId(), title: "Authentication & authorization" },
      ],
    },
    {
      id: generateId(),
      title: "Frontend Development",
      miniTasks: [
        { id: generateId(), title: "UI component implementation" },
        { id: generateId(), title: "API integration & state management" },
        { id: generateId(), title: "Responsive design & cross-browser testing" },
      ],
    },
    {
      id: generateId(),
      title: "Testing & Deployment",
      miniTasks: [
        { id: generateId(), title: "Unit & integration testing" },
        { id: generateId(), title: "Performance optimization" },
        { id: generateId(), title: "Deployment & go-live" },
      ],
    },
  ];

  if (msg.includes("react") || msg.includes("frontend") || msg.includes("ui")) {
    tasks = [
      {
        id: generateId(),
        title: "Project Setup & Architecture",
        miniTasks: [
          { id: generateId(), title: "Initialize React project with Vite" },
          { id: generateId(), title: "Set up routing & folder structure" },
          { id: generateId(), title: "Configure Tailwind & design tokens" },
        ],
      },
      {
        id: generateId(),
        title: "UI Development",
        miniTasks: [
          { id: generateId(), title: "Build reusable component library" },
          { id: generateId(), title: "Implement page layouts & navigation" },
          { id: generateId(), title: "Add animations & micro-interactions" },
        ],
      },
      {
        id: generateId(),
        title: "State Management & API Integration",
        miniTasks: [
          { id: generateId(), title: "Set up API service layer" },
          { id: generateId(), title: "Implement data fetching & caching" },
          { id: generateId(), title: "Add form validation & error handling" },
        ],
      },
      {
        id: generateId(),
        title: "Testing & Launch",
        miniTasks: [
          { id: generateId(), title: "Write component & integration tests" },
          { id: generateId(), title: "Performance audit & optimization" },
          { id: generateId(), title: "Production build & deployment" },
        ],
      },
    ];
  }

  if (msg.includes("api") || msg.includes("backend") || msg.includes("node") || msg.includes("express") || msg.includes("database")) {
    tasks = [
      {
        id: generateId(),
        title: "Database Design",
        miniTasks: [
          { id: generateId(), title: "Design ERD & schema models" },
          { id: generateId(), title: "Set up migrations & seeders" },
          { id: generateId(), title: "Implement database indexes & optimization" },
        ],
      },
      {
        id: generateId(),
        title: "API Development",
        miniTasks: [
          { id: generateId(), title: "Build RESTful endpoint structure" },
          { id: generateId(), title: "Implement middleware & validation" },
          { id: generateId(), title: "Add authentication (JWT/OAuth)" },
        ],
      },
      {
        id: generateId(),
        title: "Business Logic & Services",
        miniTasks: [
          { id: generateId(), title: "Implement core business rules" },
          { id: generateId(), title: "Add file upload & storage" },
          { id: generateId(), title: "Email/notification integration" },
        ],
      },
      {
        id: generateId(),
        title: "Testing & DevOps",
        miniTasks: [
          { id: generateId(), title: "Write unit & e2e tests" },
          { id: generateId(), title: "Set up CI/CD pipeline" },
          { id: generateId(), title: "Dockerize & deploy" },
        ],
      },
    ];
  }

  if (msg.includes("mobile") || msg.includes("app") || msg.includes("ios") || msg.includes("android")) {
    tasks = [
      {
        id: generateId(),
        title: "UI/UX Design",
        miniTasks: [
          { id: generateId(), title: "Create wireframes & prototypes" },
          { id: generateId(), title: "Design component system" },
          { id: generateId(), title: "User flow & navigation design" },
        ],
      },
      {
        id: generateId(),
        title: "Core Development",
        miniTasks: [
          { id: generateId(), title: "Set up project architecture" },
          { id: generateId(), title: "Implement navigation & routing" },
          { id: generateId(), title: "Build core feature screens" },
        ],
      },
      {
        id: generateId(),
        title: "Backend Integration",
        miniTasks: [
          { id: generateId(), title: "API integration layer" },
          { id: generateId(), title: "Offline data & sync" },
          { id: generateId(), title: "Push notifications" },
        ],
      },
      {
        id: generateId(),
        title: "Testing & Release",
        miniTasks: [
          { id: generateId(), title: "Unit & UI testing" },
          { id: generateId(), title: "Beta testing & bug fixes" },
          { id: generateId(), title: "App Store submission" },
        ],
      },
    ];
  }

  if (msg.includes("30") && (msg.includes("day") || msg.includes("sprint"))) {
    tasks.push({
      id: generateId(),
      title: "Deployment & Handover",
      miniTasks: [
        { id: generateId(), title: "Staging environment setup" },
        { id: generateId(), title: "Production deployment" },
        { id: generateId(), title: "Documentation & knowledge transfer" },
      ],
    });
  }

  if (msg.includes("split") && msg.includes("backend")) {
    const backendIdx = tasks.findIndex((t) => t.title.toLowerCase().includes("backend"));
    if (backendIdx >= 0) {
      const backend = tasks[backendIdx];
      const mid = Math.ceil(backend.miniTasks.length / 2);
      tasks.splice(backendIdx, 1, {
        id: generateId(),
        title: "Backend — Part 1",
        miniTasks: backend.miniTasks.slice(0, mid),
      });
      tasks.splice(backendIdx + 1, 0, {
        id: generateId(),
        title: "Backend — Part 2",
        miniTasks: backend.miniTasks.slice(mid).length > 0 ? backend.miniTasks.slice(mid) : [{ id: generateId(), title: "Remaining backend work" }],
      });
    }
  }

  const totalTasks = tasks.length;
  const totalMilestones = tasks.reduce((sum, t) => sum + t.miniTasks.length, 0);

  let summary = `Generated ${totalTasks} tasks with ${totalMilestones} milestones.`;
  if (hasFiles) summary += ` Analyzed ${fileContext}.`;
  summary += " Review and apply to populate your timeline.";

  return { tasks, summary };
}

// =============================================================================
// AIPlannerPanel — inline right-side panel with chat, file upload & plan preview.
// =============================================================================

/**
 * Props:
 *   onClose       — callback to close the panel
 *   projectInfo   — { title, category } for context
 *   onApplyTasks  — callback(tasks[]) when user clicks "Apply Plan"
 *   existingTasks — current tasks in the form
 */
export function AIPlannerPanel({ onClose, projectInfo = {}, onApplyTasks, existingTasks = [] }) {
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
      const plan = buildMockPlan(trimmed, fileNames);
      setGeneratedPlan(plan);
      setApplied(false);

      const aiMsg = { role: "ai", text: plan.summary, plan, timestamp: Date.now() };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
    }, 1200 + Math.random() * 800);
  }, [input, loading, files]);

  // ── Apply plan ──
  const handleApply = useCallback(() => {
    if (generatedPlan?.tasks) {
      onApplyTasks(generatedPlan.tasks);
      setApplied(true);
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
      <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900">🤖 AI Project Planner</h2>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            Chat with AI to generate Tasks &amp; Milestones
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 font-semibold transition-colors"
        >
          Close
        </button>
      </div>

      {/* ── Upload Requirements ── */}
      <div className="shrink-0 px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          📎 Upload Requirements
        </p>
        <AIFileUploadZone files={files} onFilesChange={handleFilesChange} disabled={loading} />
      </div>

      {/* ── Chat / Messages ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">Chat</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Messages */}
        <div className="space-y-3">
          {messages.length === 0 && !loading && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Ask AI to generate your project plan.</p>
              <p className="text-sm text-gray-300 mt-1">Try: "Generate tasks for a React project"</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-primary text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-primary animate-pulse" />
                  <span className="text-sm text-gray-500">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Generated Plan Preview */}
        {generatedPlan && (
          <div className="bg-gradient-to-br from-brand-primary-light/20 to-white rounded-xl border border-brand-primary/20 p-4 space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-primary" />
              <span className="text-sm font-semibold text-brand-primary">AI Generated Plan</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 text-gray-700">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                {generatedPlan.tasks.length} Tasks
              </span>
              <span className="inline-flex items-center gap-1 text-gray-700">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                {generatedPlan.tasks.reduce((s, t) => s + t.miniTasks.length, 0)} Milestones
              </span>
            </div>

            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {generatedPlan.tasks.slice(0, 4).map((task, idx) => (
                <div key={task.id} className="text-sm">
                  <p className="font-semibold text-gray-800">{idx + 1}. {task.title}</p>
                  <div className="pl-5 space-y-0.5 mt-0.5">
                    {task.miniTasks.slice(0, 3).map((m) => (
                      <p key={m.id} className="text-xs text-gray-500">• {m.title}</p>
                    ))}
                    {task.miniTasks.length > 3 && (
                      <p className="text-xs text-gray-400">+{task.miniTasks.length - 3} more</p>
                    )}
                  </div>
                </div>
              ))}
              {generatedPlan.tasks.length > 4 && (
                <p className="text-xs text-gray-400 pl-1">+{generatedPlan.tasks.length - 4} more tasks</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleApply}
                disabled={applied}
                className={`h-10 min-h-10 px-4 text-sm font-semibold rounded-[14px] inline-flex items-center gap-1.5 transition-colors ${
                  applied
                    ? "bg-green-100 text-green-700 cursor-default"
                    : "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-sm"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {applied ? "Applied ✓" : "Apply Plan"}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={loading}
                className="h-10 min-h-10 px-4 text-sm font-semibold rounded-[14px] border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="h-10 min-h-10 px-4 text-sm font-semibold rounded-[14px] text-brand-primary hover:text-brand-primary-hover hover:bg-brand-primary-light transition-colors inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Continue Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Chat input ── */}
      <div className="shrink-0 border-t border-gray-100 px-4 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to generate or modify tasks..."
            disabled={loading}
            className="flex-1 h-10 px-4 border border-gray-300 rounded-[14px] text-sm placeholder:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 min-h-10 px-4 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover transition-colors inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Keep backward-compatible named export
export { AIPlannerPanel as AIPlannerDrawer };
