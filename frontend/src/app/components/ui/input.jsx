import { cn } from "../../lib/utils.js";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/45 selection:bg-accent/20 selection:text-foreground border-input flex h-9 w-full min-w-0 rounded-lg border bg-input-background px-3 py-2 text-sm shadow-none transition-all duration-200 outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-accent/60 focus-visible:ring-[3px] focus-visible:ring-accent/12 focus-visible:shadow-glow-accent",
        "aria-invalid:ring-[3px] aria-invalid:ring-destructive/15 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
