import React, { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Search, Plus, Filter, ArrowUpDown, ChevronRight, ChevronDown, MoreVertical, ChevronLeft, Calendar, FileSpreadsheet, Upload, Download, MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface Column<T> {
  header: React.ReactNode;
  accessor: (row: T) => React.ReactNode;
  sortValue?: (row: T) => any;
  className?: string;
}

export interface DataTableLayoutProps<T> {
  title?: string;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  
  onSearch?: (val: string) => void;
  searchValue?: string;
  
  onFilterClick?: () => void;
  activeFilterCount?: number;
  
  onExport?: () => void;
  onImport?: () => void;
  
  columns: Column<T>[];
  data: T[];
  
  getRowId?: (row: T) => string;
  renderRowAction?: (row: T) => React.ReactNode;
  renderExpandedRow?: (row: T) => React.ReactNode;
  renderToolbarExtra?: () => React.ReactNode;
  filterChildren?: React.ReactNode;
  moduleName?: string;
  onTemplate?: () => void;
  renderTopRightActions?: () => React.ReactNode;
  
  onClearFilters?: () => void;
  activeFilters?: { key: string; label: string; value: string }[];
  onRemoveFilter?: (key: string) => void;
}

export default function DataTableLayout<T>({
  tabs,
  activeTab,
  onTabChange,
  onSearch,
  searchValue,
  onFilterClick,
  activeFilterCount,
  onExport,
  onImport,
  columns,
  data,
  getRowId,
  renderRowAction,
  renderExpandedRow,
  renderToolbarExtra,
  filterChildren,
  moduleName,
  onTemplate,
  renderTopRightActions,
  onClearFilters,
  activeFilters,
  onRemoveFilter,
}: DataTableLayoutProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("25");
  
  const [sortConfig, setSortConfig] = useState<{ key: number | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  useEffect(() => {
    setPage(1); // Reset page on tab, data or filter change
  }, [activeTab, data, activeFilters]);

  const sortedData = [...data].sort((a, b) => {
    if (sortConfig.key === null) return 0;
    const col = columns[sortConfig.key];
    if (!col) return 0;
    
    let sA, sB;

    if (col.sortValue) {
      sA = col.sortValue(a);
      sB = col.sortValue(b);
    } else {
      const valA = col.accessor(a);
      const valB = col.accessor(b);

      const extractValue = (v: any): any => {
        if (v === null || v === undefined) return "";
        if (typeof v === "string" || typeof v === "number") return v;
        if (v.props && v.props.children) {
          if (Array.isArray(v.props.children)) return v.props.children.map(extractValue).join("");
          return extractValue(v.props.children);
        }
        return String(v);
      };

      sA = extractValue(valA);
      sB = extractValue(valB);
    }

    if (sA < sB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (sA > sB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const currentData = sortedData.slice((page - 1) * Number(pageSize), page * Number(pageSize));
  const totalPages = Math.ceil(data.length / Number(pageSize)) || 1;

  return (
    <div className="flex flex-col w-full h-full bg-white">
      {/* Tabs Row */}
      <div className="flex items-center justify-between border-b h-14 shrink-0 bg-white shadow-sm z-10">
        {tabs && tabs.length > 0 ? (
          <div className="flex items-center gap-6 h-full px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange && onTabChange(tab.id)}
                className={cn(
                  "px-1 h-full text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-800 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
      ) : <div />}
      
      {/* Top Right Actions (e.g. New Order) inside the same row as tabs */}
      {renderTopRightActions && (
        <div className="flex items-center px-4 h-full">
          {renderTopRightActions()}
        </div>
      )}
      </div>

      {/* Toolbar Row */}
      {/* Toolbar Row */}
      <div className="flex items-center px-3 py-2 bg-[#f8f9fa] border-b gap-4">
        {/* Left Actions - For module-specific custom buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {renderToolbarExtra && renderToolbarExtra()}
        </div>

        {/* Right Actions - Standard tools aligned to the right */}
        <div className="flex items-center shrink-0 ml-auto gap-2">
          {onSearch && (
            <div className="relative flex items-center bg-white rounded-md border shadow-sm w-[260px] h-9 shrink-0">
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-full border-0 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 w-full"
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}

          <Button variant="outline" size="sm" className="h-9 bg-white shrink-0 text-xs font-normal shadow-sm border-slate-200 px-3">
            <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
            Last 90 days <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
          </Button>

          <div className="flex items-center gap-1 shrink-0 ml-1 border-l pl-2">
            {filterChildren ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 text-slate-600 hover:text-slate-900 text-xs font-medium px-3 gap-1.5" onClick={onFilterClick}>
                    <Filter className="h-4 w-4" /> Filter
                    {activeFilterCount ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{activeFilterCount}</span> : null}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0 flex flex-col border-l shadow-2xl">
                  <SheetHeader className="px-6 py-5 border-b bg-slate-50/50">
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                      <Filter className="h-5 w-5 text-blue-600" />
                      Active Filters
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
                    {filterChildren}
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button variant="ghost" size="sm" className="h-9 text-slate-600 hover:text-slate-900 text-xs font-medium px-3 gap-1.5" onClick={onFilterClick}>
                <Filter className="h-4 w-4" /> Filter
                {activeFilterCount ? <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{activeFilterCount}</span> : null}
              </Button>
            )}
            
            
            {(onExport || onImport || onTemplate) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1 border shadow-lg">
                  {onTemplate && (
                    <DropdownMenuItem onClick={onTemplate} className="py-2.5 cursor-pointer">
                      <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center mr-3">
                        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Download Template</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Excel Structure</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {onImport && (
                    <DropdownMenuItem onClick={onImport} className="py-2.5 cursor-pointer">
                      <div className="h-8 w-8 rounded bg-emerald-50 flex items-center justify-center mr-3">
                        <Upload className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Import from Excel</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Bulk Upload</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  {onExport && (
                    <DropdownMenuItem onClick={onExport} className="py-2.5 cursor-pointer">
                      <div className="h-8 w-8 rounded bg-purple-50 flex items-center justify-center mr-3">
                        <Download className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Export all data</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Full Excel Batch</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
        </div>
      </div>
    </div>
      {/* Active Filters Display */}
      {activeFilters && activeFilters.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">ACTIVE FILTERS:</span>
          {activeFilters.map((f) => (
            <div key={f.key} className="flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 text-[11px] font-medium gap-1.5">
              <span className="opacity-70">{f.label}:</span>
              <span>{f.value}</span>
              <button onClick={() => onRemoveFilter?.(f.key)} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive" onClick={onClearFilters}>
            Clear All
          </Button>
        </div>
      )}

      {/* Datatable */}
      <div className="flex-1 overflow-auto bg-white relative">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="bg-white sticky top-0 z-20 before:absolute before:inset-0 before:border-b before:border-border before:-z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 px-2 text-center text-xs font-semibold text-muted-foreground h-10 border-r border-transparent"></TableHead>
              {columns.map((col, i) => (
                <TableHead 
                  key={i} 
                  className={cn(
                    "text-xs font-semibold text-[#5c6e82] h-10 align-middle py-0 whitespace-nowrap px-4 border-r border-transparent cursor-pointer hover:bg-slate-50 transition-colors group", 
                    col.className
                  )}
                  onClick={() => {
                    const direction = sortConfig.key === i && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfig({ key: i, direction });
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    <ArrowUpDown className={cn(
                      "h-3 w-3 transition-opacity", 
                      sortConfig.key === i ? "opacity-100 text-blue-600" : "opacity-0 group-hover:opacity-40"
                    )} />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-32 text-center text-muted-foreground border-b">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((row, i) => {
                const id = getRowId ? getRowId(row) : String(i);
                const isExpanded = expandedRows.has(id);
                return (
                  <React.Fragment key={id}>
                    <TableRow className="group border-b border-border/60 hover:bg-[#f9fafb] transition-colors">
                      <TableCell className="w-12 px-1 py-1.5 align-middle border-r border-transparent">
                        <div className="flex items-center justify-center gap-0.5">
                          {renderExpandedRow ? (
                            <button onClick={() => toggleExpand(id)} className="p-0.5 text-muted-foreground hover:bg-slate-200 rounded shrink-0">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          ) : (
                            <div className="w-4.5" />
                          )}
                          {renderRowAction ? (
                            renderRowAction(row)
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-0.5 text-muted-foreground/40 hover:text-foreground hover:bg-slate-200 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit Record</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                      {columns.map((col, j) => (
                        <TableCell key={j} className={cn("px-4 py-2 align-middle text-xs text-[#2b3a4a] border-r border-transparent", col.className)}>
                          {col.accessor(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && renderExpandedRow && (
                      <TableRow className="bg-slate-50/50">
                        <TableCell colSpan={columns.length + 1} className="p-0 border-b">
                          <div className="p-4 border-l-2 border-blue-500 ml-6 bg-white shadow-inner">
                            {renderExpandedRow(row)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-border shrink-0 text-xs text-muted-foreground font-medium">
        <div className="flex items-center gap-4">
          <span>Total records {data.length}</span>
          <div className="flex items-center gap-2">
            <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setPage(1); }}>
              <SelectTrigger className="h-7 border-border bg-white text-xs w-[140px] shadow-none py-0">
                <SelectValue placeholder="Records per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 records per page</SelectItem>
                <SelectItem value="25">25 records per page</SelectItem>
                <SelectItem value="50">50 records per page</SelectItem>
                <SelectItem value="100">100 records per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-muted-foreground hover:text-foreground" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Simplified pagination array
              let pageNum = i + 1;
              if (totalPages > 5 && page > 3) {
                pageNum = page - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              const isCurrent = page === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "h-6 min-w-6 px-1 rounded flex items-center justify-center text-xs transition-colors",
                    isCurrent ? "bg-blue-50 text-blue-600 font-bold border border-blue-200" : "hover:bg-slate-100 text-[#5c6e82]"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span className="px-1 tracking-widest text-[#5c6e82]">...</span>
                <button onClick={() => setPage(totalPages)} className="h-6 min-w-6 px-1 rounded flex items-center justify-center text-xs hover:bg-slate-100 text-[#5c6e82]">
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-muted-foreground hover:text-foreground" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages || totalPages === 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
