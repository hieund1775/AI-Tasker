import { cn } from "../../lib/utils.js";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground/60 flex min-h-20 w-full rounded-xl border bg-input-background px-3.5 py-2.5 text-sm shadow-inner shadow-foreground/[0.015] transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:bg-card",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
