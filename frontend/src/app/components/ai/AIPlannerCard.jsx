import { Bot, Sparkles } from "lucide-react";

/**
 * AIPlannerCard — Entry-point card for the AI Project Planner.
 *
 * Appears between "Professional Introduction" and "Implementation Timeline &
 * Milestones" on the Send Proposal page.  Clicking "Generate With AI" opens
 * the AI planner drawer.  Manual timeline entry is always available by default.
 *
 * Props:
 *   onGenerateAI — callback when "Generate With AI" is clicked
 *   onCloseAI    — callback to close the AI drawer (shown as subtle link when active)
 *   aiMode       — whether the AI drawer is currently open
 *   disabled     — disable interactions (e.g. while submitting)
 */
export function AIPlannerCard({
  onGenerateAI,
  onCloseAI,
  aiMode = false,
  disabled = false,
}) {
  return (
    <div className="bg-card rounded-xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary-light/30 to-white overflow-hidden">
      <div className="px-6 py-5 flex items-start gap-4">
        {/* Icon */}
        <div className="w-11 h-11 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-brand-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">
            🤖 AI MiniTask Planner
          </h3>

          {!aiMode ? (
            <>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upload notes or describe your technical approach. AI will generate
                detailed MiniTasks under the Client's existing Tasks. Client Use
                Cases and Tasks will remain unchanged.
              </p>
              <button
                type="button"
                onClick={onGenerateAI}
                disabled={disabled}
                className="mt-4 h-11 min-h-11 px-5 text-base font-semibold rounded-[14px] bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Generate MiniTasks
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-0.5">
                AI assistant is ready. Use the right panel to generate or modify
                tasks.
              </p>
              <button
                type="button"
                onClick={onCloseAI}
                disabled={disabled}
                className="mt-3 text-sm text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors inline-flex items-center gap-1"
              >
                Close AI Planner
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
