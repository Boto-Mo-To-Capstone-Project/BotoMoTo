"use client";
import { useState } from 'react';
import { MdAdd, MdDownload, MdFilterList, MdDelete } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import { ElectionModal } from '@/components/ElectionModal';
import SearchBar from '@/components/SearchBar';
import ElectionTable from '@/components/ElectionTable';

//naglagay lang pala ako ng emeng data para sa table
const elections = [
  {
    id: 1,
    name: 'PUP Provident Election 2024',
    status: 'Finished',
    votingDate: 'Jan 13, 2024 - Jan 14, 2024',
    time: '10:00 AM - 2:00 PM',
  },
  {
    id: 2,
    name: 'PUP Provident Election 2023',
    status: 'Finished',
    votingDate: 'Jan 13, 2023 - Jan 13, 2023',
    time: '10:00 AM - 2:00 PM',
  },
  {
    id: 3,
    name: 'PUP Provident Election 2022',
    status: 'Finished',
    votingDate: 'Jan 13, 2022 - Jan 14, 2022',
    time: '10:00 AM - 2:00 PM',
  },
  {
    id: 4,
    name: 'PUP Provident Election 2021',
    status: 'Finished',
    votingDate: 'Jan 13, 2021 - Jan 14, 2021',
    time: '10:00 AM - 2:00 PM',
  },
  {
    id: 5,
    name: 'PUP Provident Election 2020',
    status: 'Finished',
    votingDate: 'Jan 13, 2020 - Jan 14, 2020',
    time: '10:00 AM - 2:00 PM',
  },
  {
    id: 6,
    name: 'PUP Provident Election 2019',
    status: 'Finished',
    votingDate: 'Jan 13, 2019 - Jan 14, 2019',
    time: '10:00 AM - 2:00 PM',
  },
  {
    id: 7,
    name: 'PUP Provident Election 2018',
    status: 'Finished',
    votingDate: 'Jan 13, 2018 - Jan 14, 2018',
    time: '10:00 AM - 2:00 PM',
  },
];

export default function ElectionDashboardPage() {
  const [tab, setTab] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'name' | 'status' | 'votingDate' | 'time' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const totalPages = Math.ceil(elections.length / pageSize);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1); // reset to first page when page size changes
  };

  const handleSort = (col: 'name' | 'status' | 'votingDate' | 'time') => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  let filteredElections = elections.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  if (sortCol) {
    filteredElections = [...filteredElections].sort((a, b) => {
      if (sortCol === 'votingDate') {
        const getStartDate = (val: string) => new Date(val.split(' - ')[0]);
        const aDate = getStartDate(a[sortCol]);
        const bDate = getStartDate(b[sortCol]);
        if (aDate < bDate) return sortDir === 'asc' ? -1 : 1;
        if (aDate > bDate) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      // For time, sort by start time (assume format '10:00 AM - 2:00 PM')
      if (sortCol === 'time') {
        aVal = aVal.split(' - ')[0];
        bVal = bVal.split(' - ')[0];
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedElections = filteredElections.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar variant="default" /> */}
      <main className="flex-1 bg-white p-8 w-full min-w-0">
        <h1 className="text-2xl font-bold mb-1">Hi, Administrator!</h1>
        <p className="text-gray-600 mb-6">Polytechnic University of the Philippines (PUP) Provident Fund</p>

        {/* Search and actions */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4 mb-6">
          {/* Tabs */}
          <div className="w-full md:w-auto flex justify-center md:block">
            <div className="inline-flex w-full max-w-[380px] md:w-auto rounded-md border border-gray-300 overflow-hidden bg-white">
              {['All', 'Ongoing', 'Finished'].map((t, i) => (
                <SubmitButton
                  key={t}
                  label={t}
                  variant="tab"
                  isActive={tab === t}
                  onClick={() => setTab(t)}
                  className={`w-full h-[44px] md:w-[90px] md:h-10 ${i !== 0 ? 'border-l border-gray-200' : ''}`}
                />
              ))}
            </div>
          </div>
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
        <ElectionTable
          elections={paginatedElections}
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
          onRowClick={election => console.log('Clicked election:', election)}
        />
        <ElectionModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={() => setShowCreateModal(false)}
        />
      </main>
    </div>
  );
}
