import React from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import {
  MdFirstPage,
  MdLastPage,
  MdChevronLeft,
  MdChevronRight
} from "react-icons/md";

interface Position {
  id: number;
  position: string;
  voterLimit: number;
  numberOfWinners: number;
  scopeName: string;
}

interface PositionsTableProps {
  positions: Position[];
  sortCol: 'position' | 'voterLimit' | 'numberOfWinners' | 'scopeName' | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'position' | 'voterLimit' | 'numberOfWinners' | 'scopeName') => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRowClick?: (position: Position) => void;
  title?: string;
  selectedIds?: number[];
  onCheckboxChange?: (id: number) => void;
}

export default function PositionsTable({
  title = 'All Positions',
  selectedIds = [],
  onCheckboxChange,
  ...props
}: PositionsTableProps) {
  const allChecked = props.positions.length > 0 && props.positions.every(p => selectedIds.includes(p.id));
  const someChecked = props.positions.some(p => selectedIds.includes(p.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      props.positions.forEach(p => onCheckboxChange && onCheckboxChange(p.id));
    } else {
      props.positions.forEach(p => {
        if (!selectedIds.includes(p.id)) onCheckboxChange && onCheckboxChange(p.id);
      });
    }
  };

  return (
    <div>
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
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
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("voterLimit")}
              >
                Voter Limit{" "}
                {props.sortCol === "voterLimit" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("numberOfWinners")}
              >
                Number of Winners{" "}
                {props.sortCol === "numberOfWinners" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("scopeName")}
              >
                Scope Name{" "}
                {props.sortCol === "scopeName" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {props.positions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                  No positions found.
                </td>
              </tr>
            ) : (
              props.positions.map((position, idx) => (
                <tr
                  key={position.id + '-' + idx}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                  onClick={e => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                    onCheckboxChange && onCheckboxChange(position.id);
                    props.onRowClick && props.onRowClick(position);
                  }}
                >
                  <td className="py-2 px-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(position.id)}
                      onChange={() => onCheckboxChange && onCheckboxChange(position.id)}
                    />
                  </td>
                  <td className="py-2 px-3 align-middle truncate max-w-[150px]">{position.position}</td>
                  <td className="py-2 px-3 align-middle">{position.voterLimit}</td>
                  <td className="py-2 px-3 align-middle">{position.numberOfWinners}</td>
                  <td className="py-2 px-3 align-middle truncate max-w-[180px]">{position.scopeName}</td>
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