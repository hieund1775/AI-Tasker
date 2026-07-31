import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 aria-invalid:border-destructive hover:-translate-y-0.5 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--primary-foreground)_16%,transparent)_inset,0_10px_22px_color-mix(in_srgb,var(--primary)_18%,transparent)] hover:bg-primary-hover hover:shadow-[0_1px_0_color-mix(in_srgb,var(--primary-foreground)_20%,transparent)_inset,0_14px_28px_color-mix(in_srgb,var(--primary)_22%,transparent)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85",
        outline:
          "border border-border bg-card/88 text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)_inset] hover:border-input hover:bg-secondary hover:shadow-[0_10px_22px_color-mix(in_srgb,var(--foreground)_8%,transparent)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)_inset] hover:bg-muted",
        success:
          "bg-success text-success-foreground hover:bg-success/85",
        ghost:
          "text-muted-foreground hover:text-foreground hover:bg-secondary hover:shadow-[0_8px_18px_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 min-w-20 rounded-lg gap-1.5 px-3.5 text-xs",
        default: "h-10 min-w-24 rounded-lg gap-2 px-[1.125rem] text-sm",
        lg: "h-11 min-w-28 rounded-lg gap-2 px-[1.375rem] text-sm",
        xl: "h-12 min-w-32 rounded-xl gap-2.5 px-6 text-sm",
        icon: "size-10 rounded-lg",
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
