"use client";

import { useState, useMemo } from "react";
import { MdAdd, MdCheckCircleOutline, MdChevronLeft, MdChevronRight, MdFirstPage, MdLastPage, MdOutlineCancel, MdFileUpload, MdEdit, MdFilterList, MdDelete, MdFileDownload } from "react-icons/md";
import SearchBar from "./SearchBar";
import { FilterToolbar } from "./FilterToolbar";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import { SubmitButton } from "./SubmitButton";
import { useRouter } from "next/navigation";
import { toSentenceCase } from "@/hooks/useSentenceCase";

type TableProps = {
  title: string;
  columns: string[];
  data: Record<string, any>[];
  showActions?: boolean; // if table has actions
  actions?: string[]; // array of action types: "add", "import", "edit", "filter", "delete", "approve", "reject", "export"
  selectedIds?: string[]; // selected row IDs for action buttons
  onSelectionChange?: (selectedIds: string[]) => void; // callback for selection changes
  onApprove?: (row: Record<string, any>) => void;
  onReject?: (row: Record<string, any>) => void;
  onRowClick?: (row: Record<string, any>) => void; // NEW: row click handler
  // Action handlers
  onAdd?: () => void;
  onImport?: () => void;
  onEdit?: () => void;
  onFilter?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  // Filter props
  showFilters?: boolean;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }>;
  // FilterToolbar props (for the new filter button)
  filterToolbarFilters?: Array<{
    key: string;
    label: string;
    value: string;
    options?: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
    type?: "select" | "date";
    defaultValue?: string;
    placeholder?: string;
  }>;
  onFilterClearAll?: () => void;
  pageSize: number;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loading: boolean;
};

type SortDirection = "asc" | "desc";

