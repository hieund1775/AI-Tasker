import { Bot, Star, Clock } from "lucide-react";

export function AIProjectCard() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-accent" />
        <span className="text-sm font-semibold text-primary">AI Project Analysis</span>
      </div>

      <div className="text-center py-8">
        <Bot className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">AI Analysis Ready</h3>
        <p className="text-sm text-muted-foreground/70">AI will analyze and recommend experts for your project.</p>
      </div>
    </div>
  );
}
