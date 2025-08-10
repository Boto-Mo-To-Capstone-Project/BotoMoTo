"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import Table from "@/components/TableComponent";

export default function SuperAdminSurveyPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/superadmin/surveys", { method: "GET" });
        if (!res.ok) throw new Error(`Failed to fetch surveys (${res.status})`);
        const json = await res.json();
        const surveys = json?.data?.surveys ?? [];
        const mapped = (surveys as any[]).map((s) => ({
          Survey_ID: s.id,
          Survey_Title: s.title,
          Description: s.description ?? "",
          Form_Schema: "View",
          Created_At: s.createdAt ? new Date(s.createdAt).toLocaleString() : "",
          Deleted_At: s.deletedAt ? new Date(s.deletedAt).toLocaleString() : "",
          Is_Deleted: s.isDeleted ? "true" : "false",
          Is_Active: s.isActive ? "true" : "false",
        }));
        setRows(mapped);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Unable to load surveys");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <Toaster position="top-center" />
      <div
        id="main-window-template-component"
        className="app h-full flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50"
      >
        <div className="flex-1 bg-white w-full min-w-0 pt-0 md:pt-0 p-4 md:p-8">
          {/* Table */}
          <div className="main-content flex-auto overflow-auto pb-3 px-2 sm:px-3">
            {loading ? (
              <div className="w-full p-4 bg-white shadow rounded-xl text-center text-gray-500">
                Loading surveys...
              </div>
            ) : (
              <Table
                title="All Surveys"
                columns={[
                  "Survey_ID",
                  "Survey_Title",
                  "Description",
                  "Form_Schema",
                  "Created_At",
                  "Deleted_At",
                  "Is_Deleted",
                  "Is_Active",
                ]}
                data={rows}
                pageSize={5}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
