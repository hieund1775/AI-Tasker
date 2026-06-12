// =============================================================================
// OwnerReviews — Owner view of review management.
// Reuses AdminReviews component internally with Owner context.
// =============================================================================

import AdminReviews from "../admin/AdminReviews.jsx";

export default function OwnerReviews() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          Owner &rsaquo; Review Management
        </p>
      </div>
      <AdminReviews />
    </div>
  );
}
