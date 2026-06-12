// =============================================================================
// OwnerReports — Owner view of dispute/report management.
// Reuses AdminDisputes component internally with Owner context.
// =============================================================================

import AdminDisputes from "../admin/AdminDisputes.jsx";

export default function OwnerReports() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wider">
          Owner &rsaquo; Report Management
        </p>
      </div>
      <AdminDisputes />
    </div>
  );
}
