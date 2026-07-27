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
    ["Data audit", "3 days"],
    ["Model rules", "5 days"],
    ["Admin handoff", "2 days"],
  ];

  const experts = [
    ["ML Ops Specialist", 94, "bg-accent"],
    ["Risk Data Analyst", 88, "bg-success"],
    ["Product Engineer", 81, "bg-warning"],
  ];

  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      <motion.div
        className="relative overflow-hidden rounded-[1.5rem] border border-border bg-card p-4 shadow-sm sm:p-5"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_12%,transparent),transparent)]" />

        <div className="relative grid gap-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Project room
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-foreground">Fraud review assistant</h3>
              </div>
            </div>
            <div className="rounded-xl border border-success/20 bg-success-light px-3 py-1.5 text-xs font-semibold text-success">
              On track
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="rounded-2xl border border-border bg-background/70 p-3">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Scope
              </p>
              <div className="space-y-2">
                {scopeItems.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 ring-1 ring-border">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <span className="text-[11px] text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Expert shortlist
                </p>
                <span className="text-[11px] font-medium text-accent">ranked</span>
              </div>
              <div className="space-y-2">
                {experts.map(([name, score, color]) => (
                  <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-border">
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
              <div key={item.label} className="rounded-2xl border border-border bg-background/70 p-3">
                <item.icon className="mb-2 h-4 w-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-4 top-10 hidden w-44 rounded-2xl border border-border bg-card p-3 shadow-sm sm:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-light text-success">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Expert found</p>
            <p className="text-[11px] text-success">Starts Monday</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -left-5 bottom-10 hidden w-48 rounded-2xl border border-border bg-card p-3 shadow-sm sm:block"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-light text-warning">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Team synced</p>
            <p className="text-[11px] text-muted-foreground">proposal ready</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background px-4 py-[var(--section-y)] sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-[1180px]">
        <div className="mb-10 grid grid-cols-2 gap-3 border-y border-border py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:grid-cols-4">
          <span>Brief intake</span>
          <span>Expert ranking</span>
          <span>Escrow ready</span>
          <span>Delivery tracked</span>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <motion.div
            className="max-w-[39rem] space-y-7"
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Expert marketplace for scoped AI work
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-5">
              <h1 className="text-[3.15rem] font-semibold leading-[0.96] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-[5rem]">
                Hire, escrow, and ship AI work in one room.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                AI Tasker turns a loose brief into a managed workspace: ranked experts, clear proposals, tracked tasks,
                messages and payment records.
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
              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-card">
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
