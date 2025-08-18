import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

interface Voter {
  id: number;
  name: string;
  status: string;
  scope: string;
  email: string;
  contactNumber: string;
  birthdate: string;
  // computed voting status
  voted: boolean;
}

interface VoterTableProps {
  voters: Voter[];
  sortCol: 'name' | 'status' | 'scope' | 'email' | 'contactNumber' | 'birthdate' | 'voted' | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'name' | 'status' | 'scope' | 'email' | 'contactNumber' | 'birthdate' | 'voted') => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRowClick?: (voter: Voter) => void;
  title?: string;
  selectedIds?: number[];
  onCheckboxChange?: (id: number) => void;
}

export default function VoterTable({
  title = 'All Voters',
  selectedIds = [],
  onCheckboxChange,
  ...props
}: VoterTableProps) {
  // Helper for header checkbox
  const allChecked = props.voters.length > 0 && props.voters.every(v => selectedIds.includes(v.id));
  const someChecked = props.voters.some(v => selectedIds.includes(v.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      // Uncheck all
      props.voters.forEach(v => onCheckboxChange?.(v.id));
    } else {
      // Check all
      props.voters.forEach(v => {
        if (!selectedIds.includes(v.id)) onCheckboxChange?.(v.id);
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
                Name{" "}
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
                onClick={() => props.onSort("scope")}
              >
                Scope{" "}
                {props.sortCol === "scope" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("email")}
              >
                Email{" "}
                {props.sortCol === "email" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("contactNumber")}
              >
                Contact{" "}
                {props.sortCol === "contactNumber" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
              <th
                className="py-2 px-3 border-b border-gray-200 cursor-pointer select-none"
                onClick={() => props.onSort("voted")}
              >
                Voted{" "}
                {props.sortCol === "voted" ? (
                  props.sortDir === "asc" ? <FaSortUp className="inline" /> : <FaSortDown className="inline" />
                ) : (
                  <FaSort className="inline opacity-50" />
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {props.voters.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-400">
                  No voters found.
                </td>
              </tr>
            ) : (
              props.voters.map((voter, idx) => (
                <tr
                  key={voter.id + '-' + idx}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                  onClick={e => {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                    onCheckboxChange?.(voter.id);
                  }}
                >
                  <td className="py-2 px-3 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(voter.id)}
                      onChange={() => onCheckboxChange?.(voter.id)}
                    />
                  </td>
                  <td className="py-2 px-3 align-middle truncate max-w-[150px]">{voter.name}</td>
                  <td className="py-2 px-3 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {voter.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 align-middle truncate max-w-[120px]">{voter.scope}</td>
                  <td className="py-2 px-3 align-middle truncate max-w-[180px]">{voter.email}</td>
                  <td className="py-2 px-3 align-middle truncate max-w-[140px]">{voter.contactNumber}</td>
                  <td className="py-2 px-3 align-middle text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      voter.voted 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {voter.voted ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))
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