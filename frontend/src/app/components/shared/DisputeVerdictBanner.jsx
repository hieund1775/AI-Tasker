import { Gavel } from "lucide-react";

function parseMetadata(project) {
  if (!project) return null;
  const raw = project?.metadata || project?.Metadata;
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed?.verdictType ? parsed : null;
  } catch {
    return null;
  }
}

export function DisputeVerdictBanner({ project, className = "" }) {
  const metadata = parseMetadata(project);
  if (!metadata) return null;

  const isClientWinner = metadata.verdictType === "client_refund";
  const winner = metadata.winnerRole || (isClientWinner ? "Client" : "Expert");
  const reason = metadata.finalDecisionReason || metadata.reason || "";

  return (
    <div
      className={`bg-secondary/50 border border-border rounded-xl p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <Gavel className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-[15px] font-semibold text-foreground uppercase tracking-wide">
            Dispute Final Decision
          </h4>
          <p className="text-sm font-medium text-foreground mt-2">
            Winner: <span className="text-brand-primary font-semibold">{winner}</span>
          </p>
          {reason ? (
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Final Decision Reason:</span>{" "}
              {reason}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default DisputeVerdictBanner;
