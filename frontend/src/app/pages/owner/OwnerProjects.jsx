// =============================================================================
// OwnerProjects — Owner view of project management.
// Reuses AdminProjects component internally with Owner context.
// =============================================================================

import AdminProjects from "../admin/AdminProjects.jsx";

export default function OwnerProjects() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Owner &rsaquo; Project Management
        </p>
      </div>
      <AdminProjects />
    </div>
  );
}
