import { ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, LockKeyhole, MessageSquare, Search, Sparkles, Users } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { useState, useEffect, useCallback } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function WorkflowNode({ icon: Icon, label, detail, className = "" }) {
  return (
    <div className={`rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-xl ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent ring-1 ring-accent/15">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function HeroProductMap() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_45%,var(--accent-light),transparent_58%)] blur-2xl" />
      <motion.div
        className="relative overflow-hidden rounded-[2rem] border border-border bg-card/85 p-6 shadow-2xl shadow-foreground/5 backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--accent-light),transparent_42%,var(--success-light))] opacity-70" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        <div className="relative">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">AI project workflow</p>
              <h3 className="mt-2 text-xl font-bold text-foreground">From brief to delivery</h3>
            </div>
            <div className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
              Live workspace
            </div>
          </div>

          <div className="relative grid gap-3">
            <WorkflowNode icon={FileText} label="Client posts a project" detail="Budget, skills, deadline and project scope are structured clearly." />
            <div className="ml-10 h-6 w-px bg-gradient-to-b from-border via-accent/50 to-border" />
            <WorkflowNode icon={Search} label="AI matches experts" detail="Experts are ranked by skill fit, availability and project history." className="ml-8" />
            <div className="ml-20 h-6 w-px bg-gradient-to-b from-border via-success/50 to-border" />
            <WorkflowNode icon={BriefcaseBusiness} label="Proposal becomes project" detail="Accepted proposal generates progress, tasks, payments and messages." className="ml-16" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: "Match", value: "96%", icon: Sparkles },
              { label: "Escrow", value: "Safe", icon: LockKeyhole },
              { label: "Progress", value: "Tracked", icon: CheckCircle2 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/70 bg-background/55 p-3">
                <item.icon className="mb-2 h-4 w-4 text-accent" />
                <p className="text-sm font-bold text-foreground">{item.value}</p>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-4 top-8 hidden w-44 rounded-2xl border border-border bg-card/90 p-3 shadow-xl backdrop-blur-xl sm:block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-success-light text-success flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Expert found</p>
            <p className="text-[11px] text-success">Available now</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -left-5 bottom-10 hidden w-48 rounded-2xl border border-border bg-card/90 p-3 shadow-xl backdrop-blur-xl sm:block"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-warning-light text-warning flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Team synced</p>
            <p className="text-[11px] text-muted-foreground">3 new updates</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.innerWidth > 768);
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  const handleMouseLeave = useCallback(() => setMousePos({ x: 0.5, y: 0.5 }), []);

  return (
    <section
      className="relative overflow-hidden bg-background px-4 py-24 sm:px-6 lg:px-8 lg:py-28"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="ai-homepage-aurora absolute inset-0 pointer-events-none" />
      <div className="ai-homepage-grid absolute inset-0 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />

      {isDesktop && (
        <div
          className="absolute inset-0 pointer-events-none opacity-70 transition-opacity duration-500"
          style={{
            background: `radial-gradient(520px circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 62%)`,
          }}
        />
      )}

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            className="max-w-2xl space-y-8"
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent-light px-3.5 py-1.5 text-sm font-semibold text-accent shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered expert marketplace
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-5">
              <h1 className="text-5xl font-bold tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl lg:leading-[0.98]">
                Turn AI ideas into shipped projects.
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                AI Tasker connects clients with verified AI experts, then keeps proposals, milestones, messages and payments in one clear workflow.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="group inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-foreground/5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary"
              >
                Sign In
                <Users className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 pt-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {["bg-accent/20", "bg-success/20", "bg-warning/20", "bg-destructive/20"].map((color, index) => (
                  <div key={index} className={`h-8 w-8 rounded-full border-2 border-background ${color}`} />
                ))}
              </div>
              <span className="font-medium text-foreground">500+ experts</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>trusted project delivery for AI teams</span>
            </motion.div>
          </motion.div>

          <HeroProductMap />
        </div>
      </div>
    </section>
  );
}
