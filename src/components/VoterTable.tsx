import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdUnfoldMore, MdArrowDropUp, MdArrowDropDown } from 'react-icons/md';

interface Voter {
  id: number;
  name: string;
  status: string;
  scope: string;
  email: string;
  contactNumber: string;
  birthdate: string;
}

interface VoterTableProps {
  voters: Voter[];
  sortCol: 'name' | 'status' | 'scope' | 'email' | 'contactNumber' | 'birthdate' | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'name' | 'status' | 'scope' | 'email' | 'contactNumber' | 'birthdate') => void;
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
}

export default function VoterTable({ title = 'All Voters', ...props }: VoterTableProps) {
  return (
    <div>
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-700 border-b font-semibold text-base">
              <th className="py-2 px-3 border-b border-gray-200"><input type="checkbox" /></th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap cursor-pointer select-none" onClick={() => props.onSort('name')}>
                <span className="flex items-center gap-1">
                  Name
                  {props.sortCol === 'name' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap cursor-pointer select-none" onClick={() => props.onSort('status')}>
                <span className="flex items-center gap-1">
                  Status
                  {props.sortCol === 'status' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap cursor-pointer select-none" onClick={() => props.onSort('scope')}>
                <span className="flex items-center gap-1">
                  Scope
                  {props.sortCol === 'scope' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap cursor-pointer select-none" onClick={() => props.onSort('email')}>
                <span className="flex items-center gap-1">
                  Email address
                  {props.sortCol === 'email' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap cursor-pointer select-none" onClick={() => props.onSort('contactNumber')}>
                <span className="flex items-center gap-1">
                  Contact Number
                  {props.sortCol === 'contactNumber' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap cursor-pointer select-none" onClick={() => props.onSort('birthdate')}>
                <span className="flex items-center gap-1">
                  Birthdate
                  {props.sortCol === 'birthdate' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {props.voters.map((voter, idx) => (
              <tr
                key={voter.id + '-' + idx}
                className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                onClick={() => props.onRowClick && props.onRowClick(voter)}
              >
                <td className="py-2 px-3 align-middle"><input type="checkbox" /></td>
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
                <td className="py-2 px-3 align-middle truncate max-w-[140px]">{voter.birthdate}</td>
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