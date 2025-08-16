"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Table from "@/components/TableComponent";
import TicketChatModal from "@/components/TicketChatModal";
import CreateTicketModal from "@/components/CreateTicketModal";

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

  return (
    <>
      <Toaster position="top-center" />
      <div className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50">
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <div />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
              onClick={handleCreateTicket}
            >
              Create Ticket
            </button>
          </div>

          {/* Active Ticket (above) */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3 mb-6">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table
                title="Active Ticket"
                columns={["Organization_Name", "Ticket", "Status", "Actions"]}
                data={Array.isArray(activeTableData) ? activeTableData : []}
                pageSize={3}
              />
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
                pageSize={3}
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