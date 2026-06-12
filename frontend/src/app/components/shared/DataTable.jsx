// =============================================================================
// DataTable — reusable admin table with search, filter, and actions.
//
// Props:
//   columns       — [{ key, label, sortable?, render? }]
//   data          — array of row objects
//   loading       — boolean
//   emptyMessage  — string shown when no data
//   searchPlaceholder — placeholder for search input
//   searchValue   — controlled search value
//   onSearchChange — (value: string) => void
//   filters       — optional filter controls rendered above the table
//   actions       — (row) => JSX — action buttons per row
//   onRowClick    — (row) => void — row click handler
// =============================================================================

import { Search } from "lucide-react";
import { Skeleton } from "../ui/skeleton.jsx";

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No data found.",
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters,
  actions,
  onRowClick,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header: search + filters */}
      {(onSearchChange || filters) && (
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {onSearchChange && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900 text-sm"
              />
            </div>
          )}
          {filters && <div className="flex gap-2 flex-wrap">{filters}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase ${
                    col.className || ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4">
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="p-12 text-center"
                >
                  <p className="text-gray-500 text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={`hover:bg-gray-50/50 ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-4 text-sm ${
                        col.className || ""
                      }`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
