"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import SuperAdminSidebar from "./SuperAdminSidebar"; // use real component
import AppHeader from "../AppHeader";

export default function SidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const parts = pathname.split("/");

  // === OLD LOGIC MERGED ===

  const reserved = ["create", "tickets", "profile"];

  const adminBaseRoutes = [
    "/admin/dashboard",
    "/admin/dashboard/elections",
    "/admin/dashboard/elections/create",
    "/admin/dashboard/elections/tickets",
    "/admin/dashboard/elections/profile",
  ];

  const superAdminBaseRoutes = [
    "/superadmin/dashboard",
    "/superadmin/dashboard/organization-requests",
    "/superadmin/dashboard/elections",
    "/superadmin/dashboard/tickets",
    "/superadmin/dashboard/audits",
    "/superadmin/dashboard/survey",
  ];

  const isAdminDefault = adminBaseRoutes.includes(pathname);

  const isAdminElectionSelected =
    pathname.startsWith("/admin/dashboard/elections/") &&
    parts.length >= 5 &&
    !reserved.includes(parts[4]?.toLowerCase());

  const isSuperAdmin =
    superAdminBaseRoutes.includes(pathname) ||
    pathname.startsWith("/superadmin/dashboard/");

  // === PAGE TITLE LOGIC ===
  const pageTitle = (() => {
    if (pathname === "/admin/dashboard") return "Admin Dashboard";
    if (pathname === "/admin/dashboard/elections") return "Admin Elections";
    if (pathname === "/admin/dashboard/elections/create") return "Election Form";
    if (pathname === "/admin/dashboard/elections/tickets")
      return "Admin Tickets";
    if (pathname === "/admin/dashboard/elections/profile")
      return "Admin Profile";

    if (pathname === "/superadmin/dashboard") return "Super Admin Dashboard";
    if (pathname === "/superadmin/dashboard/organization-requests")
      return "Super Admin Organization Requests";
    if (pathname === "/superadmin/dashboard/elections")
      return "Super Admin Elections";
    if (pathname === "/superadmin/dashboard/tickets")
      return "Super Admin Tickets";
    if (pathname === "/superadmin/dashboard/audits")
      return "Super Admin Audits";
    if (pathname === "/superadmin/dashboard/survey")
      return "Super Admin Survey";

    // Add more as needed
    return "Default, Check sidebar wrapper";
  })();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      {(isAdminDefault || isAdminElectionSelected) && (
        <AdminSidebar
          variant={isAdminElectionSelected ? "selectedElection" : "default"}
          electionId={isAdminElectionSelected ? parts[4] : undefined}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {isSuperAdmin && (
        <SuperAdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col w-screen overflow-x-auto">
        <AppHeader title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="lg:ml-68 ">{children}</main>
      </div>
    </div>
  );
}
