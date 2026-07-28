import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center justify-center border text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground rounded-full px-2.5 py-0.5",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5",
        destructive:
          "border-transparent bg-destructive/10 text-destructive rounded-full px-2.5 py-0.5",
        success:
          "border-transparent bg-success/10 text-success rounded-full px-2.5 py-0.5",
        warning:
          "border-transparent bg-warning/10 text-warning rounded-full px-2.5 py-0.5",
        outline:
          "border-border text-muted-foreground rounded-full px-2.5 py-0.5",
        accent:
          "border-transparent bg-accent/10 text-accent rounded-full px-2.5 py-0.5",
        ai:
          "border-transparent bg-ai-light text-ai rounded-full px-2.5 py-0.5",
        /* ── Status variants ── */
        "status-default":
          "border-transparent bg-primary/8 text-primary rounded-full px-2.5 py-0.5",
        "status-secondary":
          "border-transparent bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5",
        "status-success":
          "border-transparent bg-success/8 text-success rounded-full px-2.5 py-0.5",
        "status-warning":
          "border-transparent bg-warning/8 text-warning rounded-full px-2.5 py-0.5",
        "status-destructive":
          "border-transparent bg-destructive/8 text-destructive rounded-full px-2.5 py-0.5",
        "status-accent":
          "border-transparent bg-accent/8 text-accent rounded-full px-2.5 py-0.5",
        "status-ai":
          "border-transparent bg-ai-light text-ai rounded-full px-2.5 py-0.5",
        "status-neutral":
          "border-transparent bg-muted text-muted-foreground rounded-full px-2.5 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  dot = false,
  pulsing = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), pulsing && "animate-ai-pulse", className)}
      {...props}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
      )}
      {props.children}
    </Comp>
  );
}

export { Badge, badgeVariants };
