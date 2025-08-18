import React from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdHelpOutline } from "react-icons/md";

interface Candidate {
  id: number;
  name: string;
  position: string;
  partylist: string;
  email: string;
}

interface CandidatesTableProps {
  candidates: Candidate[];
  selectedIds: number[];
  onCheckboxChange: (id: number) => void;
  onRowClick?: (candidate: Candidate) => void;
  sortCol: "name" | "position" | "partylist" |  "email" | null;
  sortDir: "asc" | "desc";
  onSort: (col: "name" | "position" | "partylist" | "email") => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const CandidatesTable: React.FC<CandidatesTableProps> = ({
  candidates,
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
  const allChecked = candidates.length > 0 && candidates.every(c => selectedIds.includes(c.id));
  const someChecked = candidates.some(c => selectedIds.includes(c.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      candidates.forEach(c => onCheckboxChange(c.id));
    } else {
      candidates.forEach(c => {
        if (!selectedIds.includes(c.id)) onCheckboxChange(c.id);
      });
    }
  };

  return (
    <>
      {/* Title */}
      <h2 className="text-lg font-semibold mb-2">All Candidates</h2>
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
                Name{" "}
                {sortCol === "name" ? (
                  sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => onSort("position")}
              >
                Position{" "}
                {sortCol === "position" ? (
                  sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th className="py-2 px-3 border-b border-gray-200 flex items-center gap-1">
                <span
                  className="cursor-pointer select-none"
                  onClick={() => onSort("partylist")}
                >
                  Partylist{" "}
                  {sortCol === "partylist" ? (
                    sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                  ) : (
                    <FaSort className="inline opacity-50" />
                  )}
                </span>
                <MdHelpOutline size={16} className="inline text-gray-400" title="Partylist is optional" />
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => onSort("email")}
              >
                Email{" "}
                {sortCol === "email" ? (
                  sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th className="py-2 px-3 border-b border-gray-200">
                Credentials
              </th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-400">
                  No candidates found.
                </td>
              </tr>
            ) : (
              candidates.map((candidate, idx) => (
                <tr
                  key={candidate.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                  onClick={e => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                    onRowClick?.(candidate);
                  }}
                >
                  <td className="py-2 px-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(candidate.id)}
                      onChange={() => onCheckboxChange(candidate.id)}
                    />
                  </td>
                  <td className="py-2 px-3 align-middle">{candidate.name}</td>
                  <td className="py-2 px-3 align-middle">{candidate.position}</td>
                  <td className="py-2 px-3 align-middle">{candidate.partylist}</td>
                  <td className="py-2 px-3 align-middle">{candidate.email}</td>
                  <td className="py-2 px-3 align-middle">
                    {/* Download credentials button/logic here */}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination controls with padding, outside the table */}
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

export default CandidatesTable;