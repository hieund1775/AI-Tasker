// =============================================================================
// DisputeBanner — notification banner shown on a disputed project page.
//
// Message: "This project is currently under dispute. Please wait for Admin
//           to handle it."
// =============================================================================

import { AlertTriangle } from "lucide-react";

export function DisputeBanner({ className = "" }) {
  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 ${className}`}
    >
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800">
          This project is currently under dispute.
        </p>
        <p className="text-sm text-amber-700 mt-0.5">
          Please wait for Admin resolution. All project actions are temporarily locked.
        </p>
      </div>
    </div>
  );
}

export default DisputeBanner;
