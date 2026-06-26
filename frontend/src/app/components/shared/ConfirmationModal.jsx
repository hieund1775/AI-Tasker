// =============================================================================
// ConfirmationModal — reusable confirmation dialog for important actions.
//
// Uses Radix AlertDialog (already in the project via ui/alert-dialog.jsx).
//
// Props:
//   open          — boolean, controls visibility
//   onOpenChange  — (open: boolean) => void
//   title         — modal title
//   description   — body text / question
//   confirmLabel  — text on the confirm button (default "Confirm")
//   cancelLabel   — text on the cancel button (default "Cancel")
//   variant       — "danger" | "warning" | "default" (affects confirm button color)
//   loading       — boolean, shows spinner & disables confirm
//   onConfirm     — () => void | Promise<void>
//   onCancel      — () => void (optional)
//   children      — optional extra content below description (e.g. reason input)
// =============================================================================

import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.jsx";
import { Loader2 } from "lucide-react";

const variantStyles = {
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  warning:
    "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500",
  default:
    "bg-brand-primary text-white hover:bg-brand-primary-hover focus:ring-brand-primary/50",
};

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = loading || internalLoading;

  const handleConfirm = useCallback(
    async (e) => {
      e.preventDefault();
      if (isLoading) return; // spam-click prevention
      setInternalLoading(true);
      try {
        await onConfirm?.();
      } finally {
        setInternalLoading(false);
        onOpenChange?.(false);
      }
    },
    [isLoading, onConfirm, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    if (isLoading) return;
    onCancel?.();
    onOpenChange?.(false);
  }, [isLoading, onCancel, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {children && <div className="py-2">{children}</div>}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={variantStyles[variant] || variantStyles.default}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Processing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmationModal;
