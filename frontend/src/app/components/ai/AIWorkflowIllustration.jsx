import { Bot, Workflow, FileText, Sparkles } from 'lucide-react';

const steps = [
  { icon: FileText, label: "Describe", color: "text-accent" },
  { icon: Bot, label: "AI Analysis", color: "text-warning" },
  { icon: Sparkles, label: "Match", color: "text-warning" },
  { icon: Workflow, label: "Collaborate", color: "text-success" },
];

export function AIWorkflowIllustration() {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-6">
        <Bot className="w-10 h-10 text-accent mx-auto mb-2" />
        <h3 className="font-semibold text-foreground">AI-Powered Workflow</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="text-center p-4">
              <div className="w-12 h-12 bg-secondary border border-border rounded-xl flex items-center justify-center mx-auto mb-2">
                <Icon className={`w-6 h-6 ${step.color}`} />
              </div>
              <p className="text-xs font-medium text-foreground">{step.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
