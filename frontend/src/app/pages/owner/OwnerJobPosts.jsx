// =============================================================================
// OwnerJobPosts — Owner view of job post/service management.
// Reuses AdminJobPosts component internally with Owner context.
// =============================================================================

import AdminJobPosts from "../admin/AdminJobPosts.jsx";

export default function OwnerJobPosts() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Owner &rsaquo; Job Post Management
        </p>
      </div>
      <AdminJobPosts />
    </div>
  );
}
