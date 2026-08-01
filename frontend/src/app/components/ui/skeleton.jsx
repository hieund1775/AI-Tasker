import { cn } from "../../lib/utils.js";

function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-muted/70 dark:bg-muted/50",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
