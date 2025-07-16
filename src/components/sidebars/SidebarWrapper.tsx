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
    // "/admin/onboard/processing", // removed for now, requested by mc
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
    // the ElectionSelected links wont appear for routes in the reserved
    // example: /admin/dashboard/elections/create => ElectionSelected wont appear here
    !reserved.includes(parts[4].toLowerCase());

  // super admin logic sidebar
  const isSuperAdmin =
    superAdminBaseRoutes.includes(pathname) ||
    pathname.startsWith("/superadmin/dashboard/");

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
  if (isSuperAdmin) {
    return <SuperAdminSidebar />;
  }
  return null;
};

export default SidebarWrapper;
