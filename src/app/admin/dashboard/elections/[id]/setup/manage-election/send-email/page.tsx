"use client";
import { useState, useEffect, useRef } from "react";
import { MdAdd } from "react-icons/md";
import { SubmitButton } from "@/components/SubmitButton";
import SearchBar from "@/components/SearchBar";
import SendEmailTable from "@/components/sendEmailTable";
import { TrialSendingModal } from "@/components/TrialSendingModal";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// Debounce hook
function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function SendEmailPage() {
  const params = useParams<{ id: string }>();
  const electionId = Number(params?.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [sortCol, setSortCol] = useState<
    | "name"
    | "status"
    | "scope"
    | "email"
    | "contactNumber"
    | "birthdate"
    | "codeSendStatus"
    | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showTrialSendingModal, setShowTrialSendingModal] = useState(false);
  const [showSendDropdown, setShowSendDropdown] = useState(false);

  // Data state from API
  const [rows, setRows] = useState<Array<{
    id: number;
    name: string;
    status: string;
    scope: string;
    email: string;
    contactNumber: string;
    birthdate: string;
    voted: boolean;
    codeSendStatus: string;
  }>>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
      | "codeSendStatus"
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
          ...(sortCol ? { sortCol: sortCol, sortDir: sortDir } : {}),
        });
        const res = await fetch(`/api/voters?${qs.toString()}`, {
          method: "GET",
          signal: ctrl.signal,
        });
        const json = await res.json();

        if (!res.ok || json?.success === false) {
          toast.error(json?.message || "Failed to fetch voters");
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
          voted: !!v.voted,
          codeSendStatus: v.codeSendStatus || "PENDING",
        }));

        setRows(mapped);
        setTotalPages(json.data?.pagination?.totalPages || 1);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Failed to fetch voters:", e);
          toast.error("Failed to load voters");
        }
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => ctrl.abort();
  }, [electionId, page, pageSize, debouncedSearch, sortCol, sortDir, reloadKey]);

  return (
    <>
      <Toaster position="top-center" />
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
              voters={rows}
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

