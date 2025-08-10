"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Map to expected fields for the Table
        const mappedTickets = ticketsArr.map((t) => ({
          Organization_Name: t.orgId || t.orgName || "Unknown Org",
          Ticket: t.subject || t.message || "No subject",
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

  return (
    <>
      <Toaster position="top-center" />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc-100vh-4rem] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <Table
                title="All Tickets"
                columns={["Organization_Name", "Ticket"]}
                data={Array.isArray(tickets) ? tickets : []}
                pageSize={3}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
