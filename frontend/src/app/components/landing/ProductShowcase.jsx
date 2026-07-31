import { motion } from "motion/react";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { BarChart3, CheckCircle2, FileCheck2, KanbanSquare, MessageSquare, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";

const showcaseItems = [
  {
    icon: Sparkles,
    title: "Expert matching",
    description: "Recommendations based on skills, budget and project domain.",
    type: "matching",
    color: "text-accent",
    bg: "bg-accent-light",
  },
  {
    icon: KanbanSquare,
    title: "Project workspace",
    description: "Dashboards, proposals, milestones and progress in one place.",
    type: "dashboard",
    color: "text-success",
    bg: "bg-success-light",
  },
  {
    icon: FileCheck2,
    title: "Delivery tracking",
    description: "Tasks, mini-tasks, revisions and approvals stay visible.",
    type: "progress",
    color: "text-warning",
    bg: "bg-warning-light",
  },
  {
    icon: MessageSquare,
    title: "Collaboration",
    description: "Built-in messages keep clients and experts aligned around the work.",
    type: "messages",
    color: "text-destructive",
    bg: "bg-destructive-light",
  },
];

const lineWidths = ["78%", "62%", "86%", "54%"];

function BrowserFrame({ children, label }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
        <div className="ml-3 flex-1 rounded-md bg-background px-3 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
          {label}
        </div>
      </div>
      <div className="bg-background p-4">{children}</div>
    </div>
  );
}

function MatchingMockup() {
  return (
    <div className="space-y-3">
      {["Full-stack AI Engineer", "ML Ops Specialist", "Data Scientist"].map((name, index) => (
        <div key={name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{name}</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${92 - index * 7}%` }} />
            </div>
          </div>
          <span className="rounded-md bg-success-light px-2 py-1 text-[10px] font-semibold text-success">{92 - index * 7}%</span>
        </div>
      ))}
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Active", "12"],
          ["Done", "47"],
          ["Budget", "$28K"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-sm font-semibold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex h-20 items-end gap-1.5 rounded-lg border border-border bg-card p-3">
        {[28, 48, 38, 70, 52, 82, 60, 88, 72, 96].map((height, index) => (
          <div key={index} className="flex-1 rounded-t bg-success/25" style={{ height: `${height}%` }}>
            <div className="h-full rounded-t bg-success/55" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressMockup() {
  return (
    <div className="space-y-4">
      {["Proposal accepted", "Milestone 1", "Client review", "Final delivery"].map((item, index) => (
        <div key={item} className="flex items-center gap-3">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${index < 2 ? "bg-success-light text-success" : "bg-muted text-muted-foreground"}`}>
            {index < 2 ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-foreground">{item}</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-success" style={{ width: index < 2 ? "100%" : lineWidths[index] }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagesMockup() {
  return (
    <div className="space-y-3">
      <div className="max-w-[72%] rounded-lg rounded-bl-md bg-secondary p-3">
        <div className="h-2 rounded-full bg-muted-foreground/20" style={{ width: "88%" }} />
        <div className="mt-2 h-2 rounded-full bg-muted-foreground/14" style={{ width: "58%" }} />
      </div>
      <div className="ml-auto max-w-[78%] rounded-lg rounded-br-md bg-primary p-3">
        <div className="h-2 rounded-full bg-primary-foreground/35" style={{ width: "90%" }} />
        <div className="mt-2 h-2 rounded-full bg-primary-foreground/25" style={{ width: "48%" }} />
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
        <div className="h-2 flex-1 rounded-full bg-muted" />
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive-light text-destructive">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}

function MockupContent({ type }) {
  if (type === "matching") return <MatchingMockup />;
  if (type === "dashboard") return <DashboardMockup />;
  if (type === "progress") return <ProgressMockup />;
  return <MessagesMockup />;
}

function ShowcaseCard({ item, index }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.18, triggerOnce: false });
  const Icon = item.icon;

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 32, scale: 0.98 }}
      transition={{ duration: 0.5, delay: isVisible ? index * 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <BrowserFrame label={`ai-tasker.app/${item.type}`}>
        <MockupContent type={item.type} />
      </BrowserFrame>
      <div className="mt-4 flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg} ${item.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{item.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductShowcase() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: false });

  return (
    <section className="relative overflow-hidden bg-background px-4 py-[var(--section-y)] sm:px-6 lg:px-8">
      <div className="relative mx-auto w-full max-w-[var(--layout-max)]">
        <motion.div
          ref={ref}
          initial={false}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-14 max-w-[44rem] text-center"
        >
          <span className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Platform preview
          </span>
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.015em] text-foreground sm:text-4xl">
            The core work surfaces stay visible
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A compact preview of the actual workflow inside the app: matching, dashboards, project progress and collaboration.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {showcaseItems.map((item, index) => (
            <ShowcaseCard key={item.title} item={item} index={index} />
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: Users, value: "500+", label: "AI experts" },
              { icon: BriefcaseIcon, value: "1,000+", label: "projects supported" },
              { icon: ShieldCheck, value: "Secure", label: "escrow workflow" },
              { icon: WalletCards, value: "Tracked", label: "payments & activity" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-lg bg-secondary/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-accent ring-1 ring-border">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BriefcaseIcon(props) {
  return <WalletCards {...props} />;
}
