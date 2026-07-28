import { FileText, Handshake, Rocket, Sparkles, Users } from "lucide-react";
import { motion } from "motion/react";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";

const steps = [
  {
    icon: FileText,
    title: "Post a real project brief",
    description: "Clients share goals, budget, skills and timeline in a structured project post.",
    accent: "text-accent",
    bg: "bg-accent-light",
  },
  {
    icon: Sparkles,
    title: "AI ranks suitable experts",
    description: "The platform highlights experts that match the project needs and domain.",
    accent: "text-warning",
    bg: "bg-warning-light",
  },
  {
    icon: Users,
    title: "Review proposals clearly",
    description: "Clients compare proposals, experts, budgets and delivery timelines before hiring.",
    accent: "text-success",
    bg: "bg-success-light",
  },
  {
    icon: Handshake,
    title: "Collaborate to delivery",
    description: "Accepted work becomes a tracked project with tasks, messages and payment records.",
    accent: "text-destructive",
    bg: "bg-destructive-light",
  },
];

function StepCard({ step, index }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: false });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.98 }}
      transition={{ duration: 0.45, delay: isVisible ? index * 0.08 : 0, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-foreground/5">
        <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.bg} ${step.accent} ring-1 ring-current/10`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground ring-1 ring-border">
              {index + 1}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        </div>
      </div>
      {index < steps.length - 1 && (
        <div className="absolute left-[calc(100%+0.75rem)] top-1/2 hidden w-10 items-center lg:flex">
          <div className="h-px flex-1 bg-gradient-to-r from-border via-muted-foreground/30 to-transparent" />
          <Rocket className="ml-1 h-4 w-4 text-muted-foreground/50" />
        </div>
      )}
    </motion.div>
  );
}

export function HowItWorks() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: false });

  return (
    <section className="relative overflow-hidden bg-secondary/25 px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,var(--accent-light),transparent_45%)]" />
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          ref={ref}
          initial={false}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            How it works
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">A clear flow from project idea to paid delivery</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            The homepage now explains the actual product workflow: post project, match experts, review proposals, and manage delivery.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
