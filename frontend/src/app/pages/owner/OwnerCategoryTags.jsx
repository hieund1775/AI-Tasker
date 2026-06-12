// =============================================================================
// OwnerCategoryTags — Owner view of category/skill tag management.
// Reuses AdminCategoryTags component internally with Owner context.
// =============================================================================

import AdminCategoryTags from "../admin/AdminCategoryTags.jsx";

export default function OwnerCategoryTags() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          Owner &rsaquo; Category & Skill Management
        </p>
      </div>
      <AdminCategoryTags />
    </div>
  );
}
