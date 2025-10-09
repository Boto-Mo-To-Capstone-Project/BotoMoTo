"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Table from "@/components/TableComponent";
import TicketChatModal from "@/components/TicketChatModal";
import CreateTicketModal from "@/components/CreateTicketModal";
import Button from "@/components/Button";
import { toSentenceCase } from "@/hooks/useSentenceCase";
import { SubmitButton } from "@/components/SubmitButton";
import { MdAdd } from "react-icons/md";

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
        className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors duration-200 font-medium"
        onClick={() => {
          setSelectedTicket(row._original);
          setModalOpen(true);
        }}
      >
        View Details
      </button>
    ),
  });

  const activeTableData = ongoingTickets.map((r) => buildRow(r));
  const historyTableData = historyTickets.map((r) => buildRow(r));

  // Pagination state for Ticket History table
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(5);
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
    PENDING: "PENDING",
    RESOLVED: "RESOLVED"
  };

  const getStatusBadge = (status: string) => {
    const upperStatus = status.toUpperCase();
    if (upperStatus === "PENDING") {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    } else if (upperStatus === "IN_PROGRESS") {
      return "bg-blue-100 text-blue-800 border-blue-200";
    } else if (upperStatus === "RESOLVED") {
      return "bg-green-100 text-green-800 border-green-200";
    }
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <>
    <div className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
        {/* Toolbar */}
        <div className="main-toolbar sticky top-16 z-30 bg-white flex flex-col md:flex-row md:items-center md:gap-4 gap-2 mb-6 py-3 px-2 sm:px-5">
          <div className="flex-1 flex justify-end gap-2">
            <SubmitButton
              label="Create New Ticket"
              variant="action-primary"
              icon={<MdAdd size={20} className="fill-current" />}
              title="Create Ticket"
              className="min-w-[150px]"
              onClick={handleCreateTicket}
            />
          </div>
        </div>


          {/* Active Ticket Section */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3 mb-8">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
              </div>
            ) : ongoingTickets.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
                <div className="flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Tickets</h3>
                  <p className="text-gray-500">You don't have any active support tickets at the moment</p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-green-200 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-white">Active Ticket</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 font-medium">Organization</p>
                        <p className="text-gray-800 font-semibold text-medium">{ongoingTickets[0].Organization_Name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 font-medium">Ticket Subject</p>
                        <p className="text-gray-800 font-semibold">{ongoingTickets[0].Ticket}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 font-medium mb-2">Status</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadge(ongoingTickets[0].Status)}`}>
                          {toSentenceCase(displayMap[ongoingTickets[0].Status] ?? ongoingTickets[0].Status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <Button  
                        className="w-full bg-red-800 hover:bg-red-900 text-white py-3 rounded-lg font-semibold transition-all duration-200 shadow-md"         
                        onClick={() => {
                          setSelectedTicket(ongoingTickets[0]._original);
                          setModalOpen(true);
                        }}
                      >
                        View Full Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ticket History Section */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-800">Ticket History</h2>
                </div>
              </div>
              <div className="p-4">
                <Table
                  loading={loading}
                  title=""
                  columns={["Organization_Name", "Ticket", "Status", "Actions"]}
                  data={Array.isArray(historyTableData) ? historyTableData : []}
                  page={historyPage}
                  totalPages={historyTotalPages}
                  onFirst={historyFirst}
                  onPrev={historyPrev}
                  onNext={historyNext}
                  onLast={historyLast}
                  pageSize={historyPageSize}
                  onPageSizeChange={historyPageSizeChange}
                />
              </div>
            </div>
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