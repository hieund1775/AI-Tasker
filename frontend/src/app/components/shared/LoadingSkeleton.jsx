import { Skeleton } from "../ui/skeleton.jsx";
import { cn } from "../../lib/utils.js";

// =============================================================================
// LoadingSkeleton — reusable loading placeholder components.
//
// Props:
//   variant  — "card" | "list" | "dashboard" | "detail"
//   count    — number of skeleton items to render (default 1 for card/detail,
//              default 4 for dashboard, default 3 for list)
//   className — additional classes for the outer wrapper
// =============================================================================

const DEFAULT_COUNTS = {
  card: 1,
  list: 3,
  dashboard: 4,
  detail: 1,
};

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {/* Stat cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      {/* Content area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Detail rows */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full max-w-md" />
        ))}
      </div>
    </div>
  );
}

const RENDERERS = {
  card: CardSkeleton,
  list: ListSkeleton,
  dashboard: DashboardSkeleton,
  detail: DetailSkeleton,
};

export function LoadingSkeleton({
  variant = "card",
  count,
  className = "",
}) {
  const Renderer = RENDERERS[variant] || RENDERERS.card;
  const itemCount = count ?? DEFAULT_COUNTS[variant] ?? 1;

  if (variant === "dashboard") {
    // Dashboard renders its own grid — single instance
    return (
      <div className={cn("animate-pulse", className)}>
        <Renderer />
      </div>
    );
  }

  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <Renderer key={i} />
      ))}
    </div>
  );
}
