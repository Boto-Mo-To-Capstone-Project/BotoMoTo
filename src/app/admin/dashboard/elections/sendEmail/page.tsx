
"use client";
import { useState } from "react";
import { MdAdd } from "react-icons/md";
import { SubmitButton } from "@/components/SubmitButton";
import SearchBar from "@/components/SearchBar";
import SendEmailTable from "@/components/sendEmailTable";
import { TrialSendingModal } from "@/components/TrialSendingModal";

export default function SendEmailPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<
    | "name"
    | "status"
    | "scope"
    | "email"
    | "contactNumber"
    | "birthdate"
    | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showTrialSendingModal, setShowTrialSendingModal] = useState(false);
  const [showSendDropdown, setShowSendDropdown] = useState(false);

  // Placeholder: Replace with actual voter data fetch logic
  const voters: any[] = [];
  const totalPages = 1;

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };
  const handleSort = (
    col:
      | "name"
      | "status"
      | "scope"
      | "email"
      | "contactNumber"
      | "birthdate"
  ) => {
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

  const handleSendEmail = (count: "all" | number) => {
    setShowSendDropdown(false);
    // TODO: Implement send email logic for count
    alert(`Send email: ${count}`);
  };

  return (
    <>
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2">
            <div className="flex-shrink-0"></div>
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex-shrink-0 flex gap-2 items-center">
              <SubmitButton
                label="Trial Sending"
                variant="action"
                icon={<MdAdd size={20} />}
                title="Trial Sending"
                onClick={() => setShowTrialSendingModal(true)}
              />
              <div className="relative inline-block text-left">
                <SubmitButton
                  label="Send Email"
                  variant="action"
                  type="button"
                  className="p-2 flex items-center justify-center"
                  onClick={() => setShowSendDropdown((prev) => !prev)}
                />
                {showSendDropdown && (
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 z-50">
                    <div className="py-1">
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleSendEmail("all")}
                      >
                        Send All
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleSendEmail(20)}
                      >
                        Send 20
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleSendEmail(50)}
                      >
                        Send 50
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleSendEmail(100)}
                      >
                        Send 100
                      </button>
                      <button
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => handleSendEmail(200)}
                      >
                        Send 200
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-5">
            <SendEmailTable
              voters={voters}
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
      </div>

      {/* TrialSendingModal */}
      <TrialSendingModal
        open={showTrialSendingModal}
        onClose={() => setShowTrialSendingModal(false)}
        onSave={function (data: {
          voterName: string;
          email: string;
          contactNumber: string;
          voterLimit: number;
          numberOfWinners: number;
          votingScopeId?: number | null;
        }): void {
          // TODO: Implement trial sending logic
        }}
      />
    </>
  );
}

