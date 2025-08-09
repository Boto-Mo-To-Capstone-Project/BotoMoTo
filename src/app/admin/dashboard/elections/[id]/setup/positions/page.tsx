"use client";
import { useState } from 'react';
import { MdAdd, MdDownload, MdFilterList, MdDelete, MdEdit, MdSave, MdFileUpload } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import PositionsTable from '@/components/PositionsTable';
import { PositionsModal } from '@/components/PositionsModal';
import { DragandDropdown } from '@/components/PositionsDragandDrop'; // <-- Add this import

export default function PositionsDashboardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<"position" | "voterLimit" | "numberOfWinners" | "scopeName" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // <-- Add this state
  const totalPages = 1; // Placeholder, update with your data logic

  // Placeholder handlers
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };
  const handleSort = (col: "position" | "voterLimit" | "numberOfWinners" | "scopeName") => {
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
  const handleSavePosition = (data: { position: string; voterLimit: number; numberOfWinners: number }) => {
    // TODO: Save the new position to your data source
    setShowModal(false);
  };

  return (
    <>
      <PositionsModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSavePosition}
      />
      {/* Import Positions Modal */}
      <DragandDropdown
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        label="Import Positions"
        description="Drag and drop your positions CSV file here, or click to select."
        accept=".csv"
        onChange={() => { /* handle file import here */ }}
        fileTypeText="Accepted file type: .csv"
        id="import-positions-file"
        maxSizeMB={5}
      />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        {/* Universal App Header */}

        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2">
            {/* Tabs */}
            <div className="flex-shrink-0">
            </div>
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
                onClick={() => setShowModal(true)}
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
                    ? () => {
                        /* TODO: handle edit */
                      }
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
                    ? () => {
                        /* TODO: handle download */
                      }
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
                    ? () => {
                        /* TODO: handle filter */
                      }
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
                    ? () => {
                        /* TODO: handle delete */
                      }
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
                    ? () => {
                        /* TODO: handle save */
                      }
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
            <PositionsTable
              positions={[]} // Pass your positions data here
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
              onRowClick={(position) => handleCheckboxChange(position.id)}
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}