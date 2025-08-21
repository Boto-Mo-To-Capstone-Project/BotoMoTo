"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Table from "@/components/TableComponent";
import TicketChatModal from "@/components/TicketChatModal";
import CreateTicketModal from "@/components/CreateTicketModal";
import Button from "@/components/Button";
import { toSentenceCase } from "@/hooks/useSentenceCase";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = await res.json();

      let ticketsArr: any[] = [];
      if (data && data.data && data.data.tickets) {
        ticketsArr = data.data.tickets;
      } else if (Array.isArray(data)) {
        ticketsArr = data;
      } else if (Array.isArray(data.tickets)) {
        ticketsArr = data.tickets;
      }

      const mappedTickets = ticketsArr.map((t) => ({
        Organization_Name: t.organization?.name || "Unknown Org",
        Ticket: t.subject || t.message || "No subject",
        Status: t.status || "Unknown",
        _original: t,
      }));

      setTickets(mappedTickets);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if there is an active ticket (PENDING or IN_PROGRESS)
  const hasActiveTicket = tickets.some(
    (t) => (t.Status || "").toString().toUpperCase() === "PENDING" || (t.Status || "").toString().toUpperCase() === "IN_PROGRESS"
  );

  const handleCreateTicket = () => {
    if (hasActiveTicket) {
      toast.error("Your ticket is still active.");
      return;
    }
    setCreateModalOpen(true);
  };

  // split tickets: ongoing = PENDING | IN_PROGRESS, history = RESOLVED
  const ongoingTickets = tickets.filter((r) => {
    const s = (r.Status || "").toString().toUpperCase();
    return s === "PENDING" || s === "IN_PROGRESS";
  });

  const historyTickets = tickets.filter((r) => {
    const s = (r.Status || "").toString().toUpperCase();
    return s === "RESOLVED";
  });

  const buildRow = (row: any) => ({
    ...row,
    Actions: (
      <button
        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        onClick={() => {
          setSelectedTicket(row._original);
          setModalOpen(true);
        }}
      >
        View
      </button>
    ),
  });

  const activeTableData = ongoingTickets.map((r) => buildRow(r));
  const historyTableData = historyTickets.map((r) => buildRow(r));

  // NEW: Pagination state for Active Ticket table
  const [activePage, setActivePage] = useState(1);
  const [activePageSize, setActivePageSize] = useState(3);
  const activeTotalPages = Math.max(1, Math.ceil(activeTableData.length / activePageSize));
  const activeFirst = () => setActivePage(1);
  const activePrev = () => setActivePage((p) => Math.max(1, p - 1));
  const activeNext = () => setActivePage((p) => Math.min(activeTotalPages, p + 1));
  const activeLast = () => setActivePage(activeTotalPages);
  const activePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActivePageSize(Number(e.target.value));
    setActivePage(1);
  };

  // NEW: Pagination state for Ticket History table
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(3);
  const historyTotalPages = Math.max(1, Math.ceil(historyTableData.length / historyPageSize));
  const historyFirst = () => setHistoryPage(1);
  const historyPrev = () => setHistoryPage((p) => Math.max(1, p - 1));
  const historyNext = () => setHistoryPage((p) => Math.min(historyTotalPages, p + 1));
  const historyLast = () => setHistoryPage(historyTotalPages);
  const historyPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHistoryPageSize(Number(e.target.value));
    setHistoryPage(1);
  };

  const displayMap: Record<string, string> = {
      IN_PROGRESS: "IN PROGRESS",
      IS_DONE: "IS DONE",
      // add more mappings here...
    };

  return (
    <>
      <Toaster position="top-center" />
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div />
            <Button
              onClick={handleCreateTicket}
              className="mr-3 mt-4"
            >
              Create Ticket
            </Button>
          </div>

          {/* Active Ticket (above) */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3 mb-6">
            {loading ? (
              <div>Loading...</div>
            ) : ongoingTickets.length === 0 ? (
              <div className="text-gray text-lg">No active ticket</div>
            ) : (
              <div className="w-full p-4 shadow rounded-xl mt-5">
                <p className="text-lg font-semibold mb-2 text-green-700">Active Ticket</p>
                <div className="flex flex-col gap-4">
                  <p>
                    <span className="font-semibold">Organization:</span>{" "}
                    {ongoingTickets[0].Organization_Name}
                  </p>
                  <p>
                    <span className="font-semibold">Ticket:</span>{" "}
                    {ongoingTickets[0].Ticket}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{" "}
                    {toSentenceCase(displayMap[ongoingTickets[0].Status] ?? ongoingTickets[0].Status) }
                  </p>
                  <div className="mt-2">
                    <Button  
                      className="w-full"         
                      onClick={() => {
                        setSelectedTicket(ongoingTickets[0]._original);
                        setModalOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </div>         
                </div>
              </div>
            )}
          </div>

          {/* Ticket History (resolved) */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table
                title="Ticket History"
                columns={["Organization_Name", "Ticket", "Status", "Actions"]}
                data={Array.isArray(historyTableData) ? historyTableData : []}
                // required pagination props
                page={historyPage}
                totalPages={historyTotalPages}
                onFirst={historyFirst}
                onPrev={historyPrev}
                onNext={historyNext}
                onLast={historyLast}
                pageSize={historyPageSize}
                onPageSizeChange={historyPageSizeChange}
              />
            )}
          </div>
        </div>
      </div>

      <TicketChatModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ticket={selectedTicket}
        currentUserRole="ADMIN"
      />
      <CreateTicketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={fetchTickets}
        tickets={tickets}
      />
    </>
  );
}