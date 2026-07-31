// =============================================================================
// DataTable - reusable admin table with search, external filters, pagination, and actions.
//
// Props:
//   columns       - [{ key, label, sortable?, render?, filterOptions?: [{label, value}] }]
//   data          - array of row objects
//   loading       - boolean
//   emptyMessage  - string shown when no data
//   searchPlaceholder - placeholder for search input
//   searchValue   - controlled search value
//   onSearchChange - (value: string) => void
//   filters       - optional filter controls rendered above the table (global filters)
//   actions       - (row) => JSX - action buttons per row
//   onRowClick    - (row) => void - row click handler
//   pageSize      - number of rows per page (default: 10)
// =============================================================================

import { Search, X, Database, ChevronLeft, ChevronRight, Filter, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "../ui/skeleton.jsx";
import { useState, useMemo, useEffect } from "react";

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
  pageSize = 10,
}) {
  const [localSearch, setLocalSearch] = useState("");
  const searchVal = onSearchChange ? searchValue : localSearch;
  const handleSearch = onSearchChange || setLocalSearch;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Column filter values are rendered above the table, not inside column headers.
  const [colFilters, setColFilters] = useState({});

  // Sort state: { key: string, dir: 'asc' | 'desc' | null }
  const [sortState, setSortState] = useState({ key: null, dir: null });

  const handleSort = (colKey) => {
    setSortState(prev => {
      if (prev.key !== colKey) return { key: colKey, dir: "asc" };
      if (prev.dir === "asc") return { key: colKey, dir: "desc" };
      if (prev.dir === "desc") return { key: null, dir: null };
      return { key: colKey, dir: "asc" };
    });
    setCurrentPage(1);
  };

  const handleColumnFilterChange = (key, value) => {
    setColFilters((prev) => {
      const next = { ...prev };
      if (value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setCurrentPage(1);
  };

  const filterableColumns = columns.filter((col) => col.filterOptions?.length);
  const activeFilterCount = Object.keys(colFilters).length;
  const getAllFilterLabel = (label) => {
    const labels = {
      Status: "All Statuses",
      Role: "All Roles",
      "Dispute Type": "All Dispute Types",
      Category: "All Categories",
      Type: "All Types",
    };
    return labels[label] || `All ${label}`;
  };

  // Reset page when global search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchVal]);

  // Apply all filters: global search (if not handled externally) + column filters
  const processedData = useMemo(() => {
    let result = data;

    // Local global search (only if onSearchChange is NOT provided, meaning search is handled locally)
    if (!onSearchChange && localSearch) {
      const lowerSearch = localSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some(
          (val) => val && String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    // Apply column filters. A filter option may represent one raw value or a
    // group of equivalent raw values via `values`.
    Object.entries(colFilters).forEach(([key, filterVal]) => {
      const column = columns.find((col) => col.key === key);
      const selectedOption = column?.filterOptions?.find((opt) => String(opt.value) === String(filterVal));
      const acceptedValues = selectedOption?.values?.length
        ? selectedOption.values
        : [filterVal];

      result = result.filter((row) => {
        const cellValue = row[key];
        if (cellValue === undefined || cellValue === null) return false;
        const normalizedCell = String(cellValue).toLowerCase();
        return acceptedValues.some((value) => normalizedCell === String(value).toLowerCase());
      });
    });

    // Apply sort
    if (sortState.key && sortState.dir) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortState.key];
        const bVal = b[sortState.key];
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        const isNumeric = !isNaN(aNum) && !isNaN(bNum);
        if (isNumeric) {
          return sortState.dir === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        return sortState.dir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, localSearch, onSearchChange, colFilters, sortState]);

  // Pagination math
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border flex flex-col shadow-sm overflow-hidden">
      {/* Header: search + filters */}
      {(onSearchChange || filters || !onSearchChange) && (
        <div className="border-b border-border/70 bg-card/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchVal}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-input-background pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              {searchVal && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 rounded-lg p-0.5 -translate-y-1/2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {filters && <div className="page-filter-controls">{filters}</div>}
          </div>

          {filterableColumns.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/50 pt-4">
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary/60 px-3 text-xs font-semibold text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </span>
              {filterableColumns.map((col) => (
                <label key={col.key} className="relative">
                  <span className="sr-only">Filter by {col.label}</span>
                  <select
                    value={colFilters[col.key] || ""}
                    onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                    className={`h-9 min-w-[9rem] rounded-lg border px-3 pr-8 text-xs font-medium outline-none transition-colors ${
                      colFilters[col.key]
                        ? "border-brand-primary/30 bg-brand-primary-light text-brand-primary"
                        : "border-input bg-input-background text-muted-foreground hover:text-foreground"
                    } focus:border-ring focus:ring-2 focus:ring-ring/15`}
                  >
                    <option value="">{col.filterAllLabel || getAllFilterLabel(col.label)}</option>
                    {col.filterOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setColFilters({});
                    setCurrentPage(1);
                  }}
                  className="h-9 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table Area */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/70 bg-secondary/45">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-5 py-2.5 text-[13px] font-semibold text-muted-foreground tracking-[0.02em] relative ${
                    col.className || ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.sortable !== false ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group"
                        title={
                          sortState.key !== col.key || !sortState.dir
                            ? "Sort A-Z"
                            : sortState.dir === "asc"
                              ? "Sort Z-A"
                              : "Clear sort"
                        }
                      >
                        {col.label}
                        <span className="flex flex-col -space-y-1">
                          {sortState.key === col.key && sortState.dir === 'asc'
                            ? <ChevronUp className="w-3.5 h-3.5 text-brand-primary" />
                            : sortState.key === col.key && sortState.dir === 'desc'
                            ? <ChevronDown className="w-3.5 h-3.5 text-brand-primary" />
                            : <ChevronsUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70" />}
                        </span>
                      </button>
                    ) : col.label}
                    
                  </div>
                </th>
              ))}
              {actions && (
                <th className="text-right px-5 py-2.5 text-[13px] font-semibold text-muted-foreground tracking-[0.02em]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skel-${i}`} className="border-b border-border/50">
                  {columns.map((col) => (
                     <td key={col.key} className="px-5 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-4">
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-5 py-24 text-center"
                >
                  <Database className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-base font-medium text-foreground">No records found</p>
                  <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={`border-b border-border/45 hover:bg-accent/[0.035] transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-4 text-sm text-foreground/90 ${
                        col.className || ""
                      }`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-5 py-4 text-right">
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

      {/* Footer: Pagination */}
      {!loading && totalItems > 0 && (
        <div className="px-5 py-4 border-t border-border/70 flex items-center justify-between bg-secondary/25">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{" "}
            <span className="font-medium text-foreground">{endIndex}</span> of{" "}
            <span className="font-medium text-foreground">{totalItems}</span> results
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNumber = i + 1;
                  // Show current, first, last, and pages adjacent to current
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= safeCurrentPage - 1 && pageNumber <= safeCurrentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                          safeCurrentPage === pageNumber
                            ? "bg-brand-primary text-brand-primary-foreground border border-brand-primary"
                            : "border border-transparent hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  }
                  
                  // Show ellipsis for gaps
                  if (
                    (pageNumber === 2 && safeCurrentPage > 3) ||
                    (pageNumber === totalPages - 1 && safeCurrentPage < totalPages - 2)
                  ) {
                    return <span key={pageNumber} className="text-muted-foreground px-1">...</span>;
                  }
                  
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DataTable;
