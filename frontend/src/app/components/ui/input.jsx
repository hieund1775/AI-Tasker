import { cn } from "../../lib/utils.js";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/65 selection:bg-accent/25 selection:text-foreground border-input flex h-11 w-full min-w-0 rounded-xl border bg-input-background px-4 py-2.5 text-sm shadow-inner shadow-foreground/[0.02] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:bg-card",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
