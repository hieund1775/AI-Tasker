import { useState } from "react";
import { Send, Bot } from "lucide-react";

export function AIChatbox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, isUser: true }]);
    setInput("");
    // TODO: Connect to AI API
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-brand-primary-light border-b border-brand-primary/20 flex items-center gap-2 shrink-0">
        <Bot className="w-5 h-5 text-brand-primary" />
        <span className="font-semibold text-brand-primary">AI Assistant</span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Ask me anything about your project</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-xl ${msg.isUser ? "bg-brand-primary text-white" : "bg-gray-100 text-gray-900"}`}>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary"
        />
        <button onClick={handleSend} className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
