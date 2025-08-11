"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdAdd, MdDownload, MdFilterList, MdDelete, MdEdit } from "react-icons/md";
import { SubmitButton } from '@/components/SubmitButton';
// import { ElectionModal } from '@/components/ElectionModal'; // keep component file but not used here per requirement
import SearchBar from '@/components/SearchBar';
import ElectionTable from '@/components/ElectionTable';
import toast, { Toaster } from 'react-hot-toast';
// import CustomToast from '@/components/CustomToast';

// Define the shape expected by ElectionTable
interface UiElection {
  id: number;
  name: string;
  status: "Ongoing" | "Finished";
  votingDate: string;
  time: string;
}

export default function ElectionDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"All" | "Ongoing" | "Ended">("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<
    "name" | "status" | "votingDate" | "time" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [electionsList, setElectionsList] = useState<UiElection[]>([]);
  const totalPages = Math.ceil(Math.max(1, electionsList.length) / pageSize);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  // Sidebar open state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch elections from backend
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/elections', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || json?.message || 'Failed to fetch elections');
        }
        const elections = (json?.data?.elections ?? []) as any[];
        // Map API elections to UI shape
        const mapped: UiElection[] = elections.map((e) => {
          const start = e?.schedule?.dateStart ? new Date(e.schedule.dateStart) : null;
          const finish = e?.schedule?.dateFinish ? new Date(e.schedule.dateFinish) : null;
          const fmtDate = (d: Date | null) => d?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? '—';
          const fmtTime = (d: Date | null) => d?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) ?? '—';
          const status: UiElection['status'] = e?.status === 'ACTIVE' ? 'Ongoing' : 'Finished';
          return {
            id: e.id,
            name: e.name,
            status,
            votingDate: start && finish ? `${fmtDate(start)} - ${fmtDate(finish)}` : '—',
            time: start && finish ? `${fmtTime(start)} - ${fmtTime(finish)}` : '—',
          } as UiElection;
        });
        if (!cancelled) setElectionsList(mapped);
      } catch (err) {
        console.error(err);
        !cancelled && toast.error('Failed to load elections');
      } finally {
        !cancelled && setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleFirst = () => setPage(1);
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const handleLast = () => setPage(totalPages);
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1); // reset to first page when page size changes
  };

  const handleSort = (col: "name" | "status" | "votingDate" | "time") => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // For multi-select: allow multiple checkboxes
  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Filter by search and tab
  let filteredElections = electionsList.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  if (tab === 'Ongoing') {
    filteredElections = filteredElections.filter(e => e.status === 'Ongoing');
  } else if (tab === 'Ended') {
    filteredElections = filteredElections.filter(e => e.status === 'Finished');
  }

  if (sortCol) {
    filteredElections = [...filteredElections].sort((a, b) => {
      if (sortCol === "votingDate") {
        const getStartDate = (val: string) => new Date(val.split(" - ")[0]);
        const aDate = getStartDate(a[sortCol]);
        const bDate = getStartDate(b[sortCol]);
        if (aDate < bDate) return sortDir === "asc" ? -1 : 1;
        if (aDate > bDate) return sortDir === "asc" ? 1 : -1;
        return 0;
      }
      let aVal: any = a[sortCol];
      let bVal: any = b[sortCol];
      // For time, sort by start time (assume format '10:00 AM - 2:00 PM')
      if (sortCol === "time") {
        aVal = aVal.split(" - ")[0];
        bVal = bVal.split(" - ")[0];
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  const paginatedElections = filteredElections.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <>
      <Toaster position="top-center" />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        {/* Universal App Header */}

        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Search and actions */}
          <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2 sm:px-5">
            {/* Tabs */}
            <div className="flex-shrink-0">
              <div className="inline-flex w-full max-w-[380px] md:w-auto rounded-md border border-gray-300 overflow-hidden bg-white">
                {["All", "Ongoing", "Ended"].map((t, i) => (
                  <SubmitButton
                    key={t}
                    label={t}
                    variant="tab"
                    isActive={tab === (t as any)}
                    onClick={() => { setTab(t as any); setPage(1); }}
                    className={`w-full h-[44px] md:w-[90px] md:h-10 ${
                      i !== 0 ? "border-l border-gray-200" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            {/* Search bar */}
            <div className="flex-1 md:mx-4">
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
                onClick={() => router.push('/admin/dashboard/elections/create')}
              />
              <SubmitButton
                label=""
                variant="action"
                icon={<MdEdit size={20} />}
                title="Edit"
                onClick={
                  selectedIds.length === 1
                    ? () => {
                        const id = selectedIds[0];
                        router.push(`/admin/dashboard/elections/create?id=${id}`);
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
            </div>
          </div>

          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading && electionsList.length === 0 ? (
              <div className="w-full p-4 text-center text-gray-500">Loading elections…</div>
            ) : (
              <ElectionTable
                elections={paginatedElections}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={handleSort}
                page={page}
                totalPages={Math.max(1, Math.ceil(filteredElections.length / pageSize))}
                onFirst={handleFirst}
                onPrev={handlePrev}
                onNext={handleNext}
                onLast={handleLast}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                onRowClick={(election) => handleCheckboxChange(election.id)}
                selectedIds={selectedIds}
                onCheckboxChange={handleCheckboxChange}
              />
            )}
          </div>
        </div>
        {/* Modal kept for future use but not rendered here */}
      </div>
    </>
  );
}
