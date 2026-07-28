import { cn } from "../../lib/utils.js";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground/45 flex min-h-20 w-full rounded-lg border bg-input-background px-3 py-2.5 text-sm shadow-none transition-all duration-200 outline-none",
        "focus-visible:border-accent/60 focus-visible:ring-[3px] focus-visible:ring-accent/12 focus-visible:shadow-glow-accent",
        "aria-invalid:ring-[3px] aria-invalid:ring-destructive/15 aria-invalid:border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
