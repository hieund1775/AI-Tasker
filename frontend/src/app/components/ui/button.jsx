import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive select-none",
  {
    variants: {
      variant: {
        default:
          "bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary shadow-sm",
        destructive:
          "bg-destructive text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
        outline:
          "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100",
        secondary:
          "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300",
        success:
          "bg-brand-green text-white hover:bg-brand-green/90 active:bg-brand-green/80 shadow-sm",
        ghost:
          "text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200",
        link: "text-brand-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 rounded-[14px] gap-1.5 px-4 text-sm",
        default: "h-11 rounded-[14px] gap-2 px-5 text-base",
        lg: "h-12 rounded-2xl gap-2 px-6 text-base",
        xl: "h-[52px] rounded-2xl gap-2.5 px-7 text-base",
        icon: "size-11 rounded-[14px]",
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
        loading && "cursor-wait"
      )}
      disabled={props.disabled || loading}
      {...props}
    />
  );
}

export { Button, buttonVariants };
