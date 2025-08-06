"use client";

import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminAuditsPage() {
  const sampleData = [
    {
      Audit_ID: "A001",
      Actor_Role: "admin",
      Action: "created election Provident ",
      IP_Address: "192.168.0.12",
      User_Agent: "Chrome Win10",
      Time_Stamp: "2025-05-28 10:05:23 ",
    },
    {
      Audit_ID: "A002",
      Actor_Role: "voter",
      Action: "voted in Provodent 2025",
      IP_Address: "192.168.0.50  ",
      User_Agent: "Safari iOS",
      Time_Stamp: "2025-05-28 10:05:23 ",
    },
    {
      Audit_ID: "A003",
      Actor_Role: "chefadmin",
      Action: "announced June 2025 Updates",
      IP_Address: "192.168.1.100 ",
      User_Agent: "Firefox Mac",
      Time_Stamp: "2025-05-28 10:05:23 ",
    },
    {
      Audit_ID: "A004",
      Actor_Role: "admin",
      Action: "PUP Provident Fund Polytechnic...",
      IP_Address: "10.0.0.3",
      User_Agent: "Edge Win11",
      Time_Stamp: "2025-05-28 10:05:23 ",
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
              columns={[
                "Audit_ID",
                "Actor_Role",
                "Action",
                "IP_Address",
                "User_Agent",
                "Time_Stamp",
              ]}
              data={sampleData}
              pageSize={3}
            />
          </div>
        </div>
      </div>
    </>
  );
}
