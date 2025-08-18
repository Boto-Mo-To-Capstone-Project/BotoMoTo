import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdUnfoldMore, MdArrowDropUp, MdArrowDropDown } from 'react-icons/md';
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

interface Election {
  id: number;
  name: string;
  status: string;
  votingDate: string;
  time: string;
}

interface ElectionTableProps {
  elections: Election[];
  sortCol: 'name' | 'status' | 'votingDate' | 'time' | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'name' | 'status' | 'votingDate' | 'time') => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRowClick?: (election: Election) => void;
  title?: string;
  selectedIds?: number[];
  onCheckboxChange?: (id: number) => void;
}

export default function ElectionTable({ title = 'All Elections', selectedIds = [], onCheckboxChange, ...props }: ElectionTableProps) {
  // Helper for header checkbox
  const allChecked = props.elections.length > 0 && props.elections.every(e => selectedIds.includes(e.id));
  const someChecked = props.elections.some(e => selectedIds.includes(e.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      // Uncheck all
      props.elections.forEach(e => onCheckboxChange?.(e.id));
    } else {
      // Check all
      props.elections.forEach(e => {
        if (!selectedIds.includes(e.id)) onCheckboxChange?.(e.id);
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
                onClick={() => props.onSort("name")}
              >
                Election{" "}
                {props.sortCol === "name" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("status")}
              >
                Status{" "}
                {props.sortCol === "status" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("votingDate")}
              >
                Voting date{" "}
                {props.sortCol === "votingDate" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("time")}
              >
                Time{" "}
                {props.sortCol === "time" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {props.elections.map((election, idx) => (
              <tr
                key={election.id + '-' + idx}
                className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                onClick={e => {
                  // Prevent double toggle if checkbox is clicked
                  if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                  onCheckboxChange?.(election.id);
                }}
              >
                <td className="py-2 px-3 align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(election.id)}
                    onChange={() => onCheckboxChange?.(election.id)}
                  />
                </td>
                <td className="py-2 px-3 align-middle truncate max-w-[180px]">{election.name}</td>
                <td className="py-2 px-3 align-middle text-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium w-full block text-center
    ${election.status === "Finished" ? "bg-green-100 text-green-700" : election.status === "Ongoing" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}
  `}>
    {election.status === "Finished" ? "Ended" : election.status}
  </span>
                </td>
                <td className="py-2 px-3 align-middle truncate max-w-[140px]">{election.votingDate}</td>
                <td className="py-2 px-3 align-middle truncate max-w-[120px]">{election.time}</td>
              </tr>
            ))}
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