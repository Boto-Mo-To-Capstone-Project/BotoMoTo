"use client";

import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminElectionsPage() {
  const sampleData = [
    {
      Election_Name: "PUP Provident Election 2025",
      Status: "Ongoing",
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Voting_Date: "Jan 13, 2025 - Jan 13, 2025",
      Time: "10:00 AM - 2:00 PM",
    },
    {
      Election_Name: "IBITS Election 2025",
      Status: "Ongoing",
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Voting_Date: "Jan 13, 2025 - Jan 13, 2025",
      Time: "10:00 AM - 2:00 PM",
    },
    {
      Election_Name: "CCIS Election 2025",
      Status: "Ongoing",
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Voting_Date: "Jan 13, 2025 - Jan 13, 2025",
      Time: "10:00 AM - 2:00 PM",
    },
    {
      Election_Name: 4,
      Status: "Ongoing",
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Voting_Date: "User",
      Time: "King",
    },
    {
      Election_Name: 5,
      Status: "Ongoing",
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Voting_Date: "Admin",
      Time: "King",
    },
    {
      Election_Name: 6,
      Status: "Ongoing",
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Voting_Date: "User",
      Time: "King",
    },
    {
      Election_Name: 7,
      Status: "Ongoing",
      Organization_Name: "PUP Provident Fund Polytechnic...",
      Voting_Date: "Editor",
      Time: "King",
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
                "Election_Name",
                "Status",
                "Organization_Name",
                "Voting_Date",
                "Time",
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
