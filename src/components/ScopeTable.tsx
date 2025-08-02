import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface Scope {
  id: number;
  type: string;
  name: string;
  description: string;
}

interface ScopeTableProps {
  scopeData: Scope[];
  sortCol: 'type' | 'name' | 'description' | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: 'type' | 'name' | 'description') => void;
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRowClick?: (scope: Scope) => void;
  title?: string;
  selectedIds?: number[];
  onCheckboxChange?: (id: number) => void;
  // New props for dropdown filter
  scopingTypes?: string[];
  selectedType?: string;
  onTypeChange?: (type: string) => void;
}

export default function ScopeTable({ title = 'All Scopes', selectedIds = [], onCheckboxChange, scopingTypes = [], selectedType = '', onTypeChange, ...props }: ScopeTableProps) {
  const allChecked = props.scopeData.length > 0 && props.scopeData.every(e => selectedIds.includes(e.id));
  const someChecked = props.scopeData.some(e => selectedIds.includes(e.id));

  const handleHeaderCheckbox = () => {
    if (allChecked) {
      props.scopeData.forEach(e => onCheckboxChange && onCheckboxChange(e.id));
    } else {
      props.scopeData.forEach(e => {
        if (!selectedIds.includes(e.id)) onCheckboxChange && onCheckboxChange(e.id);
      });
    }
  };

  // Filter data by selectedType if provided
  const filteredData = selectedType
    ? props.scopeData.filter(scope => scope.type === selectedType)
    : props.scopeData;

  return (
    <div>
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
      {/* Scoping Type Dropdown Filter */}
      {scopingTypes.length > 0 && onTypeChange && (
        <div className="mb-4">
          <label className="block font-medium mb-1">Filter by Scoping Type</label>
          <select
            className="w-full max-w-xs px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            value={selectedType}
            onChange={e => onTypeChange(e.target.value)}
          >
            <option value="">All Types</option>
            {scopingTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      )}
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
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap">Scoping Type</th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap">Scoping Name</th>
              <th className="py-2 px-3 border-b border-gray-200 whitespace-nowrap">Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((scope, idx) => (
              <tr
                key={scope.id + '-' + idx}
                className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} cursor-pointer`}
                onClick={e => {
                  if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                  onCheckboxChange && onCheckboxChange(scope.id);
                }}
              >
                <td className="py-2 px-3 align-middle">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(scope.id)}
                    onChange={() => onCheckboxChange && onCheckboxChange(scope.id)}
                  />
                </td>
                <td className="py-2 px-3 align-middle truncate max-w-[120px]">{scope.type}</td>
                <td className="py-2 px-3 align-middle truncate max-w-[180px]">{scope.name}</td>
                <td className="py-2 px-3 align-middle truncate max-w-[240px]">{scope.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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