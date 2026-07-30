import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85 shadow-sm",
        outline:
          "border border-border bg-background text-foreground hover:bg-secondary hover:text-foreground hover:border-accent/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted/80",
        success:
          "bg-success text-success-foreground hover:bg-success/85 shadow-sm",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-secondary",
        link: "text-accent underline-offset-4 hover:underline",
        ai:
          "bg-accent-gradient text-white shadow-sm hover:shadow-lg hover:shadow-accent/20 hover:brightness-110",
      },
      size: {
        sm: "h-8 rounded-lg gap-1.5 px-3 text-xs",
        default: "h-9 rounded-lg gap-2 px-4 text-sm",
        lg: "h-10 rounded-lg gap-2 px-5 text-sm",
        xl: "h-11 rounded-xl gap-2.5 px-6 text-sm",
        icon: "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  fullWidth = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        fullWidth && "w-full",
        loading && "cursor-wait opacity-70"
      )}
      disabled={props.disabled || loading}
      {...props}
    />
  );
}

export { Button, buttonVariants };
