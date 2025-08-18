"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Table from "@/components/TableComponent";
import TicketChatModal from "@/components/TicketChatModal";

export default function SuperAdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [statusDropdown, setStatusDropdown] = useState<{ [key: number]: boolean }>({});
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const TICKET_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED"];

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch("/api/tickets");
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const data = await res.json();
        console.log("Fetched tickets data:", data); // Debug: log API response

        let ticketsArr: any[] = [];
        // Extract tickets from the specific API response structure
        if (data && data.data && data.data.tickets) {
          ticketsArr = data.data.tickets;
        } else if (Array.isArray(data)) {
          ticketsArr = data;
        } else if (Array.isArray(data.tickets)) {
          ticketsArr = data.tickets;
        }

        console.log("Extracted tickets array:", ticketsArr);

        // Map to expected fields for the Table, include original ticket object for modal
        const mappedTickets = ticketsArr.map((t) => ({
          Organization_Name: t.organization?.name || "Unknown Org",
          Ticket: t.subject || t.message || "No subject",
          Status: t.status || "Unknown",
          _original: t, // keep original ticket for modal
        }));

        setTickets(mappedTickets);
        if (mappedTickets.length === 0) {
          toast.error("No tickets found");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Error fetching tickets");
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const handleStatusClick = (ticketId: number) => {
    setStatusDropdown((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  const handleStatusChange = async (ticket: any, newStatus: string) => {
    // Prevent changing if ticket already resolved
    if ((ticket.status || ticket.Status || "").toString().toUpperCase() === "RESOLVED") {
      toast.error("This ticket is resolved and cannot be changed.");
      setStatusDropdown((prev) => ({ ...prev, [ticket.id]: false }));
      return;
    }

    setUpdatingStatusId(ticket.id);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      // Update local state
      setTickets((prev) =>
        prev.map((row) =>
          row._original.id === ticket.id
            ? { ...row, Status: newStatus, _original: { ...row._original, status: newStatus } }
            : row
        )
      );
      toast.success("Status updated!");
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatusId(null);
      setStatusDropdown((prev) => ({ ...prev, [ticket.id]: false }));
    }
  };

  // split tickets into ongoing and resolved
  const ongoingTickets = tickets.filter(
    (r) => {
      const s = (r.Status || "").toString().toUpperCase();
      return s === "PENDING" || s === "IN_PROGRESS";
    }
  );

  const resolvedTickets = tickets.filter(
    (r) => {
      const s = (r.Status || "").toString().toUpperCase();
      return s === "RESOLVED";
    }
  );

  const buildRow = (row: any, isResolved: boolean) => {
    return {
      ...row,
      Status: (
        <div className="relative inline-block">
          {isResolved ? (
            <button
              className="px-3 py-1 bg-gray-200 text-gray-600 rounded min-w-[100px] text-left cursor-not-allowed"
              disabled
            >
              {row.Status}
            </button>
          ) : (
            <>
              <button
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-w-[100px] text-left"
                onClick={() => handleStatusClick(row._original.id)}
                disabled={updatingStatusId === row._original.id}
              >
                {row.Status}
              </button>
              {statusDropdown[row._original.id] && (
                <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded shadow w-full">
                  {TICKET_STATUSES.map((status) => (
                    <button
                      key={status}
                      className={`block w-full text-left px-4 py-2 hover:bg-blue-50 ${
                        status === row.Status ? "font-bold text-blue-700" : ""
                      }`}
                      onClick={() => handleStatusChange(row._original, status)}
                      disabled={updatingStatusId === row._original.id || status === row.Status}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ),
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
    };
  };

  const ongoingTableData = ongoingTickets.map((r) => buildRow(r, false));
  const resolvedTableData = resolvedTickets.map((r) => buildRow(r, true));

  // NEW: Pagination for Ongoing table
  const [ongoingPage, setOngoingPage] = useState(1);
  const [ongoingPageSize, setOngoingPageSize] = useState(3);
  const ongoingTotalPages = Math.max(1, Math.ceil(ongoingTableData.length / ongoingPageSize));
  const ongoingFirst = () => setOngoingPage(1);
  const ongoingPrev = () => setOngoingPage((p) => Math.max(1, p - 1));
  const ongoingNext = () => setOngoingPage((p) => Math.min(ongoingTotalPages, p + 1));
  const ongoingLast = () => setOngoingPage(ongoingTotalPages);
  const ongoingPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOngoingPageSize(Number(e.target.value));
    setOngoingPage(1);
  };

  // NEW: Pagination for Resolved table
  const [resolvedPage, setResolvedPage] = useState(1);
  const [resolvedPageSize, setResolvedPageSize] = useState(3);
  const resolvedTotalPages = Math.max(1, Math.ceil(resolvedTableData.length / resolvedPageSize));
  const resolvedFirst = () => setResolvedPage(1);
  const resolvedPrev = () => setResolvedPage((p) => Math.max(1, p - 1));
  const resolvedNext = () => setResolvedPage((p) => Math.min(resolvedTotalPages, p + 1));
  const resolvedLast = () => setResolvedPage(resolvedTotalPages);
  const resolvedPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setResolvedPageSize(Number(e.target.value));
    setResolvedPage(1);
  };

  return (
    <>
      <Toaster position="top-center" />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Ongoing Tickets - placed above */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3 mb-6">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table
                title="Ongoing Tickets"
                columns={["Organization_Name", "Ticket", "Status", "Actions"]}
                data={Array.isArray(ongoingTableData) ? ongoingTableData : []}
                // required pagination props
                page={ongoingPage}
                totalPages={ongoingTotalPages}
                onFirst={ongoingFirst}
                onPrev={ongoingPrev}
                onNext={ongoingNext}
                onLast={ongoingLast}
                pageSize={ongoingPageSize}
                onPageSizeChange={ongoingPageSizeChange}
              />
            )}
          </div>

          {/* Resolved Tickets - below */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table
                title="Resolved Tickets"
                columns={["Organization_Name", "Ticket", "Status", "Actions"]}
                data={Array.isArray(resolvedTableData) ? resolvedTableData : []}
                // required pagination props
                page={resolvedPage}
                totalPages={resolvedTotalPages}
                onFirst={resolvedFirst}
                onPrev={resolvedPrev}
                onNext={resolvedNext}
                onLast={resolvedLast}
                pageSize={resolvedPageSize}
                onPageSizeChange={resolvedPageSizeChange}
              />
            )}
          </div>
        </div>
      </div>
      <TicketChatModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ticket={selectedTicket}
        currentUserRole="SUPER_ADMIN"
      />
    </>
  );
}
