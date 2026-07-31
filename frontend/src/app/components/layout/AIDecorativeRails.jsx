import {
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  Cpu,
  FileText,
  Layers,
  MessageSquare,
  Network,
  Search,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

const leftRailItems = [
  { Icon: Bot, label: "AI assistant" },
  { Icon: FileText, label: "Project brief" },
  { Icon: Users, label: "Expert matching" },
  { Icon: MessageSquare, label: "Collaboration" },
];

const rightRailItems = [
  { Icon: Search, label: "Discovery" },
  { Icon: Briefcase, label: "Project work" },
  { Icon: Layers, label: "Task planning" },
  { Icon: WalletCards, label: "Payments" },
  { Icon: CheckCircle2, label: "Delivery" },
];

function RailCluster({ side, items }) {
  return (
    <div className={`ai-decorative-rail ai-decorative-rail-${side}`} aria-hidden="true">
      {items.map(({ Icon, label }, index) => (
        <div key={label} className="ai-rail-node" style={{ "--rail-index": index }}>
          <Icon className="h-5 w-5" strokeWidth={1.65} />
        </div>
      ))}
    </div>
  );
}

export function AIDecorativeRails() {
  return (
    <div className="ai-decorative-rails" aria-hidden="true">
      <div className="ai-rail-orbit ai-rail-orbit-left" />
      <div className="ai-rail-orbit ai-rail-orbit-right" />
      <Sparkles className="ai-rail-spark ai-rail-spark-left h-4 w-4" strokeWidth={1.7} />
      <Sparkles className="ai-rail-spark ai-rail-spark-right h-4 w-4" strokeWidth={1.7} />
      <div className="ai-image-panel ai-image-panel-left">
        <div className="ai-image-core">
          <Bot className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <div className="ai-image-grid">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="ai-image-panel ai-image-panel-right">
        <div className="ai-image-core">
          <Building2 className="h-7 w-7" strokeWidth={1.5} />
          <Network className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="ai-image-flow">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="ai-business-visual ai-business-visual-left">
        <div className="ai-visual-header">
          <Cpu className="h-4 w-4" strokeWidth={1.7} />
          <span />
        </div>
        <div className="ai-visual-network">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="ai-visual-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="ai-business-visual ai-business-visual-right">
        <div className="ai-visual-header">
          <Building2 className="h-4 w-4" strokeWidth={1.7} />
          <Network className="h-4 w-4" strokeWidth={1.7} />
        </div>
        <div className="ai-visual-chart">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="ai-visual-avatar-row">
          <span />
          <span />
          <span />
        </div>
      </div>
      <RailCluster side="left" items={leftRailItems} />
      <RailCluster side="right" items={rightRailItems} />
    </div>
  );
}

export default AIDecorativeRails;