export default function Table({
  title,
  columns,
  data,
  showActions,
  actions = [],
  selectedIds = [],
  onSelectionChange,
  onApprove,
  onReject,
  onRowClick,
  onAdd,
  onImport,
  onEdit,
  onFilter,
  onDelete,
  onExport,
  showFilters,
  filters = [],
  filterToolbarFilters = [],
  onFilterClearAll,
  loading,
  
  ...props
}: TableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: SortDirection;
  }>({ column: null, direction: "asc" });

  // Export CSV functionality
  const handleExportCSV = () => {
    if (onExport) {
      onExport();
    } else {
      // Default export implementation
      const headers = columns.join(',');
      const csvData = filteredData.map(row => 
        columns.map(col => `"${row[col] || ''}"`).join(',')
      ).join('\n');
      const csv = `${headers}\n${csvData}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const handleSort = (col: string) => {
    setSortConfig((prev) => {
      if (prev.column === col) {
        return {
          column: col,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      } else {
        return { column: col, direction: "asc" };
      }
    });
  };

  const filteredData = useMemo(() => {
    return data.filter((row) =>
      columns.some((col) =>
        String(row[col]).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm, columns]);

  const sortedData = useMemo(() => {
    if (!sortConfig.column) return filteredData;

    const sorted = [...filteredData].sort((a, b) => {
      const valA = a[sortConfig.column!];
      const valB = b[sortConfig.column!];

      if (typeof valA === "number" && typeof valB === "number") {
        return sortConfig.direction === "asc" ? valA - valB : valB - valA;
      }

      return sortConfig.direction === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return sorted;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / props.pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) *  props.pageSize,
    currentPage *  props.pageSize
  );

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((_, idx) =>
      selectedRows.has((currentPage - 1) *  props.pageSize + idx)
    );

  const toggleSelectAll = () => {
    const start = (currentPage - 1) * props.pageSize;
    const newSet = new Set(selectedRows);
    const newSelectedIds = [...selectedIds];
    
    if (isAllSelected) {
      for (let i = 0; i < paginatedData.length; i++) {
        const globalIndex = start + i;
        newSet.delete(globalIndex);
        const rowId = String(paginatedData[i].Survey_ID || paginatedData[i].id || globalIndex);
        const idIndex = newSelectedIds.indexOf(rowId);
        if (idIndex > -1) {
          newSelectedIds.splice(idIndex, 1);
        }
      }
    } else {
      for (let i = 0; i < paginatedData.length; i++) {
        const globalIndex = start + i;
        newSet.add(globalIndex);
        const rowId = String(paginatedData[i].Survey_ID || paginatedData[i].id || globalIndex);
        if (!newSelectedIds.includes(rowId)) {
          newSelectedIds.push(rowId);
        }
      }
    }
    setSelectedRows(newSet);
    onSelectionChange?.(newSelectedIds);
  };

  const toggleSelectRow = (globalIndex: number) => {
    const newSet = new Set(selectedRows);
    const row = paginatedData[globalIndex - (currentPage - 1) * props.pageSize];
    const rowId = String(row.Survey_ID || row.id || globalIndex);
    const newSelectedIds = [...selectedIds];
    
    if (newSet.has(globalIndex)) {
      newSet.delete(globalIndex);
      const idIndex = newSelectedIds.indexOf(rowId);
      if (idIndex > -1) {
        newSelectedIds.splice(idIndex, 1);
      }
    } else {
      newSet.add(globalIndex);
      if (!newSelectedIds.includes(rowId)) {
        newSelectedIds.push(rowId);
      }
    }
    setSelectedRows(newSet);
    onSelectionChange?.(newSelectedIds);
  };


  return (
  <div className="w-full px-4 bg-white shadow rounded-xl mt-5">
    {/* Sticky header: title + search + actions */}
    <div className="sticky top-0 z-20 bg-white py-4">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <p className="text-lg font-semibold ml-2"> {title}</p>
        {/* Search bar */}
        <SearchBar
          value={searchTerm}
          placeholder={`Search for ${title}`}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}/>

        {showActions && (
          <div className="flex-shrink-0 flex gap-2">
            {/* your action buttons here */}
            {actions?.includes("add") && (
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdAdd size={20} />}
                  title="Add"
                  onClick={onAdd}
                />
              )}

              {actions?.includes("import") && (
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdFileUpload size={20} />}
                  title="Import"
                  onClick={onImport}
                />
              )}

              {actions?.includes("edit") && (
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdEdit size={20} />}
                  title="Edit"
                  onClick={selectedIds.length === 1 ? onEdit : undefined}
                  className={
                    selectedIds.length === 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
              )}

              {actions?.includes("delete") && (
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdDelete size={20} />}
                  title="Delete"
                  onClick={selectedIds.length >= 1 ? onDelete : undefined}
                  className={
                    selectedIds.length >= 1
                      ? ""
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
              )}

              {actions?.includes("export") && (
                <SubmitButton
                  label=""
                  variant="action"
                  icon={<MdFileDownload size={20} />}
                  title="Export CSV"
                  onClick={filteredData.length === 0 ? undefined : handleExportCSV}
                  className={
                    filteredData.length === 0
                      ? "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                      : ""
                  }
                />
              )}
              
              {actions?.includes("filter") && filterToolbarFilters.length > 0 && (
                <FilterToolbar
                  filters={filterToolbarFilters}
                  onClearAll={onFilterClearAll}
                  buttonText="Filter"
                />
              )}        
      
              {showFilters && filters && filters.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {filters.map((filter) => (
                      <select
                        key={filter.key}
                        value={filter.value}
                        onChange={(e) => filter.onChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {filter.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                )}
              {actions?.includes("approve") && (
                <SubmitButton
                  label="Approve"
                  variant="action"
                  icon={<MdCheckCircleOutline size={20} className="text-green-600" />}
                  title="Approve"
                  onClick={selectedIds.length >= 1 ? () => {
                    // Handle approve for selected rows
                    const selectedRows = data.filter(row => 
                      selectedIds.includes(String(row.Survey_ID || row.id))
                    );
                    selectedRows.forEach(row => onApprove?.(row));
                  } : undefined}
                  className={
                    selectedIds.length >= 1
                      ? "border-green-200 hover:bg-green-150"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
              )}

              {actions?.includes("reject") && (
                <SubmitButton
                  label="Reject"
                  variant="action"
                  icon={<MdOutlineCancel size={20} className="text-red-600" />}
                  title="Reject"
                  onClick={selectedIds.length >= 1 ? () => {
                    // Handle reject for selected rows
                    const selectedRows = data.filter(row => 
                      selectedIds.includes(String(row.Survey_ID || row.id))
                    );
                    selectedRows.forEach(row => onReject?.(row));
                  } : undefined}
                  className={
                    selectedIds.length >= 1
                      ? "border-red-200 hover:bg-red-150"
                      : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                  }
                />
              )}
          </div>
        )}
      </div>
    </div>

    {/* Table */}
    <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="bg-gray-50 sticky top-0 z-10 shadow">
          <tr className="text-left text-gray-700 border-b font-semibold text-base">
            <th className="py-2 px-3 border-b border-gray-200">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            {columns.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
              >
                {String(col).replaceAll("_", " ")}
                {sortConfig.column === col ? (
                  <span className="ml-2">
                    {sortConfig.direction === "asc" ?
                      <FaSortUp className="inline" /> : 
                      <FaSortDown className="inline" />}
                  </span>
                ) : (
                  <span className="ml-2">
                    <FaSort className="inline opacity-50" />
                  </span>

                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Render 5 skeleton rows while loading
            [...Array(5)].map((_, idx) => (
              <tr
                key={`skeleton-${idx}`}
                className={`border-b border-gray-200 ${
                  idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                }`}
              >
                <td className="py-2 px-3">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </td>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="py-2 px-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : paginatedData.length > 0 ? (
            paginatedData.map((row, idx) => {
              const globalIndex = (currentPage - 1) *  props.pageSize + idx;
              return (
                <tr
                  key={globalIndex}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  <td
                    className="py-2 px-3 align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRows.has(globalIndex)}
                      onChange={() => toggleSelectRow(globalIndex)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="py-2 px-3 align-middle truncate max-w-[180px]">
                      {typeof row[col] === "string" ? toSentenceCase(row[col]) : row[col]}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="p-3 text-center text-gray-500"
              >
                No results found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {/* Pagination - moved outside the scrollable table wrapper */}
    <div className="sticky bottom-0 z-20 bg-white flex items-center mt-4 h-10">
      <button onClick={props.onFirst} disabled={props.page === 1} title="First"><MdFirstPage size={22} /></button>
      <button onClick={props.onPrev} disabled={props.page === 1} title="Prev"><MdChevronLeft size={22} /></button>
      <div className="space-x-1 whitespace-nowrap">
        <span>{props.page}</span>
        <span>of </span>
        <span>{props.totalPages}</span>
      </div>
      <button onClick={props.onNext} disabled={props.page === props.totalPages} title="Next"><MdChevronRight size={22} /></button>
      <button onClick={props.onLast} disabled={props.page === props.totalPages} title="Last"><MdLastPage size={22} /></button>
      <span className="text-sm text-gray-500 flex items-center gap-1 sm:ml-auto xxs:w-full xxs:mt-1">
        Page Size:
        <select
          value={props.pageSize}
          onChange={props.onPageSizeChange}
          className="border rounded px-1 py-0.5 text-sm ml-1 min-w-[64px] w-auto"
        >
          <option>10</option>
          <option>20</option>
          <option>50</option>
          <option>100</option>
        </select>
      </span>
    </div>
  </div>
  );
}
