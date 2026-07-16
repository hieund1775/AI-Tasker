// =============================================================================
// ConfirmationModal — reusable confirmation dialog for important actions.
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
    "bg-destructive text-destructive-foreground hover:bg-destructive/85",
  warning:
    "bg-warning text-warning-foreground hover:bg-warning/85",
  default:
    "bg-primary text-primary-foreground hover:bg-primary-hover",
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
      if (isLoading) return;
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
