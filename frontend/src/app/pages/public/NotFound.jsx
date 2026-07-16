import { Link } from "react-router";
import { FileQuestion } from "lucide-react";
import { motion } from "motion/react";

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative max-w-md w-full bg-card rounded-2xl border border-border shadow-sm p-10 text-center"
      >
        {/* Subtle border glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/[0.03] via-transparent to-primary/[0.02] pointer-events-none" />

        <div className="relative">
          {/* Large 404 */}
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
            className="text-8xl font-bold text-foreground/8 mb-2 select-none"
          >
            404
          </motion.p>

          {/* Icon */}
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-5">
            <FileQuestion className="w-8 h-8 text-muted-foreground/40" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground mb-7 max-w-xs mx-auto leading-relaxed">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
