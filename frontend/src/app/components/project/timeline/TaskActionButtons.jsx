// =============================================================================
// TaskActionButtons — renders View/Submit/Review buttons for a task card.
//
// Props:
//   task             — task object { id, title }
//   derivedStatus    — display status string
//   role             — "client" | "expert"
//   canOpenSubmit    — whether the expert can submit
//   isSubmitDisabled — whether the submit button is disabled
//   submitButtonLabel — label for the submit button
//   goToTaskAction   — (task, action) => void
// =============================================================================

import { Link } from "react-router";
import { Eye, Send } from "lucide-react";

export function TaskActionButtons({
  task,
  derivedStatus,
  role,
  canOpenSubmit,
  isSubmitDisabled,
  submitButtonLabel,
  goToTaskAction,
}) {
  return (
    <div className="flex flex-row items-center gap-3 xl:w-[380px] xl:justify-end xl:-mt-1 flex-shrink-0">
      <Link
        to={`/tasks/${task.id}/update?role=${role}&action=view`}
        className="min-w-[165px] justify-center h-11 px-5 border border-input rounded-[14px] hover:bg-secondary/60 inline-flex items-center gap-2 transition text-base font-semibold"
      >
        <Eye className="w-4 h-4" />
        View Task
      </Link>

      {role === "expert" && (
        <button
          type="button"
          disabled={isSubmitDisabled}
          onClick={() => {
            if (canOpenSubmit) {
              goToTaskAction(task, "submit");
            }
          }}
          className={`min-w-[165px] justify-center h-11 px-5 rounded-[14px] inline-flex items-center gap-2 transition text-base font-semibold ${
            isSubmitDisabled
              ? "bg-muted/80 text-muted-foreground cursor-not-allowed opacity-70"
              : "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
          }`}
        >
          <Send className="w-4 h-4" />
          {submitButtonLabel}
        </button>
      )}

      {role === "client" && derivedStatus === "Pending Review" && (
        <Link
          to={`/tasks/${task.id}/update?role=${role}&action=review`}
          className="min-w-[165px] justify-center h-11 px-5 bg-primary text-primary-foreground rounded-[14px] hover:bg-primary-hover inline-flex items-center gap-2 transition text-base font-semibold"
        >
          <Eye className="w-4 h-4" />
          Review
        </Link>
      )}
    </div>
  );
}
