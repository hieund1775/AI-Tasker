// =============================================================================
// ActivityLogPanel — renders the project activity log feed.
//
// Props:
//   projectLogs — Array<{ time, id, actor, message }>
//   getActorIcon — (actor: string) => ReactNode
// =============================================================================

import { getActorIcon as defaultGetActorIcon } from "./timelineHelpers.jsx";
import { safeArray, safeDateTimeFormat } from "../../../lib/safety.js";

export function ActivityLogPanel({ projectLogs, getActorIcon }) {
  const iconFn = getActorIcon || defaultGetActorIcon;

  if (!projectLogs || projectLogs.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-8">
      <h2 className="text-xl font-semibold text-foreground mb-5">
        Project Activity
      </h2>
      <div className="space-y-4">
        {safeArray(projectLogs).map((log, index) => (
          <div
            key={`${log.time || log.id}-${index}`}
            className="flex gap-4 border border-border rounded-xl p-4"
          >
            <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center flex-shrink-0">
              {iconFn(log.actor)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{log.actor}</p>
                <p className="text-sm text-muted-foreground">
                  {log.time
                    ? safeDateTimeFormat(log.time, {}, "")
                    : ""}
                </p>
              </div>
              <p className="text-foreground mt-1">{log.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
