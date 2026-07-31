import { useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="bg-card rounded-2xl shadow-2xl border border-border w-80 mb-4 overflow-hidden">
          <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="p-4 h-64 overflow-y-auto">
            <div className="text-center py-8">
              <Bot className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Hi! How can I help you today?</p>
            </div>
          </div>
          <div className="p-3 border-t flex gap-2">
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Type a message..." />
            <button className="p-2 bg-primary text-primary-foreground rounded-lg"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg hover:bg-primary-hover flex items-center justify-center">
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
