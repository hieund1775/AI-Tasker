import { ConfirmationModal } from "../shared/ConfirmationModal.jsx";

// =============================================================================
// ConfirmMiniTasksModal — confirmation dialog shown before locking mini tasks.
//
// Props:
//   open        — boolean
//   onOpenChange — (open: boolean) => void
//   onBackToEdit — () => void — user wants to go back and edit
//   onConfirm    — () => void — user confirms and locks mini tasks
//   loading      — boolean — shows spinner on confirm button
// =============================================================================

export function ConfirmMiniTasksModal({
  open,
  onOpenChange,
  onBackToEdit,
  onConfirm,
  loading = false,
}) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm Mini Tasks"
      description="Are you sure you want to confirm these Mini Tasks? After confirmation you cannot edit them unless the Client requests a reopen."
      confirmLabel="Confirm & Save"
      cancelLabel="Back To Edit"
      variant="default"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onBackToEdit}
    />
  );
}
