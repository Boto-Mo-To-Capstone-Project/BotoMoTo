import React from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdVisibility } from "react-icons/md";

interface Party {
  id: number;
  name: string;
  color: string;
}

interface PartyTableProps {
  parties: Party[];
  selectedIds: number[];
  onCheckboxChange: (id: number) => void;
  onRowClick?: (party: Party) => void;
  onShowMembers?: (partyId: number, partyName: string) => void; // NEW: callback for showing members
  sortCol: keyof Party | null;
  sortDir: "asc" | "desc";
  onSort: (col: keyof Party) => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const PartyTable: React.FC<PartyTableProps> = ({
  parties,
  selectedIds,
  onCheckboxChange,
  onRowClick,
  onShowMembers, // NEW
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
  const allChecked = parties.length > 0 && parties.every(p => selectedIds.includes(p.id));
  const someChecked = parties.some(p => selectedIds.includes(p.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      parties.forEach((p) => {
        onCheckboxChange(p.id);
      });
    } else {
      parties.forEach((p) => {
        if (!selectedIds.includes(p.id)) {
          onCheckboxChange(p.id);
        }
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
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
                onClick={() => onSort("name")}
              >
                Party Name{" "}
                {sortCol === "name" ? (
                  sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none whitespace-nowrap"
                onClick={() => onSort("color")}
              >
                Party Color{" "}
                {sortCol === "color" ? (
                  sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              {/* NEW: Show Members column */}
              <th className="py-2 px-3 border-b border-gray-200 text-center whitespace-nowrap">
                Show Members
              </th>
            </tr>
          </thead>
          <tbody>
            {parties.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                  No parties found.
                </td>
              </tr>
            ) : (
              parties.map((party, idx) => (
                <tr
                  key={party.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                    if ((e.target as HTMLElement).closest('.show-members-btn')) return;
                    onRowClick?.(party);
                  }}
                >
                  <td className="py-2 px-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(party.id)}
                      onChange={() => onCheckboxChange(party.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="py-2 px-3 align-middle">{party.name}</td>
                  <td className="py-2 px-3 align-middle">
                    <span style={{ color: party.color }}>{party.color}</span>
                  </td>
                  {/* NEW: Show Members button */}
                  <td className="py-2 px-3 align-middle text-center">
                    <button
                      className="show-members-btn inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowMembers?.(party.id, party.name);
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
      {/* Pagination controls */}
      <div className="flex items-center gap-2 mt-4 w-full relative xxs:flex-wrap">
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

export default PartyTable;