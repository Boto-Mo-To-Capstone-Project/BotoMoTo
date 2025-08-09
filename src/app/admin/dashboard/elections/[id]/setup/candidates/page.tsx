"use client";
import { useState } from 'react';
import { MdAdd, MdDownload, MdFilterList, MdDelete, MdEdit, MdSave, MdFileUpload } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import CandidatesTable from '@/components/CandidatesTable';
import { CandidatesModal } from "@/components/CandidatesModal";
import { DragandDropdown } from "@/components/CandidatesDragandDrop";

export default function CandidatesDashboardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  type Candidate = {
    id: number;
    name: string;
    position: string;
    partylist: string;
    department: string;
    email: string;
  };
  const [sortCol, setSortCol] = useState<keyof Candidate | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const totalPages = 1; // Placeholder, update with your data logic

  // Example candidate data (replace with real data)
  const candidates: Candidate[] = [];

  // Sorting logic
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (!sortCol) return 0;
    if (a[sortCol] < b[sortCol]) return sortDir === "asc" ? -1 : 1;
    if (a[sortCol] > b[sortCol]) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination logic (slice the sortedCandidates array)
  const pagedCandidates = sortedCandidates.slice((page - 1) * pageSize, page * pageSize);

  // Handlers
  const handleSort = (col: keyof Candidate) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };
  // Example handler for saving a candidate
  const handleAddCandidate = (data: any) => {
    // TODO: Add candidate logic here
    setShowCandidatesModal(false);
  };

  return (
    <>
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2">
            {/* Tabs */}
            <div className="flex-shrink-0"></div>
            {/* Search bar */}
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-2">
              <SubmitButton
                label=""
                variant="action"
                icon={<MdAdd size={20} />}
                title="Add"
                onClick={() => setShowCandidatesModal(true)}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdFileUpload size={20} />}
                title="Import"
                onClick={() => setShowImportModal(true)}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdEdit size={20} />}
                title="Edit"
                onClick={
                  selectedIds.length === 1
                    ? () => { /* TODO: handle edit */ }
                    : undefined
                }
                className={
                  selectedIds.length === 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdDownload size={20} />}
                title="Download"
                onClick={
                  selectedIds.length >= 1
                    ? () => { /* TODO: handle download */ }
                    : undefined
                }
                className={
                  selectedIds.length >= 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdFilterList size={20} />}
                title="Filter"
                onClick={
                  selectedIds.length >= 1
                    ? () => { /* TODO: handle filter */ }
                    : undefined
                }
                className={
                  selectedIds.length >= 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdDelete size={20} />}
                title="Delete"
                onClick={
                  selectedIds.length >= 1
                    ? () => { /* TODO: handle delete */ }
                    : undefined
                }
                className={
                  selectedIds.length >= 1
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              />
              {/* Save Button */}
              <SubmitButton
                label="Save"
                variant="action"
                icon={
                  <MdSave
                    size={20}
                    className={
                      selectedIds.length > 0
                        ? "text-[var(--color-primary)]"
                        : "text-gray-400"
                    }
                  />
                }
                title="Save"
                onClick={
                  selectedIds.length > 0
                    ? () => { /* TODO: handle save */ }
                    : undefined
                }
                className={
                  selectedIds.length > 0
                    ? ""
                    : "text-gray-400 bg-gray-100 cursor-not-allowed pointer-events-none"
                }
              />
            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
            <CandidatesTable
              candidates={pagedCandidates}
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
              onRowClick={(candidate) => handleCheckboxChange(candidate.id)}
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        </div>
      </div>
      {/* Candidates Modal */}
      <CandidatesModal
        open={showCandidatesModal}
        onClose={() => setShowCandidatesModal(false)}
        onSave={handleAddCandidate}
      />
      {/* Import Candidates Modal */}
      <DragandDropdown
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        label="Import Candidates"
        description="Drag and drop your candidates CSV file here, or click to select."
        accept=".csv"
        onChange={() => { /* handle file import here */ }}
        fileTypeText="Accepted file type: .csv"
        id="import-candidates-file"
        maxSizeMB={5}
      />
    </>
  );
}