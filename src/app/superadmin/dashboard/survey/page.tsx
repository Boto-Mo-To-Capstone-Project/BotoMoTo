"use client";

import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminSurveyPage() {
  const sampleData = [
    {
      Survey_ID: "1",
      Survey_Title: "Boto Mo To System Survey",
      Description: "for march 2025",
      Form_Schema: "View",
      Created_At: "Chrome Win10",
      Deleted_At: "2025-05-28 10:05:23 ",
      Is_Deleted: "true",
    },
    {
      Survey_ID: "2",
      Survey_Title: "Boto Mo To System Survey",
      Description: "for april 2025",
      Form_Schema: "View",
      Created_At: "2025-03-01 08:15:30",
      Deleted_At: "2025-05-28 10:05:23 ",
      Is_Deleted: "true",
    },
    {
      Survey_ID: "3",
      Survey_Title: "Boto Mo To System Survey",
      Description: "for may 2025",
      Form_Schema: "View",
      Created_At: "2025-03-01 08:15:30",
      Deleted_At: "2025-05-28 10:05:23 ",
      Is_Deleted: "true",
    },
    {
      Survey_ID: "4",
      Survey_Title: "Boto Mo To System Survey",
      Description: "for june 2025",
      Form_Schema: "View",
      Created_At: "2025-03-01 08:15:30",
      Deleted_At: "2025-05-28 10:05:23 ",
      Is_Deleted: "true",
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
                "Survey_ID",
                "Survey_Title",
                "Description",
                "Form_Schema",
                "Created_At",
                "Deleted_At",
                "Is_Deleted",
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
