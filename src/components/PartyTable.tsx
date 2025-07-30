import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdUnfoldMore, MdArrowDropUp, MdArrowDropDown } from 'react-icons/md';

interface Party {
  id: number;
  name: string;
  color: string;
}

interface PartyTableProps {
  parties: Party[];
  sortCol: 'name' | 'color' | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'name' | 'color') => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRowClick?: (party: Party) => void;
  title?: string;
}

export default function PartyTable({ title = 'All Parties', ...props }: PartyTableProps) {
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
                  Party
                  {props.sortCol === 'name' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap cursor-pointer select-none" onClick={() => props.onSort('color')}>
                <span className="flex items-center gap-1">
                  Color
                  {props.sortCol === 'color' ? (
                    props.sortDir === 'asc' ? <MdArrowDropUp className="text-gray-400 text-base" /> : <MdArrowDropDown className="text-gray-400 text-base" />
                  ) : (
                    <MdUnfoldMore className="text-gray-400 text-base" />
                  )}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {props.parties.map((party, idx) => (
              <tr
                key={party.id + '-' + idx}
                className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                onClick={() => props.onRowClick && props.onRowClick(party)}
              >
                <td className="py-2 px-3 align-middle"><input type="checkbox" /></td>
                <td className="py-2 px-3 align-middle truncate max-w-[180px]">{party.name}</td>
                <td className="py-2 px-3 align-middle truncate max-w-[140px]">
                  <span style={{ color: party.color }}>{party.name}</span>
                </td>
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