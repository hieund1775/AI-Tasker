import { useState, useEffect } from "react";
import { AlertTriangle, Clock } from "lucide-react";

export function DisputeBanner({ report, className = "" }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!report?.replyDeadline) return;

    function calculateTime() {
      const now = new Date().getTime();
      const deadline = new Date(report.replyDeadline).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("HẾT HẠN (Quá hạn phản hồi)");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours} giờ ${minutes} phút ${seconds} giây còn lại`);
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
      className={`bg-destructive-light border border-destructive/20 rounded-xl p-5 flex items-start gap-3 shadow-sm ${className}`}
    >
      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5 animate-pulse" />
      <div className="flex-1 font-sans">
        <h4 className="text-[15px] font-bold text-destructive uppercase tracking-wide">
          Dự án đang tranh chấp (Project Under Dispute)
        </h4>
        <p className="text-sm text-destructive/80 mt-1">
          {report?.reason || report?.reportName || "Dự án đang trong quá trình kiểm tra và giải quyết tranh chấp bởi Quản trị viên."}
        </p>

        {showDeadline && (
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-destructive bg-destructive-light/60 px-3 py-2 rounded-lg border border-destructive/20 max-w-fit">
            <Clock className="w-4 h-4 text-destructive" />
            <span>Hạn phản hồi ({awaitingWho === "Awaiting Expert" ? "Chuyên gia" : "Khách hàng"}): <strong className="text-destructive font-bold ml-1">{timeLeft || "48 giờ"}</strong></span>
          </div>
        )}

        <p className="text-xs text-destructive/70 mt-2 font-medium">
          Tất cả các hành động thông thường (bàn giao, cập nhật tiến độ, giải ngân) đã bị khóa tạm thời.
        </p>
      </div>
    </div>
  );
}

export default DisputeBanner;
