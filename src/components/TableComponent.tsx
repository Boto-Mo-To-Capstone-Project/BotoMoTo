"use client";

import { useState, useMemo } from "react";
import { MdCheckCircleOutline, MdOutlineCancel } from "react-icons/md";
import SectionHeaderContainer from "./SectionHeaderContainer";

type TableProps = {
  title: string;
  columns: string[];
  data: Record<string, any>[];
  pageSize?: number;
  showActions?: boolean; // if table has actions
  onApprove?: (row: Record<string, any>) => void;
  onReject?: (row: Record<string, any>) => void;
  onRowClick?: (row: Record<string, any>) => void; // NEW: row click handler
};

type SortDirection = "asc" | "desc";

export default function Table({
  title,
  columns,
  data,
  pageSize = 5,
  showActions,
  onApprove,
  onReject,
  onRowClick,
}: TableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    column: string | null;
    direction: SortDirection;
  }>({ column: null, direction: "asc" });

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

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((_, idx) =>
      selectedRows.has((currentPage - 1) * pageSize + idx)
    );

  const toggleSelectAll = () => {
    const start = (currentPage - 1) * pageSize;
    const newSet = new Set(selectedRows);
    if (isAllSelected) {
      for (let i = 0; i < paginatedData.length; i++) {
        newSet.delete(start + i);
      }
    } else {
      for (let i = 0; i < paginatedData.length; i++) {
        newSet.add(start + i);
      }
    }
    setSelectedRows(newSet);
  };

  const toggleSelectRow = (globalIndex: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(globalIndex)) {
      newSet.delete(globalIndex);
    } else {
      newSet.add(globalIndex);
    }
    setSelectedRows(newSet);
  };

  return (
    <div className="w-full p-4 bg-white shadow rounded-xl">
      <SectionHeaderContainer variant="gray">{title}</SectionHeaderContainer>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search..."
        className="w-full mb-4 px-4 py-2 border rounded-md focus:outline-none focus:ring"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
      />

      {/* Table */}
      <div className="overflow-auto">
        <table className="min-w-full border border-gray-300 rounded-md">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border-b">
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
                  className="cursor-pointer text-left p-3 border-b font-semibold select-none"
                >
                  {col}
                  {sortConfig.column === col && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
              {showActions && (
                <th className="p-3 border-b font-semibold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => {
              const globalIndex = (currentPage - 1) * pageSize + idx;
              return (
                <tr
                  key={globalIndex}
                  className={`hover:bg-gray-50${
                    onRowClick ? " cursor-pointer" : ""
                  }`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  <td
                    className="p-3 border-b text-center"
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
                    <td key={col} className="p-3 border-b">
                      {row[col]}
                    </td>
                  ))}
                  {showActions && (
                    <td
                      className="p-3 border-b space-x-2 flex justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove?.(row);
                        }}
                        className="p-2 bg-green-900 text-white rounded hover:bg-green-700"
                        title="Approve"
                      >
                        <MdCheckCircleOutline size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject?.(row);
                        }}
                        className="p-2 bg-red-900 text-white rounded hover:bg-red-700"
                        title="Reject"
                      >
                        <MdOutlineCancel size={20} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {paginatedData.length === 0 && (
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

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex space-x-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
