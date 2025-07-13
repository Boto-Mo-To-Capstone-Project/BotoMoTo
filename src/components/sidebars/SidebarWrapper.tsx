"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import SuperAdminSidebar from "./SuperAdminSidebar";

const SidebarWrapper = () => {
  const pathname = usePathname();

  // to prevent showing isSelected option for these routes
  const reserved = ["create", "tickets", "profile"];

  // to prevent showing isSelected for "reserved" routes
  const parts = pathname.split("/");

  // Admin Sidebar routes
  const adminBaseRoutes = [
    "/admin/onboard/processing",
    "/admin/dashboard",
    "/admin/dashboard/elections",
    "/admin/dashboard/elections/create",
    "/admin/dashboard/elections/tickets",
    "/admin/dashboard/elections/profile",
  ];

  const isAdminDefault = adminBaseRoutes.includes(pathname);
  const isAdminElectionSelected =
    pathname.startsWith("/admin/dashboard/elections/") &&
    parts.length >= 5 &&
    // the ElectionSelected links wont appear for routes in the reserved
    // example: /admin/dashboard/elections/create => ElectionSelected wont appear here
    !reserved.includes(parts[4].toLowerCase());

  if (isAdminDefault || isAdminElectionSelected) {
    return (
      <AdminSidebar
        variant={isAdminElectionSelected ? "selectedElection" : "default"}
        electionId={
          // This line decides what value to give to the electionId prop of your <AdminSidebar /> component.
          // If isAdminElectionSelected is true, we want the election ID from the URL.
          // If not, we don’t pass any election ID (so it’s undefined).

          isAdminElectionSelected ? pathname.split("/")[4] : undefined
        }
      />
    );
  }

  // Add logic for superadmin sidebar here
  // Example: if (pathname.startsWith("/superadmin")) return <SuperAdminSidebar />

  return null;
};

export default SidebarWrapper;
