// =============================================================================
// OwnerUsers — Owner view of user management.
// Reuses AdminUsers component internally with Owner context.
// Admin accounts are excluded — they are managed via ManageAdmins page.
// =============================================================================

import AdminUsers from "../admin/AdminUsers.jsx";

export default function OwnerUsers() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Owner &rsaquo; User Management
        </p>
      </div>
      <AdminUsers excludeRoles={["admin"]} />
    </div>
  );
}
