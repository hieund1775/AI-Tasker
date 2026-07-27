import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  LockKeyhole,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function HeroProductMap() {
  const scopeItems = [
    ["Brief locked", "2 files"],
    ["Proposal review", "6 experts"],
    ["Delivery board", "12 tasks"],
  ];

  const experts = [
    ["Automation architect", 94, "bg-accent"],
    ["ML product engineer", 88, "bg-success"],
    ["Data workflow lead", 81, "bg-warning"],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[590px]">
      <motion.div
        className="relative overflow-hidden rounded-[1.35rem] border border-border/80 bg-card p-3 shadow-[0_28px_70px_color-mix(in_srgb,var(--foreground)_12%,transparent)] sm:p-4"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_38%),linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_4%,transparent),transparent)]" />

        <div className="relative grid gap-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/80 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-inner shadow-white/10">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Project room
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-foreground">Support automation rebuild</h3>
              </div>
            </div>
            <div className="rounded-lg border border-success/20 bg-success-light px-3 py-1.5 text-xs font-semibold text-success">
              On track
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="rounded-xl border border-border bg-background/75 p-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Scope
              </p>
              <div className="space-y-2">
                {scopeItems.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 ring-1 ring-border">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <span className="text-[11px] text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/75 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Expert shortlist
                </p>
                <span className="text-[11px] font-medium text-accent">ranked</span>
              </div>
              <div className="space-y-2">
                {experts.map(([name, score, color]) => (
                  <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-card px-3 py-2 ring-1 ring-border">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-foreground">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Match", value: "94%", icon: Sparkles },
              { label: "Escrow", value: "Locked", icon: LockKeyhole },
              { label: "Tasks", value: "12/15", icon: CheckCircle2 },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background/75 p-3">
                <item.icon className="mb-2 h-4 w-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-4 top-10 hidden w-44 rounded-xl border border-border bg-card p-3 shadow-[0_18px_45px_color-mix(in_srgb,var(--foreground)_10%,transparent)] sm:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-light text-success">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Expert matched</p>
            <p className="text-[11px] text-success">6 proposals ready</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -left-5 bottom-10 hidden w-48 rounded-xl border border-border bg-card p-3 shadow-[0_18px_45px_color-mix(in_srgb,var(--foreground)_10%,transparent)] sm:block"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-light text-warning">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Client synced</p>
            <p className="text-[11px] text-muted-foreground">milestone approved</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background px-4 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_12%,color-mix(in_srgb,var(--accent)_15%,transparent),transparent_28rem),radial-gradient(circle_at_82%_18%,color-mix(in_srgb,var(--success)_9%,transparent),transparent_24rem)]" />
      <div className="relative mx-auto max-w-[1180px]">
        <div className="mb-10 grid grid-cols-2 gap-3 border-y border-border/80 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:grid-cols-4">
          <span>Brief intake</span>
          <span>Expert ranking</span>
          <span>Escrow ready</span>
          <span>Delivery tracked</span>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <motion.div
            className="max-w-[39rem] space-y-7"
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Structured marketplace for AI project delivery
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-5">
              <h1 className="max-w-[10ch] text-[3.25rem] font-extrabold leading-[0.92] tracking-[-0.025em] text-foreground sm:text-6xl lg:text-[5.35rem]">
                Scope. Compare. Ship AI work.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                AI Tasker turns a loose request into a managed project room with ranked experts, proposal comparison,
                tracked tasks, messages and payment records.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="group inline-flex h-11 min-w-32 items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-hover"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground shadow-sm transition-colors duration-200 hover:bg-secondary"
              >
                Sign In
                <Users className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 pt-2 text-sm text-muted-foreground">
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-card">
                {["Scope", "Match", "Ship"].map((label) => (
                  <span key={label} className="px-3 py-2 text-xs font-semibold text-foreground ring-1 ring-border/60">
                    {label}
                  </span>
                ))}
              </div>
              <span>from project post to paid delivery</span>
            </motion.div>
          </motion.div>

          <HeroProductMap />
        </div>
      </div>
    </section>
  );
}
