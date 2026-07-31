import { FileText, Handshake, Sparkles, Users } from "lucide-react";
import { motion } from "motion/react";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";

const steps = [
  {
    icon: FileText,
    title: "Turn the request into a brief",
    description: "Clients enter goals, constraints, budget and delivery timing in a structured project post.",
    accent: "text-accent",
    bg: "bg-accent-light",
  },
  {
    icon: Sparkles,
    title: "Shortlist experts by fit",
    description: "The marketplace surfaces experts whose skills and project history match the brief.",
    accent: "text-warning",
    bg: "bg-warning-light",
  },
  {
    icon: Users,
    title: "Compare proposals side by side",
    description: "Clients review scope, timeline, cost and expert profile before making a decision.",
    accent: "text-success",
    bg: "bg-success-light",
  },
  {
    icon: Handshake,
    title: "Track the work to delivery",
    description: "Accepted proposals become project rooms with tasks, messages and payment records.",
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
      <div className="group relative h-full overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-colors duration-150 hover:border-input md:p-6">
        <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_3%,transparent),transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.bg} ${step.accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border">
              {index + 1}
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-[-0.005em] text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        </div>
      </div>
      {index < steps.length - 1 && (
        <div className="absolute left-[calc(100%+0.75rem)] top-1/2 hidden w-10 items-center lg:flex">
          <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
      )}
    </motion.div>
  );
}

export function HowItWorks() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: false });

  return (
    <section className="relative overflow-hidden bg-secondary/35 px-4 py-[var(--section-y)] sm:px-6 lg:px-8">
      <div className="relative mx-auto w-full max-w-[var(--layout-max)]">
        <motion.div
          ref={ref}
          initial={false}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14 grid gap-6 md:grid-cols-[0.72fr_1fr] md:items-end"
        >
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              How it works
            </span>
            <h2 className="max-w-[11ch] text-3xl font-bold leading-[1.02] tracking-[-0.015em] text-foreground sm:text-4xl">
              A clean path from brief to delivery
            </h2>
          </div>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:justify-self-end">
            The public flow now mirrors the product: create a brief, evaluate the right expert, confirm the proposal,
            then manage work in a tracked room.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
