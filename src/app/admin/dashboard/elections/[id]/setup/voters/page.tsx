"use client";
import { useState, useEffect, useRef } from 'react';
import { MdAdd, MdDownload, MdFilterList, MdDelete, MdEdit, MdSave, MdFileUpload } from "react-icons/md";
import { FiDownload } from "react-icons/fi";
import { SubmitButton } from '@/components/SubmitButton';
import SearchBar from '@/components/SearchBar';
import VoterTable from '@/components/VoterTable';
import { VotersModal } from '@/components/VotersModal'; 
import { DragandDropdown } from '@/components/VotersDragandDropdown';
import { useParams, useRouter, useSearchParams } from "next/navigation";

// Debounce hook
function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function VoterDashboardPage() {
  const params = useParams<{ id: string }>();
  const electionId = Number(params?.id);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [sortCol, setSortCol] = useState<"name" | "status" | "scope" | "email" | "contactNumber" | "birthdate" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  // const totalPages = 1; // Placeholder, update with your data logic

  // Data state from API
  const [rows, setRows] = useState<Array<{
    id: number;
    name: string;
    status: string;
    scope: string;
    email: string;
    contactNumber: string;
    birthdate: string;
  }>>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Initialize state from URL once
  const initializedFromURL = useRef(false);
  useEffect(() => {
    if (initializedFromURL.current) return;
    initializedFromURL.current = true;

    const sp = new URLSearchParams(searchParams?.toString() || "");
    const p = Number(sp.get("page") || 1);
    const l = Number(sp.get("limit") || 10);
    const s = sp.get("search") || "";

    if (!Number.isNaN(p) && p > 0) setPage(p);
    if (!Number.isNaN(l) && l > 0) setPageSize(l);
    setSearch(s);
  }, [searchParams]);

  // Keep URL in sync with state
  useEffect(() => {
    const current = searchParams?.toString() || "";
    const sp = new URLSearchParams(current);
    sp.set("page", String(page));
    sp.set("limit", String(pageSize));
    if (debouncedSearch) sp.set("search", debouncedSearch); else sp.delete("search");

    const target = sp.toString();
    if (target !== current) {
      router.replace(`?${target}`, { scroll: false });
    }
  }, [page, pageSize, debouncedSearch, router, searchParams]);

  // Pagination handlers
  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };
  const handleSort = (col: "name" | "status" | "scope" | "email" | "contactNumber" | "birthdate") => {
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
  const handleAddVoter = (data: any) => {
    // TODO: Save voter logic here
    setShowVotersModal(false);
  };

  // Fetch voters from API
  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) return;

    const ctrl = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          electionId: String(electionId),
          page: String(page),
          limit: String(pageSize),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
        const res = await fetch(`/api/voters?${qs.toString()}`, {
          method: "GET",
          signal: ctrl.signal,
        });
        const json = await res.json();

        if (!res.ok || json?.success === false) {
          console.error("Failed to load voters:", json?.message || res.statusText);
          return;
        }

        // Map API voter -> table row
        const mapped = (json.data?.voters || []).map((v: any) => ({
          id: v.id,
          name: `${v.lastName ?? ""}, ${v.firstName ?? ""}${v.middleName ? " " + v.middleName : ""}`
            .trim()
            .replace(/^,\s*/, ""),
          status: v.isActive ? "Active" : "Inactive",
          scope: v.votingScope?.name ?? "—",
          email: v.email ?? "",
          contactNumber: v.contactNum ?? "",
          birthdate: "",
        }));

        setRows(mapped);
        setTotalPages(json.data?.pagination?.totalPages || 1);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Voters fetch error:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => ctrl.abort();
  }, [electionId, page, pageSize, debouncedSearch]);

  return (
    <>
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {/* Action Buttons */}
            <div className="flex-shrink-0 flex gap-2">
              <SubmitButton
                label=""
                variant="action"
                icon={<MdAdd size={20} />}
                title="Add"
                onClick={() => setShowVotersModal(true)}
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
                variant="action" // <-- change this!
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
            <VoterTable
              voters={rows} // dito nilagay voters
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
              onRowClick={(voter) => handleCheckboxChange(voter.id)}
              selectedIds={selectedIds}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        </div>
      </div>

      {/* VotersModal */}
      <VotersModal
        open={showVotersModal}
        onClose={() => setShowVotersModal(false)}
        onSave={handleAddVoter}
      />

      {/* DragandDropdown Modal */}
      <DragandDropdown
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        label="Import Voters"
        description="Drag and drop your voter CSV file here, or click to select."
        accept=".csv"
        onChange={() => { /* handle file import here */ }}
        fileTypeText="Accepted file type: .csv"
        id="import-voters-file"
        maxSizeMB={5}
      />
    </>
  );
}