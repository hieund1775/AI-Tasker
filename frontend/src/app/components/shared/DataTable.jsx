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

import { Search, X, Database } from "lucide-react";
import { Skeleton } from "../ui/skeleton.jsx";
import { useState } from "react";

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
  const [localSearch, setLocalSearch] = useState("");
  const searchVal = onSearchChange ? searchValue : localSearch;
  const handleSearch = onSearchChange || setLocalSearch;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header: search + filters */}
      {(onSearchChange || filters) && (
        <div className="px-5 py-3.5 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchVal}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-sm border border-border rounded-lg bg-transparent outline-none focus:border-ring focus:ring-2 focus:ring-ring/15 placeholder:text-muted-foreground/50"
            />
            {searchVal && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {filters && <div className="flex gap-2 flex-wrap">{filters}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-[0.04em] ${
                    col.className || ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-[0.04em]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`} className="border-b border-border/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3.5">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-3.5">
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-5 py-16 text-center"
                >
                  <Database className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 text-sm ${
                        col.className || ""
                      }`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-3.5 text-right">
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
