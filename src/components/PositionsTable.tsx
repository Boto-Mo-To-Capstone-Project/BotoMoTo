import React from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import {
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight,
  MdVisibility
} from "react-icons/md";

interface Position {
  id: number;
  position: string;
  voteLimit: number;
  numberOfWinners: number;
  scopeName: string;
  order: number;
}

interface PositionsTableProps {
  positions: Position[];
  sortCol: 'position' | 'voteLimit' | 'numberOfWinners' | 'scopeName' | 'order' | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'position' | 'voteLimit' | 'numberOfWinners' | 'scopeName' | 'order') => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRowClick?: (position: Position) => void;
  onShowCandidates?: (positionId: number, positionName: string) => void; // NEW: callback for showing candidates
  title?: string;
  selectedIds?: number[];
  onCheckboxChange?: (id: number) => void;
  loading: boolean;
  hasLoaded: boolean;
}

export default function PositionsTable({
  title = 'All Positions',
  selectedIds = [],
  onCheckboxChange,
  onShowCandidates, // NEW
  loading,
  hasLoaded,
  ...props
}: PositionsTableProps) {
  const allChecked = props.positions.length > 0 && props.positions.every(p => selectedIds.includes(p.id));
  const someChecked = props.positions.some(p => selectedIds.includes(p.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      props.positions.forEach((p) => {
        if (onCheckboxChange) onCheckboxChange(p.id);
      });
    } else {
      props.positions.forEach((p) => {
        if (!selectedIds.includes(p.id)) {
          if (onCheckboxChange) onCheckboxChange(p.id);
        }
      });
    }
  };

  return (
    <div>
      {title ? <h2 className="text-lg font-semibold mb-2">{title}</h2> : null}
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
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
                onClick={() => props.onSort("position")}
              >
                Position{" "}
                {props.sortCol === "position" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
                onClick={() => props.onSort("voteLimit")}
              >
                Vote Limit{" "}
                {props.sortCol === "voteLimit" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
                onClick={() => props.onSort("numberOfWinners")}
              >
                No. of Winners{" "}
                {props.sortCol === "numberOfWinners" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
                onClick={() => props.onSort("order")}
              >
                Order{" "}
                {props.sortCol === "order" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
                onClick={() => props.onSort("scopeName")}
              >
                Scope Name{" "}
                {props.sortCol === "scopeName" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              {/* NEW: Show Candidates column */}
              <th className="py-2 px-3 border-b border-gray-200 text-center whitespace-nowrap">
                Show Candidates
              </th>
            </tr>
          </thead>
          <tbody>
            {(!hasLoaded && loading) ? (
              // Loading skeleton
              [...Array(5)].map((_, idx) => (
                <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="py-2 px-3 align-middle">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  </td>
                  <td className="py-2 px-3 align-middle">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </td>
                  <td className="py-2 px-3 align-middle">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </td>
                  <td className="py-2 px-3 align-middle">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  </td>
                  <td className="py-2 px-3 align-middle">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  </td>
                  <td className="py-2 px-3 align-middle">
                    <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                  </td>
                  {/* NEW: Show Candidates loading skeleton */}
                  <td className="py-2 px-3 align-middle text-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse mx-auto" />
                  </td>
                </tr>
              ))
            ) : (!loading && hasLoaded && props.positions.length === 0) ? (
              // Empty state
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-400">
                  No positions found.
                </td>
              </tr>
            ) : (
              // Actual data
              props.positions.map((position, idx) => (
                <tr
                  key={position.id + '-' + idx}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                    if ((e.target as HTMLElement).closest('.show-candidates-btn')) return;
                    if (onCheckboxChange) onCheckboxChange(position.id);
                  }}
                >
                  <td className="py-2 px-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(position.id)}
                      onChange={() => {
                        if (onCheckboxChange) onCheckboxChange(position.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="py-2 px-3 align-middle truncate max-w-[150px]">{position.position}</td>
                  <td className="py-2 px-3 align-middle">{position.voteLimit}</td>
                  <td className="py-2 px-3 align-middle">{position.numberOfWinners}</td>
                  <td className="py-2 px-3 align-middle">{position.order}</td>
                  <td className="py-2 px-3 align-middle truncate max-w-[180px]">{position.scopeName}</td>
                  {/* NEW: Show Candidates button */}
                  <td className="py-2 px-3 align-middle text-center">
                    <button
                      className="show-candidates-btn inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowCandidates?.(position.id, position.position);
                      }}
                      title="View candidates"
                    >
                      <MdVisibility size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center gap-2 mt-4 w-full relative xxs:flex-wrap">
        <button onClick={props.onFirst} disabled={props.page === 1} title="First">
          <MdFirstPage size={22} />
        </button>
        <button onClick={props.onPrev} disabled={props.page === 1} title="Prev">
          <MdChevronLeft size={22} />
        </button>
        <span>{props.page}</span>
        <span>of {props.totalPages}</span>
        <button onClick={props.onNext} disabled={props.page === props.totalPages} title="Next">
          <MdChevronRight size={22} />
        </button>
        <button onClick={props.onLast} disabled={props.page === props.totalPages} title="Last">
          <MdLastPage size={22} />
        </button>
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