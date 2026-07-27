import { useState } from "react";
import { Send, Bot, Lightbulb } from "lucide-react";

/**
 * AIChatbox — contextual AI assistant for the project creation flow.
 *
 * Helps clients describe their AI project requirements, suggest categories,
 * estimate budgets, and identify needed skills. Positioned as a helpful
 * sidebar companion during project posting, not as the primary interface.
 */
export function AIChatbox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, isUser: true }]);
    setInput("");
    // TODO: Connect to AI API for smart project drafting
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-secondary/50 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <span className="font-semibold text-foreground text-sm">Project Assistant</span>
          <p className="text-[10px] text-muted-foreground">Powered by AI</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-background">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Need help?</p>
            <p className="text-xs text-muted-foreground">
              Describe your project and I&apos;ll help you write a clear, compelling
              brief that attracts the right experts.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm ${
                  msg.isUser
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-foreground rounded-bl-md shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border flex gap-2 shrink-0 bg-card">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Describe your project idea..."
          className="flex-1 px-4 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-sm"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
