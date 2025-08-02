"use client";

import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminTicketsPage() {
  const sampleData = [
    {
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Ticket: "Reply",
    },
    {
      Organization_Name: "Institute of Bachelor of Science In...",
      Ticket: "Reply",
    },
    {
      Organization_Name: "College of Computer Information Sci...",
      Ticket: "Reply",
    },
    {
      Organization_Name: 4,
      Ticket: "Reply",
    },
    {
      Organization_Name: 5,
      Ticket: "Reply",
    },
    {
      Organization_Name: 6,
      Ticket: "Reply",
    },
    {
      Organization_Name: 7,
      Ticket: "Reply",
    },
  ];

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
            <Table
              title="All Elections"
              columns={["Organization_Name", "Ticket"]}
              data={sampleData}
              pageSize={3}
            />
          </div>
        </div>
      </div>
    </>
  );
}
