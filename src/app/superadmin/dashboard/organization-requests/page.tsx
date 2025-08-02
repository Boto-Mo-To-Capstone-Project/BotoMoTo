"use client";

import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminOrgRequestPage() {
  const sampleData = [
    {
      Organization_Name: "PUP Provident",
      Organization_Letter: "Click Here",
      Organization_Email: "Provident@pup.edu.ph",
      First_Name: "Susan",
      Last_Name: "Storm",
    },
    {
      Organization_Name: "Institute of Bachelor of Science",
      Organization_Letter: "Click Here",
      Organization_Email: "Provident@pup.edu.ph",
      First_Name: "Jonathan",
      Last_Name: "Storm",
    },
    {
      Organization_Name: "College of Computer Information",
      Organization_Letter: "Click Here",
      Organization_Email: "Provident@pup.edu.ph",
      First_Name: "Jackson",
      Last_Name: "Storm",
    },
    {
      Organization_Name: 4,
      Organization_Letter: "Click Here",
      Organization_Email: "Provident@pup.edu.ph",
      First_Name: "User",
      Last_Name: "King",
    },
    {
      Organization_Name: 5,
      Organization_Letter: "Click Here",
      Organization_Email: "Provident@pup.edu.ph",
      First_Name: "Admin",
      Last_Name: "King",
    },
    {
      Organization_Name: 6,
      Organization_Letter: "Click Here",
      Organization_Email: "Provident@pup.edu.ph",
      First_Name: "User",
      Last_Name: "King",
    },
    {
      Organization_Name: 7,
      Organization_Letter: "Click Here",
      Organization_Email: "Provident@pup.edu.ph",
      First_Name: "Editor",
      Last_Name: "King",
    },
  ];

  const handleApprove = (row: Record<string, any>) => {
    toast.success(`Approved ${row.Organization_Letter}`);
  };

  const handleReject = (row: Record<string, any>) => {
    toast.error(`Rejected ${row.Organization_Letter}`);
  };
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
              title="Organization Requests"
              columns={[
                "Organization_Name",
                "Organization_Letter",
                "Organization_Email",
                "First_Name",
                "Last_Name",
              ]}
              data={sampleData}
              showActions={true}
              onApprove={handleApprove}
              onReject={handleReject}
              pageSize={3}
            />
            <Table
              title="All Organizations"
              columns={[
                "Organization_Name",
                "Organization_Letter",
                "Organization_Email",
                "First_Name",
                "Last_Name",
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
