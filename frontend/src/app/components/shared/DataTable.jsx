// =============================================================================
// DataTable — reusable admin table with search, filter, pagination, and actions.
//
// Props:
//   columns       — [{ key, label, sortable?, render?, filterOptions?: [{label, value}] }]
//   data          — array of row objects
//   loading       — boolean
//   emptyMessage  — string shown when no data
//   searchPlaceholder — placeholder for search input
//   searchValue   — controlled search value
//   onSearchChange — (value: string) => void
//   filters       — optional filter controls rendered above the table (global filters)
//   actions       — (row) => JSX — action buttons per row
//   onRowClick    — (row) => void — row click handler
//   pageSize      — number of rows per page (default: 10)
// =============================================================================

import { Search, X, Database, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Skeleton } from "../ui/skeleton.jsx";
import { useState, useMemo, useRef, useEffect } from "react";

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

  // Column Filters state: { [colKey]: string }
  const [colFilters, setColFilters] = useState({});
  const [openFilterMenu, setOpenFilterMenu] = useState(null); // column key that has filter menu open
  const menuRef = useRef(null);

  // Close filter menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenFilterMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setCurrentPage(1); // Reset to first page on filter
    setOpenFilterMenu(null); // Close menu
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

    // Apply column filters
    Object.entries(colFilters).forEach(([key, filterVal]) => {
      result = result.filter((row) => {
        const cellValue = row[key];
        if (cellValue === undefined || cellValue === null) return false;
        // Simple string match for column filters
        return String(cellValue).toLowerCase() === String(filterVal).toLowerCase();
      });
    });

    return result;
  }, [data, localSearch, onSearchChange, colFilters]);

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
    <div className="bg-card rounded-xl border border-border flex flex-col shadow-sm">
      {/* Header: search + global filters */}
      {(onSearchChange || filters || !onSearchChange) && (
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchVal}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-sm border border-input rounded-lg bg-background outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary placeholder:text-muted-foreground/50 transition-colors"
            />
            {searchVal && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {filters && <div className="flex gap-2 flex-wrap items-center">{filters}</div>}
        </div>
      )}

      {/* Table Area */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-5 py-3.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider relative ${
                    col.className || ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    
                    {/* Column Filter Dropdown */}
                    {col.filterOptions && (
                      <div className="relative inline-block" ref={openFilterMenu === col.key ? menuRef : null}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFilterMenu(openFilterMenu === col.key ? null : col.key);
                          }}
                          className={`p-1 rounded transition-colors flex-shrink-0 ${
                            colFilters[col.key] 
                              ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover" 
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                          title={`Filter by ${col.label}`}
                        >
                          <Filter className="w-3.5 h-3.5" />
                        </button>
                        
                        {openFilterMenu === col.key && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-xl shadow-lg z-50 py-1 font-normal normal-case tracking-normal animate-fade-in text-sm">
                            <div className="px-3 py-2 border-b border-border mb-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Filter by {col.label}
                              </span>
                            </div>
                            <button
                              onClick={() => handleColumnFilterChange(col.key, "")}
                              className={`w-full text-left px-4 py-2 hover:bg-secondary transition-colors ${
                                !colFilters[col.key] ? "bg-secondary/50 font-medium text-brand-primary" : "text-foreground"
                              }`}
                            >
                              All
                            </button>
                            {col.filterOptions.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handleColumnFilterChange(col.key, opt.value)}
                                className={`w-full text-left px-4 py-2 hover:bg-secondary transition-colors ${
                                  colFilters[col.key] === String(opt.value) ? "bg-secondary/50 font-medium text-brand-primary" : "text-foreground"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="text-right px-5 py-3.5 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
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
                  className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${
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
        <div className="px-5 py-4 border-t border-border flex items-center justify-between bg-secondary/10">
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
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
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
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
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
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
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

