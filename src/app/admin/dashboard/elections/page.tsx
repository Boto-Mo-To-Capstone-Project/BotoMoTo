"use client";
import { useState } from 'react';
import { MdAdd, MdDownload, MdFilterList, MdDelete, MdEdit } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import { ElectionModal } from '@/components/ElectionModal';
import SearchBar from '@/components/SearchBar';
import ElectionTable from '@/components/ElectionTable';
import AppHeader from '@/components/AppHeader';
import AdminSidebar from '@/components/sidebars/AdminSidebar';
import toast, { Toaster } from 'react-hot-toast';
import CustomToast from '@/components/CustomToast';

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
  const [electionsList, setElectionsList] = useState(elections);
  const totalPages = Math.ceil(electionsList.length / pageSize);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [lastAddedElection, setLastAddedElection] = useState<any>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // Sidebar open state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handleAddElection = (electionData: any) => {
    // Format dates for display
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };

    // Format time for display
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };

    const newElection = {
      id: Math.max(...electionsList.map(e => e.id)) + 1,
      name: electionData.name,
      status: 'Ongoing',
      votingDate: `${formatDate(electionData.dateBegin)} - ${formatDate(electionData.dateEnd)}`,
      time: `${formatTime(electionData.dateBegin)} - ${formatTime(electionData.dateEnd)}`
    };
    
    setElectionsList(prev => [newElection, ...prev]);
    setLastAddedElection(newElection);
    setShowSuccessNotification(true);
    setShowCreateModal(false);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
      setLastAddedElection(null);
    }, 5000);

    toast.custom((t) => (
      <CustomToast t={t} message={`Well done! You successfully created "${electionData.name}" election.`} />
    ));
  };

  const handleRowClick = (election: any) => {
    setSelectedElectionId(election.id);
  };

  // For multi-select: allow multiple checkboxes
  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  let filteredElections = electionsList.filter(e =>
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
    <>
      <Toaster position="top-center" />
      <div id="main-window-template-component" className="app h-full flex flex-col min-h-screen bg-gray-50">
        {/* Universal App Header */}
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar variant="default" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
        
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2 sm:px-5">
            {/* Tabs */}
            <div className="flex-shrink-0">
              <div className="inline-flex w-full max-w-[380px] md:w-auto rounded-md border border-gray-300 overflow-hidden bg-white">
                {['All', 'Ongoing', 'Ended'].map((t, i) => (
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
            <div className="flex-1 md:mx-4">
              <SearchBar value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-2">
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
                icon={<MdEdit size={20} />}
                title="Edit"
                onClick={selectedIds.length === 1 ? () => { /* TODO: handle edit */ } : undefined}
                className={selectedIds.length === 1 ? '' : 'text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none'}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdDownload size={20} />}
                title="Download"
                onClick={selectedIds.length >= 1 ? () => { /* TODO: handle download */ } : undefined}
                className={selectedIds.length >= 1 ? '' : 'text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none'}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdFilterList size={20} />}
                title="Filter"
                onClick={selectedIds.length >= 1 ? () => { /* TODO: handle filter */ } : undefined}
                className={selectedIds.length >= 1 ? '' : 'text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none'}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdDelete size={20} />}
                title="Delete"
                onClick={selectedIds.length >= 1 ? () => { /* TODO: handle delete */ } : undefined}
                className={selectedIds.length >= 1 ? '' : 'text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none'}
              />
            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
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
              onRowClick={election => handleCheckboxChange(election.id)}
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        </div>
        <ElectionModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleAddElection}
        />
      </div>
    </>
  );
}
