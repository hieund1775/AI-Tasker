import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 [&_svg]:stroke-[2.35] outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive hover:-translate-y-0.5 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--accent-foreground)_22%,transparent)_inset,0_12px_26px_color-mix(in_srgb,var(--accent)_30%,transparent)] hover:bg-accent-hover hover:shadow-[0_1px_0_color-mix(in_srgb,var(--accent-foreground)_28%,transparent)_inset,0_16px_32px_color-mix(in_srgb,var(--accent)_38%,transparent)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_10px_24px_color-mix(in_srgb,var(--destructive)_26%,transparent)] hover:bg-destructive/88 hover:shadow-[0_14px_30px_color-mix(in_srgb,var(--destructive)_34%,transparent)]",
        outline:
          "border border-accent/35 bg-card/92 text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_7%,transparent)_inset,0_8px_18px_color-mix(in_srgb,var(--accent)_10%,transparent)] hover:border-accent/60 hover:bg-accent-light hover:text-foreground hover:shadow-[0_12px_26px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
        secondary:
          "border border-border/80 bg-secondary text-secondary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_7%,transparent)_inset,0_8px_18px_color-mix(in_srgb,var(--foreground)_7%,transparent)] hover:border-accent/40 hover:bg-muted hover:text-foreground",
        success:
          "bg-success text-success-foreground shadow-[0_10px_24px_color-mix(in_srgb,var(--success)_24%,transparent)] hover:bg-success/88 hover:shadow-[0_14px_30px_color-mix(in_srgb,var(--success)_32%,transparent)]",
        ghost:
          "text-muted-foreground hover:text-accent hover:bg-accent-light hover:shadow-[0_8px_18px_color-mix(in_srgb,var(--accent)_12%,transparent)]",
        link: "text-accent underline-offset-4 hover:text-accent-hover hover:underline",
      },
      size: {
        sm: "h-10 min-w-24 rounded-lg gap-1.5 px-4 text-sm",
        default: "h-11 min-w-28 rounded-lg gap-2 px-5 text-sm",
        lg: "h-12 min-w-32 rounded-xl gap-2 px-6 text-base",
        xl: "h-[3.25rem] min-w-36 rounded-xl gap-2.5 px-7 text-base",
        icon: "size-11 rounded-lg",
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
