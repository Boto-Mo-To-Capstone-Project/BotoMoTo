"use client";
import { useState } from 'react';
import { MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdAdd, MdDownload, MdFilterList, MdDelete, MdSearch, MdUnfoldMore, MdArrowDropUp, MdArrowDropDown } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import { ElectionModal } from '@/components/ElectionModal';
import SearchBar from '@/components/SearchBar';
import VoterTable from '@/components/VoterTable';
// import AdminSidebar from '@/components/sidebars/AdminSidebar';

//naglagay lang pala ako ng emeng data para sa table
const voterData = [
  {
    id: 1,
    name: "Olivia Rhye",
    status: "Active",
    scope: "Department 1",
    email: "olivia@pup.edu.ph",
    contactNumber: "09918432537",
    birthdate: "January 15, 1998"
  },
  {
    id: 2,
    name: "Phoenix Baker",
    status: "Active",
    scope: "Department 2",
    email: "phoenix@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "February 15, 1999"
  },
  {
    id: 3,
    name: "Lana Steiner",
    status: "Active",
    scope: "Department 3",
    email: "lana@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "March 16, 2000"
  },
  {
    id: 4,
    name: "Demi Wilkinson",
    status: "Active",
    scope: "Department 1",
    email: "demi@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "April 17, 2001"
  },
  {
    id: 5,
    name: "Candice Wu",
    status: "Active",
    scope: "Department 2",
    email: "candice@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "May 18, 2002"
  },
  {
    id: 6,
    name: "Natali Craig",
    status: "Active",
    scope: "Department 3",
    email: "natali@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "June 19, 1997"
  },
  {
    id: 7,
    name: "Drew Cano",
    status: "Active",
    scope: "Department 1",
    email: "drew@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "July 20, 1996"
  },
  {
    id: 8,
    name: "Orlando Diggs",
    status: "Active",
    scope: "Department 2",
    email: "orlando@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "August 21, 1995"
  },
  {
    id: 9,
    name: "Andi Lane",
    status: "Active",
    scope: "Department 3",
    email: "andi@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "September 22, 1994"
  },
  {
    id: 10,
    name: "Kate Morrison",
    status: "Active",
    scope: "Department 1",
    email: "kate@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "December 25, 1969"
  },
  {
    id: 11,
    name: "John Doe",
    status: "Active",
    scope: "Department 1",
    email: "john@pup.edu.ph",
    contactNumber: "09123456789",
    birthdate: "January 1, 1990"
  }
];

export default function ElectionDashboardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'name' | 'status' | 'scope' | 'email' | 'contactNumber' | 'birthdate' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const totalPages = Math.ceil(voterData.length / pageSize);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1); // reset to first page when page size changes
  };

  const handleSort = (col: 'name' | 'status' | 'scope' | 'email' | 'contactNumber' | 'birthdate') => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  let filteredVoterData = voterData.filter((voter: any) =>
    voter.name.toLowerCase().includes(search.toLowerCase())
  );

  if (sortCol) {
    filteredVoterData = [...filteredVoterData].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedVoterData = filteredVoterData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex min-h-screen">
      {/* <AdminSidebar variant="default" /> */}
      <main className="flex-1 bg-white p-8 w-full min-w-0">
        <h1 className="text-2xl font-bold mb-1">Voter</h1>
        <p className="text-gray-600 mb-6">This section allows you to manage voter information and registration within the system.</p>

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
              title="Add Voter"
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
        <VoterTable
          voters={paginatedVoterData}
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
          onRowClick={(voter: any) => console.log('Clicked voter:', voter)}
        />
      </main>
    </div>
  );
}
