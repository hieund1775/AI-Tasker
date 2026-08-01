import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export function DisputeBanner({ report, className = "" }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!report?.replyDeadline) return;

    function calculateTime() {
      const now = new Date().getTime();
      const deadline = new Date(report.replyDeadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("EXPIRED (Response overdue)");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours} hours ${minutes} minutes ${seconds} seconds remaining`);
      }
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [report?.replyDeadline]);

  const awaitingWho = report?.status;
  const showDeadline = report?.replyDeadline && (awaitingWho === "Awaiting Expert" || awaitingWho === "Awaiting Client");

  return (
    <div
      className={`bg-destructive-light border border-destructive/20 rounded-xl p-5 shadow-sm ${className}`}
    >
      <h4 className="text-[15px] font-semibold text-destructive uppercase tracking-wide">
        Project Under Dispute
      </h4>

      {showDeadline && (
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive-light/60 px-3 py-2 rounded-lg border border-destructive/20 max-w-fit">
          <Clock className="w-4 h-4 text-destructive" />
          <span>Response deadline ({awaitingWho === "Awaiting Expert" ? "Expert" : "Client"}): <strong className="text-destructive font-semibold ml-1">{timeLeft || "48 hours"}</strong></span>
        </div>
      )}

      {report?.status === "Awaiting Evidence" && report?.adminNote && (
        <div className="mt-3 bg-warning-light border border-warning/20 rounded-lg px-3 py-2 text-xs text-warning text-left">
          <span className="font-semibold">Admin's Request:</span> {report.adminNote}
        </div>
      )}
    </div>
  );
}

export default DisputeBanner;
