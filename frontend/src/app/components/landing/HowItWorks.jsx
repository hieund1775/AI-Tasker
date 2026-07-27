import { FileText, Handshake, Sparkles, Users } from "lucide-react";
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
      <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-150 hover:border-input">
        <div className="relative flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.bg} ${step.accent}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground ring-1 ring-border">
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
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
    </motion.div>
  );
}

export function HowItWorks() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2, triggerOnce: false });

  return (
    <section className="relative overflow-hidden bg-secondary/30 px-4 py-[var(--section-y)] sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-[1180px]">
        <motion.div
          ref={ref}
          initial={false}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-16 max-w-[42rem] text-center"
        >
          <span className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            How it works
          </span>
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-foreground sm:text-3xl">A clear flow from project idea to paid delivery</h2>
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
