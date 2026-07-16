import { motion } from "motion/react";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";
import { BarChart3, CheckCircle2, FileCheck2, KanbanSquare, MessageSquare, ShieldCheck, Sparkles, Users, WalletCards } from "lucide-react";

const showcaseItems = [
  {
    icon: Sparkles,
    title: "AI Matching",
    description: "Expert recommendations based on skills, budget and project domain.",
    type: "matching",
    color: "text-accent",
    bg: "bg-accent-light",
  },
  {
    icon: KanbanSquare,
    title: "Project Workspace",
    description: "Dashboards, proposals, milestones and progress in one workspace.",
    type: "dashboard",
    color: "text-success",
    bg: "bg-success-light",
  },
  {
    icon: FileCheck2,
    title: "Delivery Tracking",
    description: "Tasks, mini-tasks, revisions and approvals stay visible.",
    type: "progress",
    color: "text-warning",
    bg: "bg-warning-light",
  },
  {
    icon: MessageSquare,
    title: "Collaboration",
    description: "Built-in messages keep clients and experts aligned.",
    type: "messages",
    color: "text-destructive",
    bg: "bg-destructive-light",
  },
];

const lineWidths = ["78%", "62%", "86%", "54%"];

function BrowserFrame({ children, label }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-foreground/5">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
        <div className="ml-3 flex-1 rounded-full bg-background px-3 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
          {label}
        </div>
      </div>
      <div className="bg-gradient-to-br from-background to-secondary/40 p-5">{children}</div>
    </div>
  );
}

function MatchingMockup() {
  return (
    <div className="space-y-3">
      {["Full-stack AI Engineer", "ML Ops Specialist", "Data Scientist"].map((name, index) => (
        <div key={name} className="flex items-center gap-3 rounded-xl border border-border bg-card/75 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-light text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{name}</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${92 - index * 7}%` }} />
            </div>
          </div>
          <span className="rounded-full bg-success-light px-2 py-1 text-[10px] font-bold text-success">{92 - index * 7}%</span>
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
          <div key={label} className="rounded-xl border border-border bg-card/75 p-3 text-center">
            <p className="text-base font-bold text-foreground">{value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex h-20 items-end gap-1.5 rounded-xl border border-border bg-card/60 p-3">
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
      <div className="max-w-[72%] rounded-2xl rounded-bl-md bg-secondary p-3">
        <div className="h-2 rounded-full bg-muted-foreground/20" style={{ width: "88%" }} />
        <div className="mt-2 h-2 rounded-full bg-muted-foreground/14" style={{ width: "58%" }} />
      </div>
      <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-md bg-primary p-3">
        <div className="h-2 rounded-full bg-primary-foreground/35" style={{ width: "90%" }} />
        <div className="mt-2 h-2 rounded-full bg-primary-foreground/25" style={{ width: "48%" }} />
      </div>
      <div className="flex items-center gap-2 rounded-full border border-border bg-card p-2">
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
      <div className="mt-5 flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color} ring-1 ring-current/10`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">{item.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductShowcase() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: false });

  return (
    <section className="relative overflow-hidden bg-background px-4 py-24 sm:px-6 lg:px-8">
      <div className="ai-homepage-grid absolute inset-0 pointer-events-none opacity-50" />
      <div className="absolute left-1/2 top-0 h-64 w-[720px] -translate-x-1/2 rounded-full bg-accent-light blur-3xl pointer-events-none" />
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          ref={ref}
          initial={false}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <BarChart3 className="h-3.5 w-3.5" />
            Platform preview
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything needed to manage AI project work</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            A visual preview of the real workflow inside the app: matching, dashboards, project progress and collaboration.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {showcaseItems.map((item, index) => (
            <ShowcaseCard key={item.title} item={item} index={index} />
          ))}
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: Users, value: "500+", label: "AI experts" },
              { icon: BriefcaseIcon, value: "1,000+", label: "projects supported" },
              { icon: ShieldCheck, value: "Secure", label: "escrow workflow" },
              { icon: WalletCards, value: "Tracked", label: "payments & activity" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-accent ring-1 ring-border">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
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
