import React from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight } from "react-icons/md";

interface Scope {
  id: number;
  name: string;
  description: string;
}

interface ScopeTableProps {
  scopeData: Scope[];
  selectedIds: number[];
  onCheckboxChange: (id: number) => void;
  onRowClick?: (scope: Scope) => void;
  sortCol: keyof Scope | null;
  sortDir: "asc" | "desc";
  onSort: (col: keyof Scope) => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const ScopeTable: React.FC<ScopeTableProps> = ({
  scopeData,
  selectedIds,
  onCheckboxChange,
  onRowClick,
  sortCol,
  sortDir,
  onSort,
  page,
  totalPages,
  onFirst,
  onPrev,
  onNext,
  onLast,
  pageSize,
  onPageSizeChange,
}) => {
  const allChecked = scopeData.length > 0 && scopeData.every(s => selectedIds.includes(s.id));
  const someChecked = scopeData.some(s => selectedIds.includes(s.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      scopeData.forEach(s => onCheckboxChange(s.id));
    } else {
      scopeData.forEach(s => {
        if (!selectedIds.includes(s.id)) onCheckboxChange(s.id);
      });
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-700 border-b font-semibold text-base">
              <th className="py-2 px-3 border-b border-gray-200">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                  onChange={handleHeaderCheckbox}
                />
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => onSort("name")}
              >
                Scoping Name{" "}
                {sortCol === "name" ? (
                  sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => onSort("description")}
              >
                Description{" "}
                {sortCol === "description" ? (
                  sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {scopeData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                  No scopes found.
                </td>
              </tr>
            ) : (
              scopeData.map((scope, idx) => (
                <tr
                  key={scope.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                  onClick={e => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                    onRowClick && onRowClick(scope);
                  }}
                >
                  <td className="py-2 px-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(scope.id)}
                      onChange={() => onCheckboxChange(scope.id)}
                    />
                  </td>
                  <td className="py-2 px-3 align-middle">{scope.name}</td>
                  <td className="py-2 px-3 align-middle">{scope.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination controls with padding, outside the table */}
      <div className="flex items-center gap-2 mt-4 w-full relative xxs:flex-wrap px-3 pb-3">
        <button onClick={onFirst} disabled={page === 1} title="First"><MdFirstPage size={22} /></button>
        <button onClick={onPrev} disabled={page === 1} title="Prev"><MdChevronLeft size={22} /></button>
        <span>{totalPages > 0 ? page : 1}</span>
        <span>of {totalPages > 0 ? totalPages : 1}</span>
        <button onClick={onNext} disabled={page === totalPages || totalPages === 0} title="Next"><MdChevronRight size={22} /></button>
        <button onClick={onLast} disabled={page === totalPages || totalPages === 0} title="Last"><MdLastPage size={22} /></button>
        <span className="text-sm text-gray-500 flex items-center gap-1 sm:ml-auto xxs:w-full xxs:mt-1">
          Page Size:
          <select
            value={pageSize}
            onChange={onPageSizeChange}
            className="border rounded px-1 py-0.5 text-sm ml-1 min-w-[64px] w-auto"
          >
            <option>10</option>
            <option>20</option>
            <option>50</option>
            <option>100</option>
          </select>
        </span>
      </div>
    </>
  );
};

export default ScopeTable;