
"use client";

import { useState } from 'react';
import {
  MdFirstPage, MdLastPage, MdChevronLeft, MdChevronRight, MdAdd, MdDownload, MdFilterList, MdDelete, MdSearch, MdUnfoldMore, MdArrowDropUp, MdArrowDropDown, MdCheckCircle, MdClose, MdEdit,
} from "react-icons/md";

import { SubmitButton } from '@/components/SubmitButton';
import { ScopeModal } from '@/components/ScopeModal';
import SearchBar from '@/components/SearchBar';
import ScopeTable from '@/components/ScopeTable';
import AppHeader from '@/components/AppHeader';
import AdminSidebar from '@/components/sidebars/AdminSidebar';
import toast, { Toaster } from 'react-hot-toast';
import CustomToast from '@/components/CustomToast';

// Sample data for the table
const scopeData = [
  {
    id: 1,
    type: "Department",
    name: "Department 1",
    description: "This section is used to register and update scope information within the system.",
  },
  {
    id: 2,
    type: "Department",
    name: "Department 2",
    description: "Focuses on academic concerns, curriculum support, and coordination with faculty.",
  },
  {
    id: 3,
    type: "Department",
    name: "Department 3",
    description: "Focuses on academic concerns, curriculum support, and coordination with faculty.",
  },
];

export default function ScopeDashboardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'type' | 'name' | 'description' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const totalPages = Math.ceil(scopeData.length / pageSize);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState('All');
  const [scopingTypes, setScopingTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState("");

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };
  const handleSort = (col: 'type' | 'name' | 'description') => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };
  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddType = () => {
    const trimmed = newType.trim();
    if (trimmed && !scopingTypes.includes(trimmed)) {
      setScopingTypes([...scopingTypes, trimmed]);
      setNewType("");
    }
  };

  const handleRemoveType = (type: string) => {
    setScopingTypes(scopingTypes.filter(t => t !== type));
  };

  let filteredScopeData = scopeData.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  if (sortCol) {
    filteredScopeData = [...filteredScopeData].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const paginatedScopeData = filteredScopeData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <Toaster position="top-center" />
      <div id="main-window-template-component" className="app h-full flex flex-col min-h-screen bg-gray-50">
        {/* Universal App Header */}
        <AppHeader onMenuClick={() => setSidebarOpen(true)} title="Scope" />
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
          {/* Scope Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            <ScopeTable
              scopeData={paginatedScopeData}
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
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        </div>
        <ScopeModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {}}
        />
      </div>
    </>
  );
}

              