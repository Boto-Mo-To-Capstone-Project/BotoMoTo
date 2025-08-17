"use client";

import { useState, useMemo } from "react";
import { MdAdd, MdCheckCircleOutline, MdChevronLeft, MdChevronRight, MdFirstPage, MdLastPage, MdOutlineCancel } from "react-icons/md";
import SearchBar from "./SearchBar";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import { SubmitButton } from "./SubmitButton";
import { useRouter } from "next/navigation";

type TableProps = {
  title: string;
  columns: string[];
  data: Record<string, any>[];
  showActions?: boolean; // if table has actions
  onApprove?: (row: Record<string, any>) => void;
  onReject?: (row: Record<string, any>) => void;
  onRowClick?: (row: Record<string, any>) => void; // NEW: row click handler
  pageSize: number;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

type SortDirection = "asc" | "desc";

export default function Table({
  title,
  columns,
  data,
  showActions,
  onApprove,
  onReject,
  onRowClick,
  
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
    const start = (currentPage - 1) *  props.pageSize;
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
    newSet.has(globalIndex)
      ? newSet.delete(globalIndex)
      : newSet.add(globalIndex);
    setSelectedRows(newSet);
  };

  return (
    <div className="w-full p-4 bg-white shadow rounded-xl mt-5">
      {/* search and tablename and actions div */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-lg font-semibold mb-2 "> {title}</p>
        {/* Search bar */}
        <SearchBar
          value={searchTerm}
          placeholder ={`Search for ${title}`}
          onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
          }}/>

          {showActions && (
          <div className="flex-shrink-0 flex gap-2">
            <SubmitButton
              label="Approve"
              variant="action"
              icon={<MdCheckCircleOutline size={20} color="green"/>}
              title="Add"
            />
            <SubmitButton
              label="Reject"
              variant="action"
              icon={<MdOutlineCancel size={20} color="red"/>}
              title="Add"
            />
            
        </div>
         )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="bg-gray-50">
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
                  className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
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
            {paginatedData.map((row, idx) => {
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

      {/* Pagination - moved outside the scrollable table wrapper */}
      <div className="flex items-center gap-2 mt-4 w-full relative xxs:flex-wrap">
        <button onClick={props.onFirst} disabled={props.page === 1} title="First"><MdFirstPage size={22} /></button>
        <button onClick={props.onPrev} disabled={props.page === 1} title="Prev"><MdChevronLeft size={22} /></button>
        <span>{props.page}</span>
        <span>of {props.totalPages}</span>
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
