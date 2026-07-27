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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100 flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-semibold text-blue-900 text-sm">Project Assistant</span>
          <p className="text-[10px] text-gray-500">Powered by AI</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">Need help?</p>
            <p className="text-xs text-gray-400">
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
                    ? "bg-blue-900 text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 flex gap-2 shrink-0 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Describe your project idea..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
