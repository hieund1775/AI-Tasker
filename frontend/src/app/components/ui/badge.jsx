import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none [&>svg]:stroke-[2.35] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm shadow-foreground/10",
        secondary:
          "border-border/75 bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/25 bg-destructive/15 text-destructive",
        success:
          "border-success/25 bg-success/15 text-success",
        warning:
          "border-warning/25 bg-warning/15 text-warning",
        outline:
          "border-border text-foreground bg-card/70",
        accent:
          "border-accent/30 bg-accent/15 text-accent",
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
  ...props
}) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
