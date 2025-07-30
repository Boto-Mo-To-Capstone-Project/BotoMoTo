"use client";
import { useState } from 'react';
import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdAdd, MdDownload, MdFilterList, MdDelete, MdSearch, MdUnfoldMore, MdArrowDropUp, MdArrowDropDown } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import { ElectionModal } from '@/components/ElectionModal';
import SearchBar from '@/components/SearchBar';
import PartyTable from '@/components/PartyTable';
// import AdminSidebar from '@/components/sidebars/AdminSidebar';

//naglagay lang pala ako ng emeng data para sa table
const partyData = [
  {
    id: 1,
    name: "Makabayan",
    color: "#FF6B35" // orange
  },
  {
    id: 2,
    name: "Matalino",
    color: "#3B82F6" // blue
  },
  {
    id: 3,
    name: "Mabait",
    color: "#8B5CF6" // purple
  },
];

export default function ElectionDashboardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'name' | 'color' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const totalPages = Math.ceil(partyData.length / pageSize);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1); // reset to first page when page size changes
  };

  const handleSort = (col: 'name' | 'color') => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  let filteredPartyData = partyData.filter((party: any) =>
    party.name.toLowerCase().includes(search.toLowerCase())
  );

  if (sortCol) {
    filteredPartyData = [...filteredPartyData].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedPartyData = filteredPartyData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar variant="default" /> */}
      <main className="flex-1 bg-white p-8 w-full min-w-0">
        <h1 className="text-2xl font-bold mb-1">Party</h1>
        <p className="text-gray-600 mb-6">This section allows you to register new parties and update existing party information in the system.</p>

        {/* Search and actions */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4 mb-6">
          {/* Search bar */}
          <div className="w-full md:w-auto">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Action Buttons */}
          <div className="w-full flex gap-2 md:w-auto md:ml-auto">
            <SubmitButton
              label=""
              variant="action"
              icon={<MdAdd size={20} />}
              title="Add"
              onClick={() => setShowCreateModal(true)}
            />
            <SubmitButton
              label=""
              variant="action"
              icon={<MdDownload size={20} />}
              title="Download"
              onClick={() => {}}
            />
            <SubmitButton
              label=""
              variant="action"
              icon={<MdFilterList size={20} />}
              title="Filter"
              onClick={() => {}}
            />
            <SubmitButton
              label=""
              variant="action"
              icon={<MdDelete size={20} />}
              title="Delete"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Table */}
        <PartyTable
          parties={paginatedPartyData}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          page={page}
          totalPages={totalPages}
          onFirst={handleFirst}
          onPrev={handlePrev}
          onNext={handleNext}
          onLast={handleLast}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onRowClick={(party: any) => console.log('Clicked party:', party)}
        />
      </main>
    </div>
  );
}
